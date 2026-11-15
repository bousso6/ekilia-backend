import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Identifiant invalide');

export const notificationIdParamsSchema = z.object({
  id: objectIdSchema,
});

export const projectIdParamsSchema = z.object({
  projectId: objectIdSchema,
});

export const listPaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});
