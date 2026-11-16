import { Router } from 'express';
import { ApiError } from '../utils/ApiError.js';
import { validate } from '../middlewares/validate.js';
import { uploadSingle } from '../middlewares/upload.js';
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

// Monté sur /projects/:projectId/documents ; mergeParams pour lire projectId
const router = Router({ mergeParams: true });

// TODO(auth) : quand la partie A aura poussé, ajouter protect et projectAccess
// sur toutes les routes, et authorize('admin', 'advisor') sur /request et /status.

// Sans utilisateur authentifié, on refuse AVANT de lire le fichier envoyé.
const authenticated = (req, res, next) =>
  req.user ? next() : next(ApiError.unauthorized());

router.get(
  '/',
  validate({ params: projectParamsSchema, query: listDocumentsQuerySchema }),
  listDocuments
);

router.post(
  '/request',
  validate({ params: projectParamsSchema, body: requestDocumentSchema }),
  requestDocument
);

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
  validate({ params: documentParamsSchema, body: updateDocumentStatusSchema }),
  updateDocumentStatus
);

export default router;
