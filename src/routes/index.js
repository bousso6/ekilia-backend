import { Router } from 'express';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API Elikia opérationnelle',
    timestamp: new Date().toISOString(),
  });
});

// Partie A
// import leadRoutes from './lead.routes.js';
// import projectRoutes from './project.routes.js';
// import dashboardRoutes from './dashboard.routes.js';
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
// router.use('/leads', leadRoutes);
// router.use('/projects', projectRoutes);
// router.use('/dashboard', dashboardRoutes);

// Partie B
// import partnerRoutes from './partner.routes.js';
// import notificationRoutes from './notification.routes.js';
// router.use('/partners', partnerRoutes);
// router.use('/notifications', notificationRoutes);

export default router;