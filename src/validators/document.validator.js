import { z } from 'zod';
import { DOCUMENT_CATEGORIES, DOCUMENT_STATUS } from '../utils/constants.js';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Identifiant invalide');

export const projectParamsSchema = z.object({ projectId: objectId });

export const documentParamsSchema = z.object({
  projectId: objectId,
  docId: objectId,
});

// Le staff demande une pièce au client
export const requestDocumentSchema = z.object({
  title: z.string().trim().min(2).max(150),
  category: z.enum(DOCUMENT_CATEGORIES).optional(),
  dueDate: z.coerce.date().optional(),
});

// Statuts que le staff peut fixer (« demande » et « recu » sont automatiques)
export const REVIEW_STATUSES = ['a_verifier', 'valide', 'refuse'];

export const updateDocumentStatusSchema = z
  .object({
    status: z.enum(REVIEW_STATUSES),
    reason: z.string().trim().min(3).max(500).optional(),
  })
  .refine((data) => data.status !== 'refuse' || Boolean(data.reason), {
    message: 'Un motif est requis pour refuser un document',
    path: ['reason'],
  });

export const listDocumentsQuerySchema = z.object({
  status: z.enum(DOCUMENT_STATUS).optional(),
  category: z.enum(DOCUMENT_CATEGORIES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});
