import { Router } from 'express';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { ROLES } from '../utils/constants.js';
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

// Monté sur /projects/:projectId par project.routes.js, derrière auth.
// mergeParams pour lire req.params.projectId
const router = Router({ mergeParams: true });

const WRITE_ROLES = [ROLES.ADMIN, ROLES.ADVISOR, ROLES.FINANCE];

router.get('/budget', validate({ params: projectParamsSchema }), getBudget);
router.put(
  '/budget',
  authorize(WRITE_ROLES),
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
  authorize(WRITE_ROLES),
  validate({ params: projectParamsSchema, body: createExpenseSchema }),
  createExpense
);
router.patch(
  '/expenses/:expenseId',
  authorize(WRITE_ROLES),
  validate({ params: expenseParamsSchema, body: updateExpenseSchema }),
  updateExpense
);
router.delete(
  '/expenses/:expenseId',
  authorize(WRITE_ROLES),
  validate({ params: expenseParamsSchema }),
  deleteExpense
);

export default router;