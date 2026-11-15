import { z } from 'zod';
import { ROLES } from '../utils/constants.js';

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Adresse email invalide');

const passwordSchema = z
  .string()
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
  .max(72, 'Le mot de passe ne peut pas dépasser 72 caractères');

export const registerSchema = z.object({
  firstName: z.string().trim().min(2, 'Le prénom est requis').max(50),
  lastName: z.string().trim().min(2, 'Le nom est requis').max(50),
  email: emailSchema,
  password: passwordSchema,
  phone: z.string().trim().min(6).max(30).optional(),
  countryOfResidence: z.string().trim().max(80).optional(),
  cityOfResidence: z.string().trim().max(80).optional(),
  consent: z.literal(true, {
    errorMap: () => ({ message: 'Le consentement est obligatoire' }),
  }),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Le mot de passe est requis'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(10, 'Jeton de rafraîchissement requis'),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const verifyEmailSchema = z.object({
  token: z.string().min(32, 'Jeton de vérification invalide'),
});

export const resendVerificationSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().min(32, 'Jeton de réinitialisation invalide'),
  password: passwordSchema,
});

export const updateProfileSchema = z
  .object({
    firstName: z.string().trim().min(2, 'Le prénom est requis').max(50).optional(),
    lastName: z.string().trim().min(2, 'Le nom est requis').max(50).optional(),
    phone: z.string().trim().max(30).optional(),
    countryOfResidence: z.string().trim().max(80).optional(),
    cityOfResidence: z.string().trim().max(80).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Aucune modification fournie',
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Le mot de passe actuel est requis'),
    newPassword: passwordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'Le nouveau mot de passe doit être différent du mot de passe actuel',
    path: ['newPassword'],
  });

const roleSchema = z.enum(Object.values(ROLES), {
  errorMap: () => ({ message: 'Rôle invalide' }),
});

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: roleSchema.optional(),
  isActive: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  search: z.string().trim().max(80).optional(),
});

export const userIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Identifiant utilisateur invalide'),
});

export const updateUserRoleSchema = z.object({
  role: roleSchema,
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});
