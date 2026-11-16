import { Router } from 'express';
import { validate } from '../middlewares/validate.js';
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

// mergeParams : indispensable pour lire req.params.projectId
const router = Router({ mergeParams: true });

// TODO(auth) : quand la partie A aura poussé, ajouter ici protect et
// projectAccess sur toutes les routes, et authorize('admin', 'advisor')
// sur POST et PATCH.

router.get('/', validate({ params: projectParamsSchema }), listAssignments);
router.post(
  '/',
  validate({ params: projectParamsSchema, body: assignPartnerSchema }),
  createAssignment
);
router.patch(
  '/:assignmentId',
  validate({ params: assignmentParamsSchema, body: updateAssignmentSchema }),
  updateAssignment
);

export default router;
