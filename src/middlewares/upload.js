import path from 'node:path';
import multer from 'multer';
import { ApiError } from '../utils/ApiError.js';
import {
  MAX_FILE_SIZE,
  detectFileType,
  fixMulterFilename,
  isAllowedExtension,
  sanitizeFileName,
} from '../utils/fileTypes.js';

const EXTENSIONS_BY_TYPE = {
  pdf: ['.pdf'],
  jpeg: ['.jpg', '.jpeg'],
  png: ['.png'],
  docx: ['.docx'],
};

const parser = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1, fields: 5 },
  fileFilter: (req, file, cb) => {
    const name = fixMulterFilename(file.originalname);
    if (!isAllowedExtension(name)) {
      return cb(ApiError.badRequest('Type de fichier non autorisé (PDF, JPEG, PNG ou DOCX)'));
    }
    return cb(null, true);
  },
}).single('file');

/**
 * Dépôt d'un fichier unique (champ « file »). Après ce middleware :
 * req.upload = { buffer, mimeType, extension, originalName, size }
 */
export const uploadSingle = (req, res, next) => {
  parser(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(ApiError.badRequest('Fichier trop volumineux (10 Mo maximum)'));
        }
        return next(ApiError.badRequest('Dépôt de fichier invalide'));
      }
      return next(err);
    }

    if (!req.file) {
      return next(ApiError.badRequest('Aucun fichier reçu (champ « file »)'));
    }

    const detected = detectFileType(req.file.buffer);
    if (!detected) {
      return next(
        ApiError.badRequest('Contenu non reconnu : PDF, JPEG, PNG ou DOCX uniquement')
      );
    }

    const originalName = fixMulterFilename(req.file.originalname);
    const extension = path.extname(originalName).toLowerCase();
    if (!EXTENSIONS_BY_TYPE[detected.id].includes(extension)) {
      return next(ApiError.badRequest("L'extension du fichier ne correspond pas à son contenu"));
    }

    req.upload = {
      buffer: req.file.buffer,
      mimeType: detected.mimeType,
      extension: detected.extension,
      originalName: sanitizeFileName(originalName),
      size: req.file.size,
    };
    return next();
  });
};
