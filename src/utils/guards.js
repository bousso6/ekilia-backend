import { ApiError } from './ApiError.js';

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
