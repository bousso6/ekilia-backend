import { Router } from 'express';
import {
  getMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../controllers/notification.controller.js';
import { validate } from '../middlewares/validate.js';
import {
  listPaginationQuerySchema,
  notificationIdParamsSchema,
} from '../validators/notification.validator.js';

const router = Router();

router.get('/', validate({ query: listPaginationQuerySchema }), getMyNotifications);
router.patch('/read-all', markAllNotificationsAsRead);
router.patch('/:id/read', validate({ params: notificationIdParamsSchema }), markNotificationAsRead);

export default router;
