import nodemailer from 'nodemailer';
import { env } from './env.js';

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
