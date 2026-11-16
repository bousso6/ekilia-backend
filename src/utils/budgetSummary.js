import { EXPENSE_STATUS } from './constants.js';

/**
 * Additionne les montants des dépenses par statut (prevu, engage, paye).
 */
export const sumByStatus = (expenses = []) => {
  const totals = Object.fromEntries(EXPENSE_STATUS.map((status) => [status, 0]));

  for (const expense of expenses) {
    if (!expense || !Object.hasOwn(totals, expense.status)) continue;
    totals[expense.status] += Number(expense.amount) || 0;
  }

  return totals;
};

/**
 * Règles du cahier des charges :
 * - budget de référence = budget révisé s'il existe, sinon budget initial
 * - engagé = dépenses « engage » + « paye »
 * - payé = dépenses « paye »
 * - solde = budget de référence - engagé (peut être négatif)
 */
export const computeBudgetSummary = ({ budget = null, totalsByStatus = {} } = {}) => {
  const initialAmount = budget?.initialAmount ?? 0;
  const revisedAmount = budget?.revisedAmount ?? null;
  const referenceAmount = revisedAmount ?? initialAmount;

  const planned = totalsByStatus.prevu ?? 0;
  const committedAmount = (totalsByStatus.engage ?? 0) + (totalsByStatus.paye ?? 0);
  const paidAmount = totalsByStatus.paye ?? 0;

  return {
    hasBudget: Boolean(budget),
    currency: budget?.currency ?? 'XOF',
    initialAmount,
    revisedAmount,
    referenceAmount,
    plannedAmount: planned,
    committedAmount,
    paidAmount,
    balance: referenceAmount - committedAmount,
  };
};
