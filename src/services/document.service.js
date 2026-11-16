import { ROLES } from '../utils/constants.js';

// Le rôle finance n'a pas accès aux pièces d'identité
export const FINANCE_HIDDEN_CATEGORIES = ['identite'];

const ACCESS_ROLES = [ROLES.ADMIN, ROLES.ADVISOR, ROLES.CLIENT, ROLES.FINANCE];
const UPLOAD_ROLES = [ROLES.ADMIN, ROLES.ADVISOR, ROLES.CLIENT, ROLES.FINANCE];

const toPlain = (doc) =>
  doc && typeof doc.toObject === 'function' ? doc.toObject() : doc;

const idOf = (value) => (value ? String(value._id ?? value) : null);

/** Qui a le droit de voir (et télécharger) ce document ? Fermé par défaut. */
export const canAccessDocument = (viewerRole, document) => {
  if (!ACCESS_ROLES.includes(viewerRole)) return false;
  const category = toPlain(document)?.category;
  if (viewerRole === ROLES.FINANCE) return !FINANCE_HIDDEN_CATEGORIES.includes(category);
  return true;
};

/**
 * Qui peut déposer un fichier ? Un client dépose seulement : il ne peut plus
 * rien déposer sur un document déjà validé.
 */
export const canUploadDocument = (viewerRole, document) => {
  if (!UPLOAD_ROLES.includes(viewerRole)) return false;
  if (!canAccessDocument(viewerRole, document)) return false;
  if (viewerRole === ROLES.CLIENT && toPlain(document)?.status === 'valide') return false;
  return true;
};

export const nextVersionNumber = (document) => {
  const versions = toPlain(document)?.versions ?? [];
  return versions.reduce((max, v) => Math.max(max, v.version ?? 0), 0) + 1;
};

// Liste blanche : la clé de stockage (storageKey) ne sort jamais de l'API
const serializeVersion = (version) => ({
  version: version.version,
  originalName: version.originalName,
  mimeType: version.mimeType,
  size: version.size,
  uploadedAt: version.uploadedAt,
  uploadedBy: idOf(version.uploadedBy),
});

export const serializeDocument = (document) => {
  const d = toPlain(document);
  if (!d) return null;

  const versions = (d.versions ?? []).map(serializeVersion);

  return {
    id: idOf(d._id),
    project: idOf(d.project),
    title: d.title,
    category: d.category,
    status: d.status,
    dueDate: d.dueDate ?? null,
    requestedBy: idOf(d.requestedBy),
    uploadedBy: idOf(d.uploadedBy),
    rejectionReason: d.rejectionReason ?? null,
    hasFile: versions.length > 0,
    currentVersion: versions.length > 0 ? versions[versions.length - 1] : null,
    versions,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
};

export const serializeDocuments = (list, viewerRole) =>
  list
    .filter((document) => canAccessDocument(viewerRole, document))
    .map((document) => serializeDocument(document));
