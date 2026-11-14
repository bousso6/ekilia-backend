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

const router = Router();

router.use(auth, authorize(ROLES.ADMIN));

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

export default router;
