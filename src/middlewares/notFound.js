import { ApiError } from '../utils/ApiError.js';

export const notFound = (req, res, next) => {
  next(ApiError.notFound(`Route introuvable : ${req.method} ${req.originalUrl}`));
};