import nodemailer from 'nodemailer';
import { env } from './env.js';

const APP_NAME = 'Elikia Diaspora';

let transporter = null;

export function getTransporter() {
  if (!env.SMTP_HOST) {
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: Number(env.SMTP_PORT || 587),
      secure: Number(env.SMTP_PORT) === 465,
      auth:
        env.SMTP_USER && env.SMTP_PASS
          ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
          : undefined,
    });
  }

  return transporter;
}

export async function envoyerMail({ to, sujet, html }) {
  const t = getTransporter();
  if (!t) throw new Error('SMTP non configuré');

  return t.sendMail({
    from: env.MAIL_FROM,
    to,
    subject: sujet,
    html,
  });
}

// Évite qu'un prénom contenant du code HTML casse ou détourne le mail
function echapper(texte = '') {
  return String(texte)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function envoyerConfirmationEmail({ to, prenom, token }) {
  const lien = `${env.CLIENT_URL}/verify-email?token=${encodeURIComponent(token)}`;
  return envoyerMail({
    to,
    sujet: 'Confirme ton adresse email',
    html: `
      <h2>Bienvenue sur ${APP_NAME}, ${echapper(prenom)} !</h2>
      <p>Clique sur le lien pour confirmer ton adresse email :</p>
      <p><a href="${lien}">Confirmer mon email</a></p>
      <p>Ce lien est valable 24 heures.</p>`,
  });
}

export function envoyerResetMotDePasse({ to, prenom, token }) {
  const lien = `${env.CLIENT_URL}/reset-password?token=${encodeURIComponent(token)}`;
  return envoyerMail({
    to,
    sujet: 'Réinitialisation de ton mot de passe',
    html: `
      <h2>Mot de passe oublié ?</h2>
      <p>Bonjour ${echapper(prenom)}, clique ici pour choisir un nouveau mot de passe :</p>
      <p><a href="${lien}">Réinitialiser mon mot de passe</a></p>
      <p>Ce lien est valable 1 heure. Si tu n'es pas à l'origine de cette demande, ignore ce mail.</p>`,
  });
}