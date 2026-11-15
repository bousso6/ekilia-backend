import { Router } from 'express';
import {
  getMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../controllers/notification.controller.js';
import { validate } from '../middlewares/validate.js';
import {
  listPaginationQuerySchema,
  notificationIdParamSchema,
} from '../validators/notification.validator.js';

const router = Router();

router.get('/', validate(listPaginationQuerySchema), getMyNotifications);
router.patch('/read-all', markAllNotificationsAsRead);
router.patch('/:id/read', validate(notificationIdParamSchema), markNotificationAsRead);

export default router;
