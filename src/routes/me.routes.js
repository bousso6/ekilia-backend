import { Router } from 'express';
import auth from '../middlewares/auth.js';
import { getMyDashboard } from '../controllers/clientDashboard.controller.js';

const router = Router();

// GET /api/v1/me/dashboard
router.get('/dashboard', auth, getMyDashboard);

export default router;