import { Project } from '../models/Project.js';
import { ProjectTemplate } from '../models/ProjectTemplate.js';
import { Task } from '../models/Task.js';
import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { ROLES, STAFF_ROLES } from '../utils/constants.js';
import { logActivity, notify } from './events.js';

const PROJECT_POPULATE = [
  {
    path: 'client',
    select: 'firstName lastName email phone cityOfResidence countryOfResidence',
  },
  { path: 'advisor', select: 'firstName lastName email role' },
];

const TASK_POPULATE = {
  path: 'assignedTo',
  select: 'firstName lastName email role',
};

const SORTS = {
  recent: { createdAt: -1 },
  ancien: { createdAt: 1 },
  echeance: { dueDate: 1 },
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const assertUser = async (id, { roles, label }) => {
  const user = await User.findById(id).select(
    '_id role isActive firstName lastName email'
  );

  if (!user || !user.isActive) {
    throw ApiError.badRequest(`${label} introuvable ou inactif`);
  }

  if (roles && !roles.includes(user.role)) {
    throw ApiError.badRequest(`${label} invalide`);
  }

  return user;
};

const computeProgress = async (projectId) => {
  const [total, done] = await Promise.all([
    Task.countDocuments({ project: projectId }),
    Task.countDocuments({ project: projectId, status: 'termine' }),
  ]);

  return total === 0 ? 0 : Math.round((done / total) * 100);
};

const refreshProjectProgress = async (project) => {
  if (project.progress?.mode !== 'auto') return;

  project.progress.value = await computeProgress(project._id);
  await project.save();
};

const notifyClient = async (project, type, message) => {
  const userId = project.client?._id ?? project.client;
  if (!userId) return;

  await notify({
    user: userId,
    type,
    message,
    link: `/projects/${project._id}`,
  });
};

export const listProjects = async (user, query = {}) => {
  const {
    page = 1,
    limit = 20,
    status,
    category,
    priority,
    client,
    advisor,
    search,
    sort,
  } = query;

  const filter = {};

  if (user.role === ROLES.CLIENT) {
    filter.client = user._id;
  } else if (user.role === ROLES.ADVISOR) {
    filter.advisor = user._id;
    if (client) filter.client = client;
  } else if (user.role === ROLES.ADMIN || user.role === ROLES.FINANCE) {
    if (client) filter.client = client;
    if (advisor) filter.advisor = advisor;
  } else {
    throw ApiError.forbidden('Rôle insuffisant pour cette action');
  }

  if (status) filter.status = status;
  if (category) filter.category = category;
  if (priority) filter.priority = priority;

  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ title: regex }, { description: regex }, { location: regex }];
  }

  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    Project.find(filter)
      .sort(SORTS[sort] ?? SORTS.recent)
      .skip(skip)
      .limit(limit)
      .populate(PROJECT_POPULATE),
    Project.countDocuments(filter),
  ]);

  return {
    items: items.map((project) => project.toJSON()),
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

export const getProject = async (project) => {
  await project.populate(PROJECT_POPULATE);
  return project.toJSON();
};

export const createProject = async (payload, actor) => {
  const client = await assertUser(payload.client, {
    roles: [ROLES.CLIENT],
    label: 'Client',
  });

  let advisor = null;
  if (payload.advisor) {
    advisor = await assertUser(payload.advisor, {
      roles: [ROLES.ADVISOR],
      label: 'Conseiller',
    });
  } else if (actor.role === ROLES.ADVISOR) {
    advisor = actor;
  }

  let template = null;
  if (payload.templateId) {
    template = await ProjectTemplate.findOne({
      _id: payload.templateId,
      isActive: true,
    });

    if (!template) {
      throw ApiError.notFound('Modèle de projet introuvable');
    }
  }

  const status = payload.status ?? 'brouillon';
  const progressMode =
    payload.progress?.mode ??
    (payload.progress?.value !== undefined ? 'manuel' : 'auto');
  const progressValue =
    progressMode === 'auto' ? 0 : payload.progress?.value ?? 0;

  const project = await Project.create({
    title: payload.title,
    description: payload.description,
    client: client._id,
    advisor: advisor?._id,
    category: payload.category,
    status,
    priority: payload.priority ?? 'normale',
    location: payload.location,
    progress: { value: progressValue, mode: progressMode },
    startDate: payload.startDate ?? undefined,
    dueDate: payload.dueDate ?? undefined,
    closedAt: status === 'termine' ? new Date() : undefined,
    nextAction: payload.nextAction ?? undefined,
    sourceLead: payload.sourceLead,
  });

  if (template?.tasks?.length) {
    await Task.insertMany(
      template.tasks.map((task, index) => ({
        project: project._id,
        title: task.title,
        description: task.description,
        priority: task.priority ?? 'normale',
        isMilestone: task.isMilestone ?? false,
        order: task.order ?? index,
        status: 'a_faire',
        createdBy: actor._id,
      }))
    );
  }

  await logActivity({
    project: project._id,
    actor: actor._id,
    action: 'projet_cree',
    after: { title: project.title, status: project.status },
  });

  await project.populate(PROJECT_POPULATE);
  return project.toJSON();
};

export const updateProject = async (project, payload, actor) => {
  const beforeStatus = project.status;

  if (payload.client !== undefined) {
    if (actor.role !== ROLES.ADMIN) {
      throw ApiError.forbidden(
        'Seul un administrateur peut changer le client du projet'
      );
    }

    const client = await assertUser(payload.client, {
      roles: [ROLES.CLIENT],
      label: 'Client',
    });
    project.client = client._id;
  }

  if (payload.advisor !== undefined) {
    if (payload.advisor === null) {
      project.advisor = null;
    } else {
      const advisor = await assertUser(payload.advisor, {
        roles: [ROLES.ADVISOR],
        label: 'Conseiller',
      });
      project.advisor = advisor._id;
    }
  }

  const fields = [
    'title',
    'description',
    'category',
    'priority',
    'location',
    'startDate',
    'dueDate',
    'nextAction',
    'satisfaction',
  ];

  for (const field of fields) {
    if (payload[field] !== undefined) project[field] = payload[field];
  }

  if (payload.progress !== undefined) {
    if (payload.progress.mode !== undefined) {
      project.progress.mode = payload.progress.mode;
    } else if (payload.progress.value !== undefined) {
      project.progress.mode = 'manuel';
    }
    if (payload.progress.value !== undefined) {
      project.progress.value = payload.progress.value;
    }
    if (project.progress.mode === 'auto') {
      project.progress.value = await computeProgress(project._id);
    }
  }

  if (payload.status !== undefined) {
    project.status = payload.status;
    if (project.status === 'termine' && beforeStatus !== 'termine') {
      project.closedAt = new Date();
    } else if (project.status !== 'termine' && beforeStatus === 'termine') {
      project.closedAt = null;
    }
  }

  await project.save();

  if (payload.status !== undefined && project.status !== beforeStatus) {
    await logActivity({
      project: project._id,
      actor: actor._id,
      action: 'projet_statut_modifie',
      before: { status: beforeStatus },
      after: { status: project.status },
    });
  }

  await project.populate(PROJECT_POPULATE);
  return project.toJSON();
};

export const duplicateProject = async (source, payload, actor) => {
  const client = await assertUser(payload.client ?? source.client, {
    roles: [ROLES.CLIENT],
    label: 'Client',
  });

  const advisorId =
    payload.advisor !== undefined ? payload.advisor : source.advisor;

  let advisor = null;
  if (advisorId) {
    advisor = await assertUser(advisorId, {
      roles: [ROLES.ADVISOR],
      label: 'Conseiller',
    });
  }

  const project = await Project.create({
    title: payload.title ?? `${source.title} (copie)`,
    description: source.description,
    client: client._id,
    advisor: advisor?._id,
    category: source.category,
    status: 'brouillon',
    priority: source.priority,
    location: source.location,
    progress: { value: 0, mode: source.progress?.mode ?? 'auto' },
  });

  const sourceTasks = await Task.find({ project: source._id }).sort({
    order: 1,
    createdAt: 1,
  });

  if (sourceTasks.length > 0) {
    await Task.insertMany(
      sourceTasks.map((task, index) => ({
        project: project._id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: 'a_faire',
        isMilestone: task.isMilestone,
        order: task.order ?? index,
        createdBy: actor._id,
      }))
    );
  }

  await logActivity({
    project: project._id,
    actor: actor._id,
    action: 'projet_duplique',
    after: { source: source._id, title: project.title },
  });

  await project.populate(PROJECT_POPULATE);
  return project.toJSON();
};

export const listTasks = async (project, query = {}) => {
  const { status, priority, assignedTo, isMilestone } = query;
  const filter = { project: project._id };

  if (status) filter.status = status;
  if (priority) filter.priority = priority;
  if (assignedTo) filter.assignedTo = assignedTo;
  if (isMilestone !== undefined) filter.isMilestone = isMilestone;

  const tasks = await Task.find(filter)
    .sort({ order: 1, createdAt: 1 })
    .populate(TASK_POPULATE);

  return tasks.map((task) => task.toJSON());
};

export const createTask = async (project, payload, actor) => {
  let assignedTo = null;
  if (payload.assignedTo) {
    assignedTo = await assertUser(payload.assignedTo, {
      roles: STAFF_ROLES,
      label: 'Membre du staff',
    });
  }

  const status = payload.status ?? 'a_faire';

  const task = await Task.create({
    project: project._id,
    title: payload.title,
    description: payload.description,
    status,
    priority: payload.priority ?? 'normale',
    assignedTo: assignedTo?._id,
    dueDate: payload.dueDate ?? undefined,
    completedAt: status === 'termine' ? new Date() : undefined,
    isMilestone: payload.isMilestone ?? false,
    order: payload.order ?? 0,
    createdBy: actor._id,
  });

  if (task.status === 'en_attente_client') {
    await notifyClient(
      project,
      'tache_client_en_attente',
      `La tâche « ${task.title} » attend une action de votre part.`
    );
  }

  if (task.status === 'termine' && task.isMilestone) {
    await notifyClient(
      project,
      'jalon_termine',
      `Le jalon « ${task.title} » est terminé.`
    );
  }

  await logActivity({
    project: project._id,
    actor: actor._id,
    action: 'tache_creee',
    after: { title: task.title, status: task.status },
  });

  await refreshProjectProgress(project);

  await task.populate(TASK_POPULATE);
  return task.toJSON();
};

export const updateTask = async (project, taskId, payload, actor) => {
  const task = await Task.findOne({ _id: taskId, project: project._id });
  if (!task) {
    throw ApiError.notFound('Tâche introuvable');
  }

  const beforeStatus = task.status;
  const wasMilestone = task.isMilestone;

  if (payload.assignedTo !== undefined) {
    if (payload.assignedTo === null) {
      task.assignedTo = null;
    } else {
      const user = await assertUser(payload.assignedTo, {
        roles: STAFF_ROLES,
        label: 'Membre du staff',
      });
      task.assignedTo = user._id;
    }
  }

  const fields = [
    'title',
    'description',
    'status',
    'priority',
    'dueDate',
    'isMilestone',
    'order',
  ];

  for (const field of fields) {
    if (payload[field] !== undefined) task[field] = payload[field];
  }

  if (payload.status !== undefined) {
    if (task.status === 'termine' && beforeStatus !== 'termine') {
      task.completedAt = new Date();
    } else if (task.status !== 'termine') {
      task.completedAt = null;
    }
  }

  await task.save();

  if (task.status !== beforeStatus) {
    await logActivity({
      project: project._id,
      actor: actor._id,
      action: 'tache_statut_modifie',
      before: { status: beforeStatus },
      after: { status: task.status, title: task.title },
    });
  }

  const milestoneCompleted =
    task.status === 'termine' &&
    task.isMilestone &&
    (beforeStatus !== 'termine' || !wasMilestone);

  if (milestoneCompleted) {
    await notifyClient(
      project,
      'jalon_termine',
      `Le jalon « ${task.title} » est terminé.`
    );
  }

  if (
    task.status === 'en_attente_client' &&
    beforeStatus !== 'en_attente_client'
  ) {
    await notifyClient(
      project,
      'tache_client_en_attente',
      `La tâche « ${task.title} » attend une action de votre part.`
    );
  }

  await refreshProjectProgress(project);

  await task.populate(TASK_POPULATE);
  return task.toJSON();
};

export const deleteTask = async (project, taskId, actor) => {
  const task = await Task.findOneAndDelete({
    _id: taskId,
    project: project._id,
  });

  if (!task) {
    throw ApiError.notFound('Tâche introuvable');
  }

  await logActivity({
    project: project._id,
    actor: actor._id,
    action: 'tache_supprimee',
    before: { title: task.title, status: task.status },
  });

  await refreshProjectProgress(project);

  return { id: task._id.toString() };
};
