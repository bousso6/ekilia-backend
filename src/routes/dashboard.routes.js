import { Router } from 'express';
import { auth } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';
import { ROLES } from '../utils/constants.js';
import * as dashboardController from '../controllers/dashboard.controller.js';

const router = Router();

router.use(auth);
router.get(
  '/client',
  authorize(ROLES.CLIENT),
  dashboardController.getClientDashboard
);

export default router;
