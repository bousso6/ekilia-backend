import { env } from '../config/env.js';
import { getTransporter } from '../config/mailer.js';
import { buildNotificationEmail } from '../utils/emailTemplates.js';

// Les services passent des liens relatifs (/admin/leads/..., /projects/...).
// Dans un e-mail, il faut une URL complète : on préfixe avec CLIENT_URL.
const toAbsoluteLink = (link) => {
  if (!link) return link;
  if (/^https?:\/\//i.test(link)) return link;

  const base = String(env.CLIENT_URL || '').replace(/\/+$/, '');
  const path = link.startsWith('/') ? link : `/${link}`;
  return `${base}${path}`;
};

export async function sendNotificationEmail({ to, recipientName, type, message, link }) {
  if (!to) {
    return { status: 'skipped' };
  }

  const { subject, text, html } = buildNotificationEmail({
    type,
    message,
    link: toAbsoluteLink(link),
    recipientName,
  });

  const transporter = getTransporter();

  // Si SMTP_HOST est vide (développement) : logue l'e-mail sans envoyer
  if (!transporter) {
    if (env.NODE_ENV !== 'test') {
      console.info('[MAIL DEV]', {
        from: env.MAIL_FROM || 'no-reply@elikia-diaspora.sn',
        to,
        subject,
        text,
      });
    }
    return { status: 'logged' };
  }

  await transporter.sendMail({
    from: env.MAIL_FROM || 'Elikia Diaspora <no-reply@elikia-diaspora.sn>',
    to,
    subject,
    text,
    html,
  });

  return { status: 'sent' };
}