import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { ROLES } from '../utils/constants.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

const hashToken = (value) => crypto.createHash('sha256').update(value).digest('hex');

const issueTokens = (user) => {
  const accessToken = jwt.sign(
    { sub: user._id.toString(), role: user.role },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN }
  );

  const refreshToken = jwt.sign(
    { sub: user._id.toString(), jti: crypto.randomBytes(16).toString('hex') },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN }
  );

  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  };
};

const clientBaseUrl = () =>
  (env.CLIENT_URL.split(',')[0] || '').trim().replace(/\/+$/, '');

const buildLink = (path, token) => `${clientBaseUrl()}${path}?token=${token}`;

const parseSender = (value) => {
  const match = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(value || '');
  if (match) return { name: match[1] || 'Elikia', email: match[2] };
  return { name: 'Elikia', email: (value || '').trim() };
};

const logDevLink = (to, devLink, label, reason) => {
  if (env.NODE_ENV !== 'production') {
    logger.warn(
      { email: to, link: devLink },
      `${label} : ${reason}, lien affiché en développement`
    );
  }
};

const sendViaBrevo = async ({ to, subject, text, html }) => {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      sender: parseSender(env.MAIL_FROM),
      to: [{ email: to }],
      subject,
      textContent: text,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    const error = new Error(`Brevo ${response.status}: ${body.slice(0, 300)}`);
    error.status = response.status;
    throw error;
  }
};

const sendViaSmtp = async ({ to, subject, text, html }) => {
  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });

  await transporter.sendMail({ from: env.MAIL_FROM, to, subject, text, html });
};

const sendMail = async ({ to, subject, text, html, devLink, label }) => {
  const provider = env.BREVO_API_KEY ? 'Brevo' : env.SMTP_HOST ? 'SMTP' : null;

  if (!provider) {
    logDevLink(to, devLink, label, 'aucun fournisseur email configuré');
    return;
  }

  try {
    if (env.BREVO_API_KEY) {
      await sendViaBrevo({ to, subject, text, html });
    } else {
      await sendViaSmtp({ to, subject, text, html });
    }
    logger.info(
      {
        email: to,
        provider,
        ...(env.NODE_ENV !== 'production' && { link: devLink }),
      },
      `${label} : email envoyé`
    );
  } catch (error) {
    logger.error(
      { email: to, provider, status: error.status, error: error.message },
      `${label} : échec de l'envoi`
    );
    logDevLink(to, devLink, label, `échec ${provider}`);
  }
};

const sendPasswordResetEmail = async (user, token) => {
  const link = buildLink('/reset-password', token);

  await sendMail({
    to: user.email,
    subject: 'Réinitialisation de votre mot de passe Elikia',
    text: `Bonjour ${user.firstName},\n\nPour réinitialiser votre mot de passe, utilisez ce lien valable 30 minutes :\n${link}\n\nSi vous n'êtes pas à l'origine de cette demande, ignorez cet email.`,
    html: `<p>Bonjour ${user.firstName},</p><p>Pour réinitialiser votre mot de passe, utilisez ce lien valable 30 minutes :</p><p><a href="${link}">Réinitialiser mon mot de passe</a></p><p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`,
    devLink: link,
    label: 'Réinitialisation de mot de passe',
  });
};

const sendVerificationEmail = async (user, token) => {
  const link = buildLink('/verify-email', token);

  await sendMail({
    to: user.email,
    subject: 'Vérifiez votre adresse email Elikia',
    text: `Bonjour ${user.firstName},\n\nBienvenue chez Elikia Diaspora. Pour activer votre compte, confirmez votre adresse email avec ce lien valable 24 heures :\n${link}\n\nSi vous n'êtes pas à l'origine de cette inscription, ignorez cet email.`,
    html: `<p>Bonjour ${user.firstName},</p><p>Bienvenue chez Elikia Diaspora. Pour activer votre compte, confirmez votre adresse email avec ce lien valable 24 heures :</p><p><a href="${link}">Vérifier mon adresse email</a></p><p>Si vous n'êtes pas à l'origine de cette inscription, ignorez cet email.</p>`,
    devLink: link,
    label: 'Vérification d\'email',
  });
};

export const registerUser = async ({
  firstName,
  lastName,
  email,
  password,
  phone,
  countryOfResidence,
  cityOfResidence,
  consent,
}) => {
  const existing = await User.findOne({ email });
  if (existing) {
    throw ApiError.conflict('Un compte existe déjà avec cet email');
  }

  const user = new User({
    firstName,
    lastName,
    email,
    password,
    phone,
    countryOfResidence,
    cityOfResidence,
    role: ROLES.CLIENT,
    isEmailVerified: false,
    consent: {
      accepted: Boolean(consent),
      acceptedAt: consent ? new Date() : undefined,
    },
  });

  await user.save();

  const token = crypto.randomBytes(32).toString('hex');
  user.emailVerificationTokenHash = hashToken(token);
  user.emailVerificationExpires = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);
  await user.save();

  await sendVerificationEmail(user, token);

  return { user: user.toJSON() };
};

export const verifyEmail = async (token) => {
  const user = await User.findOneAndUpdate(
    {
      emailVerificationTokenHash: hashToken(token),
      emailVerificationExpires: { $gt: new Date() },
      isEmailVerified: false,
    },
    {
      $set: { isEmailVerified: true },
      $unset: { emailVerificationTokenHash: 1, emailVerificationExpires: 1 },
    },
    { new: true }
  );

  if (!user) {
    throw ApiError.badRequest('Lien de vérification invalide ou expiré');
  }

  return user.toJSON();
};

export const resendVerificationEmail = async (email) => {
  const user = await User.findOne({ email });
  if (!user || user.isEmailVerified) {
    return;
  }

  const token = crypto.randomBytes(32).toString('hex');
  user.emailVerificationTokenHash = hashToken(token);
  user.emailVerificationExpires = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);
  await user.save();

  await sendVerificationEmail(user, token);
};

export const loginUser = async ({ email, password }) => {
  const user = await User.findOne({ email }).select('+password');

  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('Email ou mot de passe incorrect');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('Ce compte est désactivé');
  }

  if (!user.isEmailVerified) {
    throw ApiError.forbidden(
      "Veuillez vérifier votre adresse email avant de vous connecter. Un email d'activation vous a été envoyé."
    );
  }

  user.lastLoginAt = new Date();
  const tokens = issueTokens(user);
  user.refreshTokenHash = hashToken(tokens.refreshToken);
  await user.save();

  return { user: user.toJSON(), tokens };
};

export const refreshTokens = async (refreshToken) => {
  let payload;
  try {
    payload = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET);
  } catch {
    throw ApiError.unauthorized('Jeton de rafraîchissement invalide ou expiré');
  }

  const user = await User.findById(payload.sub).select('+refreshTokenHash');
  if (!user || !user.refreshTokenHash) {
    throw ApiError.unauthorized('Session expirée, veuillez vous reconnecter');
  }

  if (!user.isActive) {
    throw ApiError.forbidden('Ce compte est désactivé');
  }

  const incomingHash = Buffer.from(hashToken(refreshToken), 'hex');
  const storedHash = Buffer.from(user.refreshTokenHash, 'hex');

  if (
    incomingHash.length !== storedHash.length ||
    !crypto.timingSafeEqual(incomingHash, storedHash)
  ) {
    throw ApiError.unauthorized('Jeton de rafraîchissement invalide');
  }

  const tokens = issueTokens(user);
  user.refreshTokenHash = hashToken(tokens.refreshToken);
  await user.save();

  return { user: user.toJSON(), tokens };
};

export const logoutUser = async (userId) => {
  await User.findByIdAndUpdate(userId, { $unset: { refreshTokenHash: 1 } });
};

export const getCurrentUser = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('Utilisateur introuvable');
  }
  return user.toJSON();
};

const PROFILE_FIELDS = [
  'firstName',
  'lastName',
  'phone',
  'countryOfResidence',
  'cityOfResidence',
];

export const updateProfile = async (userId, payload) => {
  const user = await User.findById(userId);
  if (!user) {
    throw ApiError.notFound('Utilisateur introuvable');
  }

  PROFILE_FIELDS.forEach((field) => {
    if (payload[field] !== undefined) {
      user[field] = payload[field];
    }
  });

  await user.save();
  return user.toJSON();
};

export const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId).select('+password');
  if (!user) {
    throw ApiError.notFound('Utilisateur introuvable');
  }

  const matches = await user.comparePassword(currentPassword);
  if (!matches) {
    throw ApiError.badRequest('Mot de passe actuel incorrect');
  }

  user.password = newPassword;
  await user.save();

  await User.updateOne({ _id: user._id }, { $unset: { refreshTokenHash: 1 } });

  return user.toJSON();
};

export const sendPasswordResetLink = async (user) => {
  const token = crypto.randomBytes(32).toString('hex');
  user.passwordResetTokenHash = hashToken(token);
  user.passwordResetExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS);
  await user.save();

  await sendPasswordResetEmail(user, token);
};

export const requestPasswordReset = async (email) => {
  const user = await User.findOne({ email });
  if (!user) {
    return;
  }

  await sendPasswordResetLink(user);
};

export const resetPassword = async (token, newPassword) => {
  const user = await User.findOne({
    passwordResetTokenHash: hashToken(token),
    passwordResetExpires: { $gt: new Date() },
  }).select('+passwordResetTokenHash +passwordResetExpires');

  if (!user) {
    throw ApiError.badRequest('Lien de réinitialisation invalide ou expiré');
  }

  user.password = newPassword;
  await user.save();

  await User.updateOne(
    { _id: user._id },
    { $unset: { passwordResetTokenHash: 1, passwordResetExpires: 1, refreshTokenHash: 1 } }
  );
};
