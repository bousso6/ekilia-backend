import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { NOTIFICATION_TYPES } from '../utils/constants.js';
import { sendNotificationEmail } from './email.service.js';

export async function notify({ user, type, message, link = undefined }) {
  try {
    if (!user || !type || !message) {
      return null;
    }

    if (!NOTIFICATION_TYPES.includes(type)) {
      console.error(`[notification.service] Type invalide ignoré : ${type}`);
      return null;
    }

    const notification = await Notification.create({
      user,
      type,
      message,
      link,
      emailStatus: 'pending',
    });

    try {
      const recipient = await User.findById(user).select('email name').lean();
      if (!recipient?.email) {
        notification.emailStatus = 'skipped';
        await notification.save();
        return notification;
      }

      const result = await sendNotificationEmail({
        to: recipient.email,
        recipientName: recipient.name,
        type,
        message,
        link,
      });

      notification.emailStatus = result?.status || 'sent';
      await notification.save();
    } catch (mailErr) {
      console.error('[notification.service] Échec envoi e-mail:', mailErr?.message || mailErr);
      try {
        notification.emailStatus = 'failed';
        await notification.save();
      } catch {
        // Ne jamais propager vers l'appelant
      }
    }

    return notification;
  } catch (err) {
    console.error('[notification.service] Échec notify:', err?.message || err);
    return null;
  }
}
