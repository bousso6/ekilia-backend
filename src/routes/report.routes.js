import { Router } from 'express';
import {
  exportBudgetsReport,
  exportClientsReport,
  exportConversionsReport,
  exportPartnersReport,
  exportProjectsReport,
} from '../controllers/report.controller.js';
import { validate } from '../middlewares/validate.js';
import { reportQuerySchema } from '../validators/report.validator.js';

const router = Router();

// TODO(auth) : quand la partie A aura poussé, ajouter ici protect + authorize(...)

router.get('/clients', validate({ query: reportQuerySchema }), exportClientsReport);
router.get('/projects', validate({ query: reportQuerySchema }), exportProjectsReport);
router.get('/budgets', validate({ query: reportQuerySchema }), exportBudgetsReport);
router.get('/partners', validate({ query: reportQuerySchema }), exportPartnersReport);
router.get('/conversions', validate({ query: reportQuerySchema }), exportConversionsReport);

export default router;
