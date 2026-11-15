import { Lead } from '../models/Lead.js';
import { Project } from '../models/Project.js';
import { Task } from '../models/Task.js';
import { ApiError } from '../utils/ApiError.js';
import { ROLES } from '../utils/constants.js';

const CLIENT_OPEN_PROJECT_STATUSES = ['actif', 'en_pause', 'bloque'];
const ADMIN_ACTIVE_PROJECT_STATUS = 'actif';
const ADMIN_BLOCKED_PROJECT_STATUS = 'bloque';
const NEW_LEAD_STATUS = 'nouveau';
const DONE_TASK_STATUS = 'termine';
const MILESTONE_RISK_DAYS = 7;
const LIST_LIMIT = 5;

const PROJECT_POPULATE = [
  {
    path: 'client',
    select: 'firstName lastName email',
  },
  {
    path: 'advisor',
    select: 'firstName lastName email role',
  },
];

const TASK_POPULATE = [
  {
    path: 'project',
    select: 'title status',
  },
  {
    path: 'assignedTo',
    select: 'firstName lastName email role',
  },
];

const dateValue = (value) => {
  if (!value) return Number.POSITIVE_INFINITY;

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
};

const sortByDueDate = (items) =>
  [...items].sort((a, b) => dateValue(a.dueDate) - dateValue(b.dueDate));

const uniqueAdvisors = (projects) => {
  const advisors = [];
  const seen = new Set();

  for (const project of projects) {
    const advisor = project.advisor;

    if (advisor?._id && !seen.has(String(advisor._id))) {
      seen.add(String(advisor._id));
      advisors.push(advisor);
    }
  }

  return advisors;
};

const buildNextAction = (projects) => {
  const project = sortByDueDate(
    projects.filter((item) => item.nextAction?.label)
  )[0];

  if (!project) return null;

  return {
    project: {
      id: project._id,
      title: project.title,
    },
    label: project.nextAction.label,
    dueDate: project.nextAction.dueDate ?? null,
    owner: project.nextAction.owner ?? null,
  };
};

const buildNextMilestone = (milestones) => {
  const milestone = sortByDueDate(milestones)[0];

  if (!milestone) return null;

  return {
    id: milestone._id,
    title: milestone.title,
    status: milestone.status,
    dueDate: milestone.dueDate ?? null,
    project: milestone.project
      ? {
          id: milestone.project._id,
          title: milestone.project.title,
          status: milestone.project.status,
        }
      : null,
  };
};

export const getClientDashboard = async (user) => {
  if (!user || user.role !== ROLES.CLIENT) {
    throw ApiError.forbidden('Tableau de bord réservé aux clients');
  }

  const projects = await Project.find({
    client: user._id,
    status: { $in: CLIENT_OPEN_PROJECT_STATUSES },
  })
    .sort({ updatedAt: -1 })
    .populate(PROJECT_POPULATE);

  const projectList = projects.map((project) => project.toJSON());
  const projectIds = projects.map((project) => project._id);

  const milestones = projectIds.length
    ? await Task.find({
        project: { $in: projectIds },
        isMilestone: true,
        status: { $ne: DONE_TASK_STATUS },
      })
        .sort({ dueDate: 1, createdAt: 1 })
        .populate(TASK_POPULATE)
    : [];

  const milestoneList = milestones.map((task) => task.toJSON());
  const advisors = uniqueAdvisors(projectList);
  const averageProgress = projectList.length
    ? Math.round(
        projectList.reduce(
          (total, project) => total + (project.progress?.value ?? 0),
          0
        ) / projectList.length
      )
    : 0;

  return {
    projects: projectList,
    summary: {
      totalProjects: projectList.length,
      activeProjects: projectList.filter(
        (project) => project.status === ADMIN_ACTIVE_PROJECT_STATUS
      ).length,
      blockedProjects: projectList.filter(
        (project) => project.status === ADMIN_BLOCKED_PROJECT_STATUS
      ).length,
      averageProgress,
    },
    nextAction: buildNextAction(projectList),
    nextMilestone: buildNextMilestone(milestoneList),
    advisor: advisors[0] ?? null,
    advisors,
    documentsPending: [],
    budget: null,
  };
};

export const getAdminDashboard = async () => {
  const now = new Date();
  const riskLimit = new Date(
    now.getTime() + MILESTONE_RISK_DAYS * 24 * 60 * 60 * 1000
  );

  const newLeadFilter = { status: NEW_LEAD_STATUS };
  const activeProjectFilter = { status: ADMIN_ACTIVE_PROJECT_STATUS };
  const blockedProjectFilter = { status: ADMIN_BLOCKED_PROJECT_STATUS };
  const overdueTaskFilter = {
    dueDate: { $lt: now },
    status: { $ne: DONE_TASK_STATUS },
  };
  const milestoneRiskFilter = {
    isMilestone: true,
    status: { $ne: DONE_TASK_STATUS },
    dueDate: { $lte: riskLimit },
  };

  const [
    newLeadsCount,
    activeProjectsCount,
    blockedProjectsCount,
    overdueTasksCount,
    milestonesAtRiskCount,
    newLeads,
    activeProjects,
    blockedProjects,
    overdueTasks,
    milestonesAtRisk,
  ] = await Promise.all([
    Lead.countDocuments(newLeadFilter),
    Project.countDocuments(activeProjectFilter),
    Project.countDocuments(blockedProjectFilter),
    Task.countDocuments(overdueTaskFilter),
    Task.countDocuments(milestoneRiskFilter),
    Lead.find(newLeadFilter)
      .sort({ createdAt: -1 })
      .limit(LIST_LIMIT)
      .populate('assignedTo', 'firstName lastName email role'),
    Project.find(activeProjectFilter)
      .sort({ updatedAt: -1 })
      .limit(LIST_LIMIT)
      .populate(PROJECT_POPULATE),
    Project.find(blockedProjectFilter)
      .sort({ updatedAt: -1 })
      .limit(LIST_LIMIT)
      .populate(PROJECT_POPULATE),
    Task.find(overdueTaskFilter)
      .sort({ dueDate: 1 })
      .limit(LIST_LIMIT)
      .populate(TASK_POPULATE),
    Task.find(milestoneRiskFilter)
      .sort({ dueDate: 1 })
      .limit(LIST_LIMIT)
      .populate(TASK_POPULATE),
  ]);

  return {
    summary: {
      newLeads: newLeadsCount,
      activeProjects: activeProjectsCount,
      blockedProjects: blockedProjectsCount,
      overdueTasks: overdueTasksCount,
      milestonesAtRisk: milestonesAtRiskCount,
    },
    newLeads: newLeads.map((lead) => lead.toJSON()),
    activeProjects: activeProjects.map((project) => project.toJSON()),
    blockedProjects: blockedProjects.map((project) => project.toJSON()),
    overdueTasks: overdueTasks.map((task) => task.toJSON()),
    milestonesAtRisk: milestonesAtRisk.map((task) => task.toJSON()),
    generatedAt: now.toISOString(),
  };
};
