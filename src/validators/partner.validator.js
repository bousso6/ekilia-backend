import { z } from 'zod';
import { ASSIGNMENT_STATUS } from '../utils/constants.js';
import { PARTNER_VERIFICATION_STATUS } from '../models/Partner.js';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Identifiant invalide');

const contactsSchema = z.object({
  phone: z.string().trim().max(30).optional(),
  email: z.string().trim().email('E-mail invalide').optional(),
  address: z.string().trim().max(300).optional(),
});

const hasAtLeastOneField = (obj) => Object.keys(obj).length > 0;

// ---------- Partenaires (admin) ----------

export const createPartnerSchema = z.object({
  name: z.string().trim().min(2).max(150),
  category: z.string().trim().min(2).max(60),
  contacts: contactsSchema.optional(),
  verificationStatus: z.enum(PARTNER_VERIFICATION_STATUS).optional(),
  prestations: z.array(z.string().trim().min(1).max(150)).max(30).optional(),
  internalNotes: z.string().trim().max(2000).optional(),
});

export const updatePartnerSchema = createPartnerSchema
  .partial()
  .refine(hasAtLeastOneField, { message: 'Aucune modification fournie' });

export const listPartnersQuerySchema = z.object({
  category: z.string().trim().optional(),
  verificationStatus: z.enum(PARTNER_VERIFICATION_STATUS).optional(),
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const partnerIdParamsSchema = z.object({ id: objectId });

// ---------- Affectations (par projet) ----------

export const projectParamsSchema = z.object({ projectId: objectId });

export const assignmentParamsSchema = z.object({
  projectId: objectId,
  assignmentId: objectId,
});

export const assignPartnerSchema = z.object({
  partner: objectId,
  role: z.string().trim().min(2).max(150),
  status: z.enum(ASSIGNMENT_STATUS).optional(),
});

export const updateAssignmentSchema = z
  .object({
    status: z.enum(ASSIGNMENT_STATUS).optional(),
    role: z.string().trim().min(2).max(150).optional(),
    contactRevealed: z.boolean().optional(),
  })
  .refine(hasAtLeastOneField, { message: 'Aucune modification fournie' });
