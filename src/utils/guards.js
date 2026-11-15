import { ApiError } from './ApiError.js';
import { ROLES } from './constants.js';
import { Project } from '../models/index.js';

// Fermé par défaut : sans utilisateur authentifié, on refuse.
export const requireUser = (req) => {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
};

export const requireRole = (req, roles) => {
  const user = requireUser(req);
  if (!roles.includes(user.role)) throw ApiError.forbidden();
  return user;
};

export const userIdOf = (user) => String(user._id ?? user.id);

/**
 * Garde-fou en plus de projectAccess (partie A) : refuse tout accès évident
 * hors périmètre. Un client ne lit que son projet, un conseiller que les
 * projets qui lui sont affectés. Retourne le projet (client, advisor, title).
 */
export const loadAccessibleProject = async (user, projectId) => {
  const project = await Project.findById(projectId).select('client advisor title');
  if (!project) throw ApiError.notFound('Projet introuvable');

  const uid = userIdOf(user);

  if (user.role === ROLES.CLIENT && String(project.client) !== uid) {
    throw ApiError.forbidden();
  }
  if (user.role === ROLES.ADVISOR && String(project.advisor ?? '') !== uid) {
    throw ApiError.forbidden();
  }
  if (user.role === ROLES.PARTNER) {
    throw ApiError.forbidden();
  }

  return project;
};
