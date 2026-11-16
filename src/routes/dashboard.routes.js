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
router.get(
  '/advisor',
  authorize(ROLES.ADVISOR),
  dashboardController.getAdvisorDashboard
);
router.get(
  '/finance',
  authorize(ROLES.FINANCE),
  dashboardController.getFinanceDashboard
);

export default router;
