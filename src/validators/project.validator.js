import { z } from 'zod';
import {
  PROJECT_CATEGORIES,
  PROJECT_STATUS,
  PRIORITIES,
} from '../utils/constants.js';

const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, 'Identifiant invalide');

const dateSchema = z.union([z.null(), z.coerce.date()]);

const titleSchema = z
  .string()
  .trim()
  .min(2, 'Le titre est requis')
  .max(160, 'Le titre est trop long');

const descriptionSchema = z
  .string()
  .trim()
  .max(2000, 'La description est trop longue');

const categorySchema = z.enum(PROJECT_CATEGORIES, {
  errorMap: () => ({ message: 'Catégorie invalide' }),
});

const nextActionSchema = z.object({
  label: z.string().trim().max(160).optional(),
  dueDate: dateSchema.optional(),
  owner: z.enum(['client', 'elikia', 'partenaire']).optional(),
});

const progressSchema = z.object({
  value: z.coerce.number().min(0).max(100).optional(),
  mode: z.enum(['auto', 'manuel']).optional(),
});

const satisfactionSchema = z.object({
  score: z.coerce.number().int().min(1).max(5).optional(),
  comment: z.string().trim().max(1000).optional(),
});

export const listProjectsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(PROJECT_STATUS).optional(),
  category: categorySchema.optional(),
  priority: z.enum(PRIORITIES).optional(),
  client: objectIdSchema.optional(),
  advisor: objectIdSchema.optional(),
  search: z.string().trim().max(80).optional(),
  sort: z.enum(['recent', 'ancien', 'echeance']).default('recent'),
});

export const createProjectSchema = z.object({
  title: titleSchema,
  description: descriptionSchema.optional(),
  client: objectIdSchema,
  advisor: objectIdSchema.optional(),
  category: categorySchema,
  status: z.enum(PROJECT_STATUS).optional(),
  priority: z.enum(PRIORITIES).optional(),
  location: z.string().trim().max(120).optional(),
  progress: progressSchema.optional(),
  startDate: dateSchema.optional(),
  dueDate: dateSchema.optional(),
  nextAction: z.union([nextActionSchema, z.null()]).optional(),
  satisfaction: satisfactionSchema.optional(),
  sourceLead: objectIdSchema.optional(),
  templateId: objectIdSchema.optional(),
});

export const updateProjectSchema = z
  .object({
    title: titleSchema.optional(),
    description: descriptionSchema.optional(),
    client: objectIdSchema.optional(),
    advisor: z.union([objectIdSchema, z.null()]).optional(),
    category: categorySchema.optional(),
    status: z.enum(PROJECT_STATUS).optional(),
    priority: z.enum(PRIORITIES).optional(),
    location: z.union([z.string().trim().max(120), z.null()]).optional(),
    progress: progressSchema.optional(),
    startDate: dateSchema.optional(),
    dueDate: dateSchema.optional(),
    nextAction: z.union([nextActionSchema, z.null()]).optional(),
    satisfaction: satisfactionSchema.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Aucune modification fournie',
  });

export const duplicateProjectSchema = z
  .object({
    title: titleSchema.optional(),
    client: objectIdSchema.optional(),
    advisor: z.union([objectIdSchema, z.null()]).optional(),
  })
  .default({});
