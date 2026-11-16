import { Router } from 'express';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import leadRoutes from './lead.routes.js';
import projectRoutes from './project.routes.js';
import notificationRoutes from './notification.routes.js';
import meRoutes from './me.routes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API Elikia opérationnelle',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use(leadRoutes);
router.use('/me', meRoutes);
router.use('/projects', projectRoutes);
router.use('/dashboard', dashboardRoutes);

// Les routeurs de la partie B sont montés dans admin.routes.js
// (/admin/partners, /admin/reports) et project.routes.js
// (/projects/:projectId/partners|documents|activity|budget|expenses),
// derrière le middleware auth de ces deux routeurs.
// /notifications n'a pas de parent : auth est appliqué dans notification.routes.js.
router.use('/notifications', notificationRoutes);

export default router;