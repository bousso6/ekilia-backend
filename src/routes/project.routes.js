import { Router } from 'express';
import { auth } from '../middlewares/auth.js';
import { authorize } from '../middlewares/authorize.js';
import { projectAccess } from '../middlewares/projectAccess.js';
import { validate } from '../middlewares/validate.js';
import { ROLES } from '../utils/constants.js';
import * as projectController from '../controllers/project.controller.js';
import * as taskController from '../controllers/task.controller.js';
import {
  listProjectsQuerySchema,
  createProjectSchema,
  updateProjectSchema,
  duplicateProjectSchema,
} from '../validators/project.validator.js';
import {
  listTasksQuerySchema,
  createTaskSchema,
  updateTaskSchema,
  taskIdParamSchema,
} from '../validators/task.validator.js';
import assignmentRoutes from './assignment.routes.js';
import documentRoutes from './document.routes.js';
import activityRoutes from './activity.routes.js';
import budgetRoutes from './budget.routes.js';

const router = Router();

const READ_ROLES = [ROLES.ADMIN, ROLES.ADVISOR, ROLES.FINANCE, ROLES.CLIENT];
const WRITE_ROLES = [ROLES.ADMIN, ROLES.ADVISOR];

router.use(auth);

router.get(
  '/',
  authorize(READ_ROLES),
  validate({ query: listProjectsQuerySchema }),
  projectController.listProjects
);
router.post(
  '/',
  authorize(WRITE_ROLES),
  validate({ body: createProjectSchema }),
  projectController.createProject
);

router.get(
  '/:projectId',
  authorize(READ_ROLES),
  projectAccess,
  projectController.getProject
);
router.patch(
  '/:projectId',
  authorize(WRITE_ROLES),
  projectAccess,
  validate({ body: updateProjectSchema }),
  projectController.updateProject
);
router.post(
  '/:projectId/duplicate',
  authorize(WRITE_ROLES),
  projectAccess,
  validate({ body: duplicateProjectSchema }),
  projectController.duplicateProject
);

router.get(
  '/:projectId/tasks',
  authorize(READ_ROLES),
  projectAccess,
  validate({ query: listTasksQuerySchema }),
  taskController.listTasks
);
router.post(
  '/:projectId/tasks',
  authorize(WRITE_ROLES),
  projectAccess,
  validate({ body: createTaskSchema }),
  taskController.createTask
);
router.patch(
  '/:projectId/tasks/:taskId',
  authorize(WRITE_ROLES),
  projectAccess,
  validate({ params: taskIdParamSchema, body: updateTaskSchema }),
  taskController.updateTask
);
router.delete(
  '/:projectId/tasks/:taskId',
  authorize(WRITE_ROLES),
  projectAccess,
  validate({ params: taskIdParamSchema }),
  taskController.deleteTask
);

// Partie B : routeurs montés derrière auth (ci-dessus). Le contrôle d'accès
// au projet (client = son projet, conseiller = ses projets) est fait dans les
// contrôleurs via loadAccessibleProject (utils/guards.js).
router.use('/:projectId/partners', assignmentRoutes);
router.use('/:projectId/documents', documentRoutes);
router.use('/:projectId/activity', activityRoutes);
router.use('/:projectId', budgetRoutes);

export default router;