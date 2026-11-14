import { ApiError } from '../utils/ApiError.js';

export const authorize = (...roles) => {
  const allowedRoles = roles.flat();

  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized());
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden('Rôle insuffisant pour cette action'));
    }

    return next();
  };
};

export default authorize;
