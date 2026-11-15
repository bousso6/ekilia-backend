import { Router } from 'express';
import { auth } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { ROLES } from '../utils/constants.js';
import {
  listUsersQuerySchema,
  userIdParamSchema,
  updateUserRoleSchema,
  updateUserStatusSchema,
} from '../validators/index.js';
import * as adminController from '../controllers/admin.controller.js';
import * as dashboardController from '../controllers/dashboard.controller.js';
import { adminLeadRouter } from './lead.routes.js';

const router = Router();

router.use(auth);

router.get(
  '/dashboard',
  authorize(ROLES.ADMIN),
  dashboardController.getAdminDashboard
);

router.use('/users', authorize(ROLES.ADMIN));

router.get(
  '/users',
  validate({ query: listUsersQuerySchema }),
  adminController.listUsers
);
router.get(
  '/users/:id',
  validate({ params: userIdParamSchema }),
  adminController.getUser
);
router.patch(
  '/users/:id/role',
  validate({ params: userIdParamSchema, body: updateUserRoleSchema }),
  adminController.updateUserRole
);
router.patch(
  '/users/:id/status',
  validate({ params: userIdParamSchema, body: updateUserStatusSchema }),
  adminController.updateUserStatus
);

router.use('/leads', authorize(ROLES.ADMIN, ROLES.ADVISOR), adminLeadRouter);

export default router;
