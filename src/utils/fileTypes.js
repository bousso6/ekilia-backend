import path from 'node:path';

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo

const startsWith = (buffer, bytes) =>
  buffer.length >= bytes.length && bytes.every((byte, i) => buffer[i] === byte);

// Le type est déterminé par le CONTENU du fichier, jamais par son nom
// ni par le type annoncé par le navigateur.
export const FILE_TYPES = [
  {
    id: 'pdf',
    mimeType: 'application/pdf',
    extension: '.pdf',
    matches: (buffer) => startsWith(buffer, [0x25, 0x50, 0x44, 0x46, 0x2d]),
  },
  {
    id: 'jpeg',
    mimeType: 'image/jpeg',
    extension: '.jpg',
    matches: (buffer) => startsWith(buffer, [0xff, 0xd8, 0xff]),
  },
  {
    id: 'png',
    mimeType: 'image/png',
    extension: '.png',
    matches: (buffer) =>
      startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  {
    id: 'docx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    extension: '.docx',
    // Archive ZIP contenant un dossier « word/ » (exclut les autres ZIP)
    matches: (buffer) =>
      startsWith(buffer, [0x50, 0x4b, 0x03, 0x04]) && buffer.includes('word/'),
  },
];

export const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png', '.docx'];

export const detectFileType = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return null;
  const type = FILE_TYPES.find((candidate) => candidate.matches(buffer));
  return type
    ? { id: type.id, mimeType: type.mimeType, extension: type.extension }
    : null;
};

export const isAllowedExtension = (fileName = '') =>
  ALLOWED_EXTENSIONS.includes(path.extname(String(fileName)).toLowerCase());

// multer 1.x décode les noms de fichiers en latin1 : on les remet en UTF-8
export const fixMulterFilename = (name = '') =>
  Buffer.from(String(name), 'latin1').toString('utf8');

// Nom affiché uniquement : jamais utilisé comme chemin de stockage
export const sanitizeFileName = (name = '') => {
  const base = path.basename(String(name).replace(/\\/g, '/'));
  const cleaned = base
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}._() -]/gu, '_')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+/, '')
    .trim()
    .slice(0, 120);
  return cleaned || 'document';
};
