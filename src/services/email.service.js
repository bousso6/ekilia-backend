import { env } from '../config/env.js';
import { getTransporter } from '../config/mailer.js';
import { buildNotificationEmail } from '../utils/emailTemplates.js';

export async function sendNotificationEmail({ to, recipientName, type, message, link }) {
  if (!to) {
    return { status: 'skipped' };
  }

  const { subject, text, html } = buildNotificationEmail({
    type,
    message,
    link,
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
