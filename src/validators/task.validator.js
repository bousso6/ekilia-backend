import { z } from 'zod';
import { TASK_STATUS, PRIORITIES } from '../utils/constants.js';

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

export const listTasksQuerySchema = z.object({
  status: z.enum(TASK_STATUS).optional(),
  priority: z.enum(PRIORITIES).optional(),
  assignedTo: objectIdSchema.optional(),
  isMilestone: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
});

export const createTaskSchema = z.object({
  title: titleSchema,
  description: descriptionSchema.optional(),
  status: z.enum(TASK_STATUS).optional(),
  priority: z.enum(PRIORITIES).optional(),
  assignedTo: z.union([objectIdSchema, z.null()]).optional(),
  dueDate: dateSchema.optional(),
  isMilestone: z.boolean().optional(),
  order: z.coerce.number().int().min(0).optional(),
});

export const updateTaskSchema = z
  .object({
    title: titleSchema.optional(),
    description: descriptionSchema.optional(),
    status: z.enum(TASK_STATUS).optional(),
    priority: z.enum(PRIORITIES).optional(),
    assignedTo: z.union([objectIdSchema, z.null()]).optional(),
    dueDate: dateSchema.optional(),
    isMilestone: z.boolean().optional(),
    order: z.coerce.number().int().min(0).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Aucune modification fournie',
  });

export const taskIdParamSchema = z.object({
  projectId: objectIdSchema,
  taskId: objectIdSchema,
});
