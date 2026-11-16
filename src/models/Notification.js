import mongoose from 'mongoose';
import { NOTIFICATION_TYPES } from '../utils/constants.js';

export const EMAIL_STATUS = ['pending', 'sent', 'logged', 'skipped', 'failed'];

const notificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    message: { type: String, required: true, trim: true },
    link: { type: String, trim: true },
    readAt: Date,

    // Suivi interne de l'envoi de l'e-mail (non renvoyé par l'API)
    emailStatus: { type: String, enum: EMAIL_STATUS, default: 'pending' },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, readAt: 1, createdAt: -1 });

notificationSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    delete ret.emailStatus;
    return ret;
  },
});

export const Notification = mongoose.model('Notification', notificationSchema);
