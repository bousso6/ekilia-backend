import { Router } from 'express';
import { validate } from '../middlewares/validate.js';
import {
  createPartnerSchema,
  updatePartnerSchema,
  listPartnersQuerySchema,
  partnerIdParamsSchema,
} from '../validators/partner.validator.js';
import {
  listPartners,
  getPartner,
  createPartner,
  updatePartner,
} from '../controllers/partner.controller.js';

const router = Router();

// Monté sur /admin/partners par admin.routes.js : auth et
// authorize(admin, advisor) sont appliqués par le routeur parent.

router.get('/', validate({ query: listPartnersQuerySchema }), listPartners);
router.post('/', validate({ body: createPartnerSchema }), createPartner);
router.get('/:id', validate({ params: partnerIdParamsSchema }), getPartner);
router.patch(
  '/:id',
  validate({ params: partnerIdParamsSchema, body: updatePartnerSchema }),
  updatePartner
);

export default router;