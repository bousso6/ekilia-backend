import { Router } from 'express';
import { validate } from '../middlewares/validate.js';
import {
  projectParamsSchema,
  expenseParamsSchema,
  upsertBudgetSchema,
  createExpenseSchema,
  updateExpenseSchema,
  listExpensesQuerySchema,
} from '../validators/budget.validator.js';
import { getBudget, upsertBudget } from '../controllers/budget.controller.js';
import {
  listExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from '../controllers/expense.controller.js';

// Monté sur /projects/:projectId ; mergeParams pour lire req.params.projectId
const router = Router({ mergeParams: true });

// TODO(auth) : quand la partie A aura poussé, ajouter protect et projectAccess
// sur toutes les routes, et authorize('admin', 'advisor', 'finance') sur les
// routes d'écriture (PUT, POST, PATCH, DELETE).

router.get('/budget', validate({ params: projectParamsSchema }), getBudget);
router.put(
  '/budget',
  validate({ params: projectParamsSchema, body: upsertBudgetSchema }),
  upsertBudget
);

router.get(
  '/expenses',
  validate({ params: projectParamsSchema, query: listExpensesQuerySchema }),
  listExpenses
);
router.post(
  '/expenses',
  validate({ params: projectParamsSchema, body: createExpenseSchema }),
  createExpense
);
router.patch(
  '/expenses/:expenseId',
  validate({ params: expenseParamsSchema, body: updateExpenseSchema }),
  updateExpense
);
router.delete(
  '/expenses/:expenseId',
  validate({ params: expenseParamsSchema }),
  deleteExpense
);

export default router;
