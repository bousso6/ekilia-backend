import { Router } from 'express';
import { getProjectActivity } from '../controllers/activity.controller.js';
import { validate } from '../middlewares/validate.js';
import {
  listPaginationQuerySchema,
  projectIdParamSchema,
} from '../validators/notification.validator.js';

const router = Router({ mergeParams: true });

router.get(
  '/',
  validate(projectIdParamSchema.merge(listPaginationQuerySchema)),
  getProjectActivity
);

export default router;
