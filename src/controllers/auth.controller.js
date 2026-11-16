import { asyncHandler } from '../utils/asyncHandler.js';
import * as authService from '../services/auth.service.js';
import { ROLES } from '../utils/constants.js';

const DASHBOARD_PATHS = {
  [ROLES.ADMIN]: '/admin/dashboard',
  [ROLES.FINANCE]: '/finance/dashboard',
  [ROLES.ADVISOR]: '/advisor/dashboard',
};

export const register = asyncHandler(async (req, res) => {
  const data = await authService.registerUser(req.body);
  res.status(201).json({
    success: true,
    message:
      'Compte créé. Un email de vérification vous a été envoyé avant de pouvoir vous connecter.',
    data,
  });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const user = await authService.verifyEmail(req.body.token);
  res.status(200).json({
    success: true,
    message: 'Adresse email vérifiée avec succès',
    data: { user },
  });
});

export const resendVerification = asyncHandler(async (req, res) => {
  await authService.resendVerificationEmail(req.body.email);
  res.status(200).json({
    success: true,
    message:
      "Si un compte non vérifié existe pour cet email, un nouvel email d'activation a été envoyé.",
  });
});

export const login = asyncHandler(async (req, res) => {
  const data = await authService.loginUser(req.body);
  res.status(200).json({
    success: true,
    data: {
      ...data,
      redirectTo: DASHBOARD_PATHS[data.user.role] ?? null,
    },
  });
});

export const refresh = asyncHandler(async (req, res) => {
  const data = await authService.refreshTokens(req.body.refreshToken);
  res.status(200).json({ success: true, data });
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logoutUser(req.user._id);
  res.status(200).json({ success: true, message: 'Déconnexion réussie' });
});

export const me = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user._id);
  res.status(200).json({ success: true, data: { user } });
});

export const updateMe = asyncHandler(async (req, res) => {
  const user = await authService.updateProfile(req.user._id, req.body);
  res.status(200).json({
    success: true,
    message: 'Profil mis à jour avec succès',
    data: { user },
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  await authService.changePassword(
    req.user._id,
    req.body.currentPassword,
    req.body.newPassword
  );
  res.status(200).json({
    success: true,
    message:
      'Mot de passe modifié avec succès. Vos autres sessions ont été déconnectées.',
  });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  await authService.requestPasswordReset(req.body.email);
  res.status(200).json({
    success: true,
    message:
      'Si un compte existe pour cet email, un lien de réinitialisation a été envoyé.',
  });
});

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.password);
  res.status(200).json({ success: true, message: 'Mot de passe réinitialisé avec succès' });
});
