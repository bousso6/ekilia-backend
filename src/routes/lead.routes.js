import { Router } from 'express';
import { validate } from '../middlewares/validate.js';
import { apiLimiter } from '../middlewares/rateLimiter.js';
import {
  createLeadSchema,
  leadIdParamSchema,
  listLeadsQuerySchema,
  updateLeadSchema,
} from '../validators/lead.validator.js';
import * as leadController from '../controllers/lead.controller.js';

const router = Router();

router.get('/diagnostic/form', leadController.getDiagnosticForm);
router.post(
  '/leads',
  apiLimiter,
  validate({ body: createLeadSchema }),
  leadController.createLead
);

export const adminLeadRouter = Router();

adminLeadRouter.get(
  '/',
  validate({ query: listLeadsQuerySchema }),
  leadController.listLeads
);
adminLeadRouter.get(
  '/:id',
  validate({ params: leadIdParamSchema }),
  leadController.getLead
);
adminLeadRouter.patch(
  '/:id',
  validate({ params: leadIdParamSchema, body: updateLeadSchema }),
  leadController.updateLead
);
adminLeadRouter.post(
  '/:id/convert',
  validate({ params: leadIdParamSchema }),
  leadController.convertLead
);

export default router;
