import { z } from 'zod';
import { EXPENSE_STATUS } from '../utils/constants.js';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Identifiant invalide');

const amount = z
  .number({ invalid_type_error: 'Le montant doit être un nombre' })
  .int('Le montant doit être un entier (FCFA, sans décimales)')
  .min(0, 'Le montant ne peut pas être négatif')
  .max(1_000_000_000_000, 'Montant trop élevé');

const hasAtLeastOneField = (obj) => Object.keys(obj).length > 0;

export const projectParamsSchema = z.object({ projectId: objectId });

export const expenseParamsSchema = z.object({
  projectId: objectId,
  expenseId: objectId,
});

// ---------- Budget ----------

export const upsertBudgetSchema = z
  .object({
    initialAmount: amount.optional(),
    revisedAmount: amount.optional(),
    currency: z
      .string()
      .trim()
      .length(3, 'Code devise sur 3 lettres (ex. XOF)')
      .transform((value) => value.toUpperCase())
      .optional(),
    reason: z.string().trim().min(3).max(500).optional(),
  })
  .refine(hasAtLeastOneField, { message: 'Aucune modification fournie' })
  .refine((data) => data.revisedAmount === undefined || Boolean(data.reason), {
    message: 'Un motif est requis pour réviser le budget',
    path: ['reason'],
  });

// ---------- Dépenses ----------

const expenseFields = z.object({
  item: z.string().trim().min(2).max(150),
  supplier: z.string().trim().max(150).optional(),
  amount: amount.min(1, 'Le montant doit être supérieur à 0'),
  date: z.coerce.date().optional(),
  status: z.enum(EXPENSE_STATUS).optional(),
  receipt: objectId.optional(),
  comment: z.string().trim().max(1000).optional(),
});

export const createExpenseSchema = expenseFields;

export const updateExpenseSchema = expenseFields
  .partial()
  .refine(hasAtLeastOneField, { message: 'Aucune modification fournie' });

export const listExpensesQuerySchema = z.object({
  status: z.enum(EXPENSE_STATUS).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
