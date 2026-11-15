import { Router } from 'express';

// Partie B
import partnerRoutes from './partner.routes.js';
import assignmentRoutes from './assignment.routes.js';
import budgetRoutes from './budget.routes.js';
import documentRoutes from './document.routes.js';
// import notificationRoutes from './notification.routes.js';

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
// Montage provisoire : à déplacer dans le bloc « Routeurs de la partie B »
// de project.routes.js quand la partie A l'aura poussé.
router.use('/admin/partners', partnerRoutes);
router.use('/projects/:projectId/partners', assignmentRoutes);
router.use('/projects/:projectId/documents', documentRoutes);
router.use('/projects/:projectId', budgetRoutes);
// router.use('/notifications', notificationRoutes);

export default router;
