import { ZodError } from 'zod';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

const normalizeError = (err) => {
  if (err instanceof ApiError) return err;

  if (err instanceof ZodError) {
    return new ApiError(
      400,
      'Données invalides',
      err.issues.map((i) => ({ champ: i.path.join('.'), message: i.message }))
    );
  }

  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({
      champ: e.path,
      message: e.message,
    }));
    return new ApiError(400, 'Données invalides', details);
  }

  if (err.name === 'CastError') {
    return new ApiError(400, `Identifiant invalide : ${err.value}`);
  }

  if (err.code === 11000) {
    const champ = Object.keys(err.keyValue || {})[0];
    return new ApiError(409, `Cette valeur existe déjà pour le champ « ${champ} »`);
  }

  if (err.name === 'JsonWebTokenError') {
    return new ApiError(401, 'Jeton invalide');
  }

  if (err.name === 'TokenExpiredError') {
    return new ApiError(401, 'Jeton expiré');
  }

  return err;
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  const error = normalizeError(err);
  const statusCode = error.statusCode || 500;

  if (statusCode >= 500) {
    logger.error({ err }, 'Erreur serveur');
  }

  res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 && env.NODE_ENV === 'production'
      ? 'Erreur interne du serveur'
      : error.message,
    ...(error.details && { details: error.details }),
    ...(env.NODE_ENV === 'development' && statusCode >= 500 && { stack: err.stack }),
  });
};