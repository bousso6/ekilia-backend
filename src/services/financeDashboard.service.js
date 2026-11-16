import { Budget, Expense, Project } from '../models/index.js';
import { computeBudgetSummary, sumByStatus } from '../utils/budgetSummary.js';

const OPEN_PROJECT_STATUSES = ['actif', 'en_pause', 'bloque'];

export const getFinanceDashboard = async () => {
  const projects = await Project.find({ status: { $in: OPEN_PROJECT_STATUSES } })
    .select('title status')
    .sort({ updatedAt: -1 })
    .lean();
  const projectIds = projects.map((project) => project._id);

  const [budgets, expenses] = await Promise.all([
    Budget.find({ project: { $in: projectIds } })
      .select('project initialAmount revisedAmount currency')
      .lean(),
    Expense.find({ project: { $in: projectIds } })
      .select('project amount status')
      .lean(),
  ]);

  const budgetByProject = new Map(
    budgets.map((budget) => [String(budget.project), budget])
  );
  const expensesByProject = new Map();

  for (const expense of expenses) {
    const projectId = String(expense.project);
    const projectExpenses = expensesByProject.get(projectId) ?? [];
    projectExpenses.push(expense);
    expensesByProject.set(projectId, projectExpenses);
  }

  const totalsByCurrency = new Map();
  const projectSummaries = projects.map((project) => {
    const id = String(project._id);
    const budget = budgetByProject.get(id) ?? null;
    const totalsByStatus = sumByStatus(expensesByProject.get(id));
    const summary = computeBudgetSummary({ budget, totalsByStatus });
    const totals =
      totalsByCurrency.get(summary.currency) ?? {
        currency: summary.currency,
        totalBudget: 0,
        plannedAmount: 0,
        committedAmount: 0,
        paidAmount: 0,
        balance: 0,
      };

    totals.totalBudget += summary.referenceAmount;
    totals.plannedAmount += summary.plannedAmount;
    totals.committedAmount += summary.committedAmount;
    totals.paidAmount += summary.paidAmount;
    totals.balance += summary.balance;
    totalsByCurrency.set(summary.currency, totals);

    return {
      id,
      title: project.title,
      status: project.status,
      budget: summary,
    };
  });

  return {
    summary: {
      activeProjects: projects.length,
      projectsWithBudget: budgets.length,
      totalsByCurrency: [...totalsByCurrency.values()],
    },
    projects: projectSummaries,
    generatedAt: new Date().toISOString(),
  };
};
