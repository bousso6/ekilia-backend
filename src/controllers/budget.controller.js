import { Budget } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ROLES, STAFF_ROLES } from '../utils/constants.js';
import {
  loadAccessibleProject,
  requireRole,
  requireUser,
  userIdOf,
} from '../utils/guards.js';
import { getBudgetOverview } from '../services/budget.service.js';
import { logActivity } from '../services/activity.service.js';
import { notify } from '../services/notification.service.js';

const BUDGET_EDITORS = [ROLES.ADMIN, ROLES.ADVISOR, ROLES.FINANCE];

const serializeRevisions = (budget) =>
  (budget?.revisions ?? []).map((revision) => ({
    date: revision.date,
    previousAmount: revision.previousAmount,
    newAmount: revision.newAmount,
    author: revision.author ? String(revision.author) : null,
    reason: revision.reason,
  }));

// Le client voit le résumé ; l'historique des révisions est réservé au staff.
const buildResponse = async (projectId, role) => {
  const { budget, summary } = await getBudgetOverview(projectId);
  const data = { summary };
  if (STAFF_ROLES.includes(role)) data.revisions = serializeRevisions(budget);
  return data;
};

// GET /projects/:projectId/budget
export const getBudget = asyncHandler(async (req, res) => {
  const user = requireUser(req);
  const { projectId } = req.params;

  await loadAccessibleProject(user, projectId);

  res.json({ success: true, data: await buildResponse(projectId, user.role) });
});

// PUT /projects/:projectId/budget
export const upsertBudget = asyncHandler(async (req, res) => {
  const user = requireRole(req, BUDGET_EDITORS);
  const { projectId } = req.params;
  const { initialAmount, revisedAmount, currency, reason } = req.body;

  const project = await loadAccessibleProject(user, projectId);

  let budget = await Budget.findOne({ project: projectId });
  let action = null;
  let created = false;
  let before = null;

  if (!budget) {
    if (initialAmount === undefined) {
      throw ApiError.badRequest('Le budget initial est requis pour créer le budget');
    }
    if (revisedAmount !== undefined) {
      throw ApiError.badRequest(
        "Un budget révisé ne peut être défini qu'après la création du budget"
      );
    }

    budget = await Budget.create({
      project: projectId,
      initialAmount,
      currency: currency ?? 'XOF',
    });
    action = 'budget.created';
    created = true;
  } else {
    if (initialAmount !== undefined && initialAmount !== budget.initialAmount) {
      throw ApiError.conflict(
        'Le budget initial ne peut pas être modifié : utilisez un budget révisé avec un motif'
      );
    }
    if (currency !== undefined && currency !== budget.currency) {
      throw ApiError.conflict('La devise du budget ne peut pas être modifiée');
    }
    if (revisedAmount === undefined) {
      throw ApiError.badRequest(
        'Aucune modification à appliquer : indiquez un budget révisé et un motif'
      );
    }

    const currentReference = budget.revisedAmount ?? budget.initialAmount;

    // Même montant que la référence actuelle : rien à enregistrer
    if (revisedAmount !== currentReference) {
      before = { referenceAmount: currentReference };
      budget.revisions.push({
        previousAmount: currentReference,
        newAmount: revisedAmount,
        author: userIdOf(user),
        reason,
      });
      budget.revisedAmount = revisedAmount;
      await budget.save();
      action = 'budget.revised';
    }
  }

  if (action) {
    await logActivity({
      project: projectId,
      actor: userIdOf(user),
      action,
      before,
      after: {
        referenceAmount: budget.revisedAmount ?? budget.initialAmount,
        currency: budget.currency,
        reason: reason ?? null,
      },
    });

    await notify({
      user: project.client,
      type: 'budget_modifie',
      message:
        action === 'budget.created'
          ? 'Le budget de votre projet a été défini.'
          : 'Le budget de votre projet a été révisé.',
      link: `/projects/${projectId}`,
    });
  }

  res
    .status(created ? 201 : 200)
    .json({ success: true, data: await buildResponse(projectId, user.role) });
});
