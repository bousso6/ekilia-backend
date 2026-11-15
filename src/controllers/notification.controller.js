import { Notification } from '../models/Notification.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getMyNotifications = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentification requise');
  }

  const userId = req.user._id || req.user.id;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

  const [items, total, unreadCount] = await Promise.all([
    Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Notification.countDocuments({ user: userId }),
    Notification.countDocuments({ user: userId, readAt: null }),
  ]);

  res.json({
    success: true,
    data: {
      items,
      unreadCount,
      pagination: { page, limit, total },
    },
  });
});

export const markNotificationAsRead = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentification requise');
  }

  const userId = String(req.user._id || req.user.id);
  const notification = await Notification.findById(req.params.id);

  if (!notification) {
    throw ApiError.notFound('Notification introuvable');
  }
  if (String(notification.user) !== userId) {
    throw ApiError.forbidden('Accès refusé à cette notification');
  }

  if (!notification.readAt) {
    notification.readAt = new Date();
    await notification.save();
  }

  res.json({ success: true, data: notification });
});

export const markAllNotificationsAsRead = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentification requise');
  }

  const userId = req.user._id || req.user.id;
  const result = await Notification.updateMany(
    { user: userId, readAt: null },
    { $set: { readAt: new Date() } }
  );

  res.json({
    success: true,
    data: { modifiedCount: result.modifiedCount },
  });
});
