import { Router } from 'express';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { ROLES } from '../utils/constants.js';
import {
  projectParamsSchema,
  assignmentParamsSchema,
  assignPartnerSchema,
  updateAssignmentSchema,
} from '../validators/partner.validator.js';
import {
  listAssignments,
  createAssignment,
  updateAssignment,
} from '../controllers/assignment.controller.js';

// Monté sur /projects/:projectId/partners par project.routes.js, derrière auth.
// mergeParams : indispensable pour lire req.params.projectId
const router = Router({ mergeParams: true });

const WRITE_ROLES = [ROLES.ADMIN, ROLES.ADVISOR];

router.get('/', validate({ params: projectParamsSchema }), listAssignments);
router.post(
  '/',
  authorize(WRITE_ROLES),
  validate({ params: projectParamsSchema, body: assignPartnerSchema }),
  createAssignment
);
router.patch(
  '/:assignmentId',
  authorize(WRITE_ROLES),
  validate({ params: assignmentParamsSchema, body: updateAssignmentSchema }),
  updateAssignment
);

export default router;