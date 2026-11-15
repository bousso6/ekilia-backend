import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const SAFE_FOLDER = /^[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*$/;
const SAFE_EXTENSION = /^(\.[a-z0-9]{1,8})?$/;

/**
 * Interface de stockage : saveFile, getSignedUrl, deleteFile, createReadStream.
 * Adaptateur disque local, pour le développement uniquement.
 * En production, remplacer par un adaptateur S3 ou Cloudinary qui expose
 * la même interface (les contrôleurs n'auront pas à changer).
 */
export const createLocalStorage = (baseDir) => {
  const root = path.resolve(baseDir);

  const resolveKey = (key) => {
    if (typeof key !== 'string' || key.length === 0) {
      throw new Error('Clé de stockage invalide');
    }
    const target = path.resolve(root, key);
    if (!target.startsWith(root + path.sep)) {
      throw new Error('Clé de stockage invalide');
    }
    return target;
  };

  return {
    provider: 'local',

    async saveFile({ buffer, folder, extension = '' }) {
      if (!Buffer.isBuffer(buffer)) throw new Error('Contenu de fichier invalide');
      if (!SAFE_FOLDER.test(folder ?? '')) throw new Error('Dossier de stockage invalide');
      if (!SAFE_EXTENSION.test(extension)) throw new Error('Extension invalide');

      const key = `${folder}/${crypto.randomUUID()}${extension}`;
      const target = resolveKey(key);

      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, buffer, { flag: 'wx' });

      return { key, size: buffer.length };
    },

    async deleteFile(key) {
      await fs.rm(resolveKey(key), { force: true });
    },

    // Disque local : pas de lien signé, le fichier est servi par une route protégée
    async getSignedUrl() {
      return null;
    },

    createReadStream(key) {
      return createReadStream(resolveKey(key));
    },
  };
};

export const storage = createLocalStorage(process.env.UPLOAD_DIR || 'uploads');
