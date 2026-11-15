import { Budget, Expense } from '../models/index.js';
import { computeBudgetSummary, sumByStatus } from '../utils/budgetSummary.js';

export { computeBudgetSummary };

export async function getBudgetOverview(projectId) {
  const [budget, expenses] = await Promise.all([
    Budget.findOne({ project: projectId }),
    Expense.find({ project: projectId }).select('amount status').lean(),
  ]);

  return {
    budget,
    summary: computeBudgetSummary({ budget, totalsByStatus: sumByStatus(expenses) }),
  };
}

/**
 * Exportée pour la partie A (dashboard).
 * Retourne : hasBudget, currency, initialAmount, revisedAmount, referenceAmount,
 * plannedAmount, committedAmount, paidAmount, balance.
 */
export async function getBudgetSummary(projectId) {
  const { summary } = await getBudgetOverview(projectId);
  return summary;
}
