import { Partner, PartnerAssignment } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ROLES } from '../utils/constants.js';
import {
  loadAccessibleProject,
  requireRole,
  requireUser,
  userIdOf,
} from '../utils/guards.js';
import {
  serializeAssignment,
  serializeAssignments,
} from '../services/assignment.service.js';
import { logActivity } from '../services/activity.service.js';

const ASSIGNERS = [ROLES.ADMIN, ROLES.ADVISOR];

const snapshot = (a) => ({
  status: a.status,
  role: a.role,
  contactRevealed: a.contactRevealed,
});

// GET /projects/:projectId/partners
export const listAssignments = asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const { projectId } = req.params;

  await loadAccessibleProject(user, projectId);

  const assignments = await PartnerAssignment.find({ project: projectId })
    .sort({ createdAt: 1 })
    .populate('partner');

  res.json({
    success: true,
    data: serializeAssignments(assignments, user.role),
  });
});

// POST /projects/:projectId/partners
export const createAssignment = asyncHandler(async (req, res) => {
  const user = requireRole(req, ASSIGNERS);
  const { projectId } = req.params;
  const { partner: partnerId, role, status } = req.body;

  await loadAccessibleProject(user, projectId);

  const partner = await Partner.findById(partnerId);
  if (!partner) throw ApiError.notFound('Partenaire introuvable');

  const alreadyActive = await PartnerAssignment.exists({
    project: projectId,
    partner: partnerId,
    status: { $ne: 'annule' },
  });
  if (alreadyActive) {
    throw ApiError.conflict('Ce partenaire est déjà affecté à ce projet');
  }

  const created = await PartnerAssignment.create({
    project: projectId,
    partner: partnerId,
    role,
    status: status ?? 'propose',
  });

  await logActivity({
    project: projectId,
    actor: userIdOf(user),
    action: 'partner.assigned',
    before: null,
    after: {
      assignment: String(created._id),
      partner: String(partnerId),
      ...snapshot(created),
    },
  });

  const populated = await PartnerAssignment.findById(created._id).populate('partner');

  res.status(201).json({
    success: true,
    data: serializeAssignment(populated, user.role),
  });
});

// PATCH /projects/:projectId/partners/:assignmentId
export const updateAssignment = asyncHandler(async (req, res) => {
  const user = requireRole(req, ASSIGNERS);
  const { projectId, assignmentId } = req.params;
  const { status, role, contactRevealed } = req.body;

  await loadAccessibleProject(user, projectId);

  const assignment = await PartnerAssignment.findOne({
    _id: assignmentId,
    project: projectId,
  });
  if (!assignment) throw ApiError.notFound('Affectation introuvable');

  if (assignment.status === 'annule') {
    throw ApiError.conflict('Affectation annulée : créez une nouvelle affectation');
  }

  const before = snapshot(assignment);
  const revealing = contactRevealed === true && !assignment.contactRevealed;
  const hiding = contactRevealed === false && assignment.contactRevealed;

  if (status !== undefined) assignment.status = status;
  if (role !== undefined) assignment.role = role;

  if (revealing) {
    assignment.contactRevealed = true;
    assignment.revealedBy = userIdOf(user);
    assignment.revealedAt = new Date();
  }
  if (hiding) {
    assignment.contactRevealed = false;
    assignment.revealedBy = undefined;
    assignment.revealedAt = undefined;
  }

  await assignment.save();
  const after = snapshot(assignment);

  const actions = [];
  if (revealing) actions.push('partner.contacts_revealed');
  if (hiding) actions.push('partner.contacts_hidden');
  if (before.status !== after.status) {
    actions.push(
      after.status === 'annule' ? 'partner.assignment_cancelled' : 'partner.status_changed'
    );
  }
  if (before.role !== after.role) actions.push('partner.role_changed');

  for (const action of actions) {
    await logActivity({
      project: projectId,
      actor: userIdOf(user),
      action,
      before: { assignment: String(assignment._id), ...before },
      after: { assignment: String(assignment._id), ...after },
    });
  }

  const populated = await PartnerAssignment.findById(assignment._id).populate('partner');

  res.json({
    success: true,
    data: serializeAssignment(populated, user.role),
  });
});
