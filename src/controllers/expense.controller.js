import { Expense } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ROLES, STAFF_ROLES } from '../utils/constants.js';
import {
  loadAccessibleProject,
  requireRole,
  requireUser,
  userIdOf,
} from '../utils/guards.js';
import { logActivity } from '../services/activity.service.js';
import { notify } from '../services/notification.service.js';

const EXPENSE_EDITORS = [ROLES.ADMIN, ROLES.ADVISOR, ROLES.FINANCE];

const snapshot = (expense) => ({
  item: expense.item,
  supplier: expense.supplier ?? null,
  amount: expense.amount,
  date: expense.date,
  status: expense.status,
  receipt: expense.receipt ? String(expense.receipt) : null,
  comment: expense.comment ?? null,
});

const recordChange = async ({ project, projectId, user, action, expenseId, before, after }) => {
  await logActivity({
    project: projectId,
    actor: userIdOf(user),
    action,
    before: before ? { expense: String(expenseId), ...before } : null,
    after: after ? { expense: String(expenseId), ...after } : null,
  });

  await notify({
    user: project.client,
    type: 'budget_modifie',
    message: 'Une dépense a été mise à jour sur le budget de votre projet.',
    link: `/projects/${projectId}`,
  });
};

// GET /projects/:projectId/expenses
export const listExpenses = asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const { projectId } = req.params;
  const { status, page, limit } = req.query;

  await loadAccessibleProject(user, projectId);

  const filter = { project: projectId };
  if (status) filter.status = status;

  const query = Expense.find(filter)
    .sort({ date: -1, createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  // Le client n'a pas besoin de savoir qui a saisi la dépense
  if (!STAFF_ROLES.includes(user.role)) query.select('-createdBy');

  const [items, total] = await Promise.all([query, Expense.countDocuments(filter)]);

  res.json({
    success: true,
    data: items,
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

// POST /projects/:projectId/expenses
export const createExpense = asyncHandler(async (req, res) => {
  const user = requireRole(req, EXPENSE_EDITORS);
  const { projectId } = req.params;

  const project = await loadAccessibleProject(user, projectId);

  // TODO(B3) : si req.body.receipt est fourni, vérifier que ce Document
  // appartient bien à ce projet.
  const expense = await Expense.create({
    ...req.body,
    project: projectId,
    createdBy: userIdOf(user),
  });

  await recordChange({
    project,
    projectId,
    user,
    action: 'expense.created',
    expenseId: expense._id,
    before: null,
    after: snapshot(expense),
  });

  res.status(201).json({ success: true, data: expense });
});

// PATCH /projects/:projectId/expenses/:expenseId
export const updateExpense = asyncHandler(async (req, res) => {
  const user = requireRole(req, EXPENSE_EDITORS);
  const { projectId, expenseId } = req.params;

  const project = await loadAccessibleProject(user, projectId);

  const expense = await Expense.findOne({ _id: expenseId, project: projectId });
  if (!expense) throw ApiError.notFound('Dépense introuvable');

  const before = snapshot(expense);

  // TODO(B3) : même vérification pour un nouveau justificatif (receipt).
  Object.assign(expense, req.body);
  await expense.save();

  await recordChange({
    project,
    projectId,
    user,
    action: 'expense.updated',
    expenseId: expense._id,
    before,
    after: snapshot(expense),
  });

  res.json({ success: true, data: expense });
});

// DELETE /projects/:projectId/expenses/:expenseId
export const deleteExpense = asyncHandler(async (req, res) => {
  const user = requireRole(req, EXPENSE_EDITORS);
  const { projectId, expenseId } = req.params;

  const project = await loadAccessibleProject(user, projectId);

  const expense = await Expense.findOne({ _id: expenseId, project: projectId });
  if (!expense) throw ApiError.notFound('Dépense introuvable');

  const before = snapshot(expense);
  await expense.deleteOne();

  await recordChange({
    project,
    projectId,
    user,
    action: 'expense.deleted',
    expenseId,
    before,
    after: null,
  });

  res.json({ success: true, data: { id: String(expenseId) } });
});
