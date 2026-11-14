import { z } from 'zod';
import {
  LEAD_HORIZONS,
  LEAD_NEEDS,
  LEAD_OBSTACLES,
  LEAD_PROGRESS,
  LEAD_SOURCES,
  LEAD_STATUS,
  PROJECT_CATEGORIES,
} from '../utils/constants.js';

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Adresse email invalide');

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Identifiant invalide');

const budgetSchema = z
  .object({
    amount: z.coerce.number().nonnegative().optional(),
    min: z.coerce.number().nonnegative().optional(),
    max: z.coerce.number().nonnegative().optional(),
    currency: z.string().trim().min(1).max(8).optional(),
  })
  .refine(
    (data) =>
      data.min === undefined || data.max === undefined || data.max >= data.min,
    {
      message: 'Le budget maximum doit être supérieur ou égal au minimum',
      path: ['max'],
    }
  );

const consentSchema = z.object({
  accepted: z.literal(true, {
    errorMap: () => ({ message: 'Le consentement est obligatoire' }),
  }),
});

export const createLeadSchema = z.object({
  firstName: z.string().trim().min(2, 'Le prénom est requis').max(50),
  lastName: z.string().trim().min(2, 'Le nom est requis').max(50),
  email: emailSchema,
  phone: z.string().trim().min(6, 'Le téléphone est requis').max(30),
  country: z.string().trim().min(2, 'Le pays de résidence est requis').max(80),
  city: z.string().trim().max(80).optional(),

  projectCategory: z.enum(PROJECT_CATEGORIES, {
    errorMap: () => ({ message: 'Catégorie de projet invalide' }),
  }),
  projectLocation: z
    .string()
    .trim()
    .min(2, 'La zone au Sénégal est requise')
    .max(120),
  projectTitle: z.string().trim().max(120).optional(),
  message: z.string().trim().max(2000).optional(),

  horizon: z.enum(LEAD_HORIZONS, {
    errorMap: () => ({ message: 'Horizon invalide' }),
  }),
  budget: budgetSchema.optional(),
  progress: z.enum(LEAD_PROGRESS, {
    errorMap: () => ({ message: 'Avancement invalide' }),
  }),
  needs: z
    .array(
      z.enum(LEAD_NEEDS, {
        errorMap: () => ({ message: 'Besoin invalide' }),
      })
    )
    .min(1, 'Au moins un besoin est requis'),
  obstacles: z
    .array(
      z.enum(LEAD_OBSTACLES, {
        errorMap: () => ({ message: 'Frein invalide' }),
      })
    )
    .optional()
    .default([]),

  consent: consentSchema,
  source: z
    .enum(LEAD_SOURCES, {
      errorMap: () => ({ message: 'Source invalide' }),
    })
    .optional()
    .default('diagnostic'),
});

export const listLeadsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(LEAD_STATUS).optional(),
  category: z.enum(PROJECT_CATEGORIES).optional(),
  source: z.enum(LEAD_SOURCES).optional(),
  assignedTo: objectIdSchema.optional(),
  search: z.string().trim().max(80).optional(),
});

export const leadIdParamSchema = z.object({
  id: objectIdSchema,
});

const editableLeadStatuses = LEAD_STATUS.filter((status) => status !== 'converti');

export const updateLeadSchema = z
  .object({
    status: z.enum(editableLeadStatuses).optional(),
    notes: z.string().trim().max(2000).optional(),
    assignedTo: objectIdSchema.nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Aucune modification fournie',
  });
