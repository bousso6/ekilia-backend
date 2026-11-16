import { Document } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ROLES } from '../utils/constants.js';
import {
  loadAccessibleProject,
  requireRole,
  userIdOf,
} from '../utils/guards.js';
import { storage } from '../config/storage.js';
import {
  FINANCE_HIDDEN_CATEGORIES,
  canAccessDocument,
  canUploadDocument,
  nextVersionNumber,
  serializeDocument,
  serializeDocuments,
} from '../services/document.service.js';
import { logActivity } from '../services/activity.service.js';
import { notify } from '../services/notification.service.js';

const DOCUMENT_ROLES = [ROLES.ADMIN, ROLES.ADVISOR, ROLES.CLIENT, ROLES.FINANCE];
const REVIEWERS = [ROLES.ADMIN, ROLES.ADVISOR];

// 404 (et non 403) si le document n'existe pas ou n'est pas visible pour ce rôle :
// on ne révèle pas l'existence d'une pièce à qui n'y a pas droit.
const findDocument = async (projectId, docId, role) => {
  const document = await Document.findOne({ _id: docId, project: projectId });
  if (!document || !canAccessDocument(role, document)) {
    throw ApiError.notFound('Document introuvable');
  }
  return document;
};

// GET /projects/:projectId/documents
export const listDocuments = asyncHandler(async (req, res) => {
  const user = requireRole(req, DOCUMENT_ROLES);
  const { projectId } = req.params;
  const { status, category, page, limit } = req.query;

  await loadAccessibleProject(user, projectId);

  const filter = { project: projectId };
  if (status) filter.status = status;
  if (category) filter.category = category;
  if (user.role === ROLES.FINANCE) {
    filter.$and = [{ category: { $nin: FINANCE_HIDDEN_CATEGORIES } }];
  }

  const [items, total] = await Promise.all([
    Document.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Document.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: serializeDocuments(items, user.role),
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

// POST /projects/:projectId/documents/request
export const requestDocument = asyncHandler(async (req, res) => {
  const user = requireRole(req, REVIEWERS);
  const { projectId } = req.params;
  const { title, category, dueDate } = req.body;

  const project = await loadAccessibleProject(user, projectId);

  const document = await Document.create({
    project: projectId,
    title,
    category: category ?? 'autre',
    dueDate,
    requestedBy: userIdOf(user),
    status: 'demande',
  });

  await logActivity({
    project: projectId,
    actor: userIdOf(user),
    action: 'document.requested',
    before: null,
    after: {
      document: String(document._id),
      title: document.title,
      category: document.category,
      dueDate: document.dueDate ?? null,
    },
  });

  await notify({
    user: project.client,
    type: 'document_demande',
    message: `Un document vous est demandé : ${document.title}.`,
    link: `/projects/${projectId}`,
  });

  res.status(201).json({ success: true, data: serializeDocument(document) });
});

// POST /projects/:projectId/documents/:docId/upload
// (le middleware uploadSingle a déjà contrôlé le contenu : req.upload)
export const uploadDocumentFile = asyncHandler(async (req, res) => {
  const user = requireRole(req, DOCUMENT_ROLES);
  const { projectId, docId } = req.params;

  if (!req.upload) throw ApiError.badRequest('Aucun fichier reçu');
  const { buffer, mimeType, extension, originalName, size } = req.upload;

  await loadAccessibleProject(user, projectId);
  const document = await findDocument(projectId, docId, user.role);

  if (!canUploadDocument(user.role, document)) {
    throw ApiError.forbidden('Ce document ne peut plus recevoir de fichier');
  }

  const before = {
    document: String(document._id),
    status: document.status,
    versions: document.versions.length,
  };

  const { key } = await storage.saveFile({
    buffer,
    folder: `projects/${projectId}/${docId}`,
    extension,
  });

  // Un nouveau dépôt ajoute une version : l'ancienne n'est jamais écrasée.
  // Le statut repasse à « reçu » et le staff doit le revalider.
  try {
    const versionNumber = nextVersionNumber(document);
    document.versions.push({
      version: versionNumber,
      storageKey: key,
      originalName,
      mimeType,
      size,
      uploadedBy: userIdOf(user),
    });
    document.status = 'recu';
    document.rejectionReason = undefined;
    document.uploadedBy = userIdOf(user);
    await document.save();
  } catch (err) {
    // Base indisponible : on ne laisse pas un fichier orphelin sur le disque
    await storage.deleteFile(key).catch(() => {});
    throw err;
  }

  await logActivity({
    project: projectId,
    actor: userIdOf(user),
    action: 'document.uploaded',
    before,
    after: {
      document: String(document._id),
      status: document.status,
      versions: document.versions.length,
      fileName: originalName,
      size,
    },
  });

  res.status(201).json({ success: true, data: serializeDocument(document) });
});

// GET /projects/:projectId/documents/:docId/download?version=2
export const downloadDocument = asyncHandler(async (req, res, next) => {
  const user = requireRole(req, DOCUMENT_ROLES);
  const { projectId, docId } = req.params;

  await loadAccessibleProject(user, projectId);
  const document = await findDocument(projectId, docId, user.role);

  const versions = document.versions;
  if (versions.length === 0) {
    throw ApiError.notFound('Aucun fichier déposé pour ce document');
  }

  const requested = Number.parseInt(req.query.version, 10);
  const version = Number.isInteger(requested)
    ? versions.find((item) => item.version === requested)
    : versions[versions.length - 1];
  if (!version) throw ApiError.notFound('Version introuvable');

  // Stockage cloud : lien temporaire signé. Disque local : null, on diffuse
  // le fichier nous-mêmes, derrière les contrôles d'accès ci-dessus.
  const signedUrl = await storage.getSignedUrl(version.storageKey);
  if (signedUrl) {
    return res.json({ success: true, data: { url: signedUrl } });
  }

  const safeName = version.originalName
    .replace(/[^\x20-\x7E]/g, '_')
    .replace(/["\\]/g, '_');

  res.setHeader('Content-Type', version.mimeType);
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(version.originalName)}`
  );
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  const stream = storage.createReadStream(version.storageKey);
  stream.on('error', () => {
    if (!res.headersSent) {
      res.removeHeader('Content-Disposition');
      return next(ApiError.notFound('Fichier introuvable'));
    }
    return res.destroy();
  });
  return stream.pipe(res);
});

// PATCH /projects/:projectId/documents/:docId/status
export const updateDocumentStatus = asyncHandler(async (req, res) => {
  const user = requireRole(req, REVIEWERS);
  const { projectId, docId } = req.params;
  const { status, reason } = req.body;

  const project = await loadAccessibleProject(user, projectId);
  const document = await findDocument(projectId, docId, user.role);

  if (document.versions.length === 0) {
    throw ApiError.conflict("Aucun fichier à examiner : rien n'a encore été déposé");
  }

  const before = {
    document: String(document._id),
    status: document.status,
    rejectionReason: document.rejectionReason ?? null,
  };

  document.status = status;
  document.rejectionReason = status === 'refuse' ? reason : undefined;
  await document.save();

  await logActivity({
    project: projectId,
    actor: userIdOf(user),
    action: 'document.status_changed',
    before,
    after: {
      document: String(document._id),
      status: document.status,
      rejectionReason: document.rejectionReason ?? null,
    },
  });

  if (status === 'valide') {
    await notify({
      user: project.client,
      type: 'document_valide',
      message: `Votre document « ${document.title} » a été validé.`,
      link: `/projects/${projectId}`,
    });
  }

  if (status === 'refuse') {
    await notify({
      user: project.client,
      type: 'document_refuse',
      message: `Votre document « ${document.title} » a été refusé : ${reason}`,
      link: `/projects/${projectId}`,
    });
  }

  res.json({ success: true, data: serializeDocument(document) });
});
