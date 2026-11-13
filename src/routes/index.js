import { Router } from 'express';

const router = Router();

router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'API Elikia opérationnelle',
    timestamp: new Date().toISOString(),
  });
});

// Partie A
// import authRoutes from './auth.routes.js';
// import leadRoutes from './lead.routes.js';
// import projectRoutes from './project.routes.js';
// import dashboardRoutes from './dashboard.routes.js';
// import adminRoutes from './admin.routes.js';
// router.use('/auth', authRoutes);
// router.use('/leads', leadRoutes);
// router.use('/projects', projectRoutes);
// router.use('/dashboard', dashboardRoutes);
// router.use('/admin', adminRoutes);

// Partie B
// import partnerRoutes from './partner.routes.js';
// import notificationRoutes from './notification.routes.js';
// router.use('/partners', partnerRoutes);
// router.use('/notifications', notificationRoutes);

export default router;