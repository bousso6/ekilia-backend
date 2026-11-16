import { Router } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { authorize } from '../middlewares/authorize.js';
import { validate } from '../middlewares/validate.js';
import { uploadSingle } from '../middlewares/upload.js';
import { ROLES } from '../utils/constants.js';
import {
  projectParamsSchema,
  documentParamsSchema,
  requestDocumentSchema,
  updateDocumentStatusSchema,
  listDocumentsQuerySchema,
} from '../validators/document.validator.js';
import {
  listDocuments,
  requestDocument,
  uploadDocumentFile,
  downloadDocument,
  updateDocumentStatus,
} from '../controllers/document.controller.js';

// Monté sur /projects/:projectId/documents par project.routes.js, derrière auth.
// mergeParams pour lire projectId
const router = Router({ mergeParams: true });

const STAFF_WRITE_ROLES = [ROLES.ADMIN, ROLES.ADVISOR];

// Garde de sécurité en plus de auth : sans utilisateur authentifié, on refuse
// AVANT de lire le fichier envoyé (multer).
const authenticated = (req, res, next) =>
  req.user ? next() : next(ApiError.unauthorized());

router.get(
  '/',
  validate({ params: projectParamsSchema, query: listDocumentsQuerySchema }),
  listDocuments
);

router.post(
  '/request',
  authorize(STAFF_WRITE_ROLES),
  validate({ params: projectParamsSchema, body: requestDocumentSchema }),
  requestDocument
);

// Le dépôt d'un fichier est ouvert au client du projet : pas d'authorize ici,
// l'appartenance au projet est vérifiée dans le contrôleur.
router.post(
  '/:docId/upload',
  validate({ params: documentParamsSchema }),
  authenticated,
  uploadSingle,
  uploadDocumentFile
);

router.get(
  '/:docId/download',
  validate({ params: documentParamsSchema }),
  downloadDocument
);

router.patch(
  '/:docId/status',
  authorize(STAFF_WRITE_ROLES),
  validate({ params: documentParamsSchema, body: updateDocumentStatusSchema }),
  updateDocumentStatus
);

export default router;