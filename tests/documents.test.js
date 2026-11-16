import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  detectFileType,
  fixMulterFilename,
  isAllowedExtension,
  sanitizeFileName,
} from '../src/utils/fileTypes.js';
import { createLocalStorage } from '../src/config/storage.js';
import {
  canAccessDocument,
  canUploadDocument,
  nextVersionNumber,
  serializeDocument,
  serializeDocuments,
} from '../src/services/document.service.js';

describe('detectFileType', () => {
  it('reconnaît un PDF, un JPEG, un PNG et un DOCX par leur contenu', () => {
    expect(detectFileType(Buffer.from('%PDF-1.7\n...')).id).toBe('pdf');
    expect(detectFileType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10])).id).toBe('jpeg');
    expect(
      detectFileType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])).id
    ).toBe('png');

    const docx = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      Buffer.from('....word/document.xml....'),
    ]);
    expect(detectFileType(docx).id).toBe('docx');
  });

  it('refuse un exécutable, un texte, un ZIP quelconque et un fichier vide', () => {
    expect(detectFileType(Buffer.from('MZ programme'))).toBeNull();
    expect(detectFileType(Buffer.from('<script>alert(1)</script>'))).toBeNull();
    expect(
      detectFileType(Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('archive.txt')]))
    ).toBeNull();
    expect(detectFileType(Buffer.alloc(0))).toBeNull();
    expect(detectFileType(null)).toBeNull();
  });
});

describe('noms et extensions de fichiers', () => {
  it('accepte uniquement pdf, jpg, jpeg, png et docx', () => {
    for (const name of ['a.pdf', 'b.JPG', 'c.jpeg', 'd.png', 'e.docx']) {
      expect(isAllowedExtension(name)).toBe(true);
    }
    for (const name of ['a.exe', 'b.html', 'c.php', 'd', 'e.pdf.exe']) {
      expect(isAllowedExtension(name)).toBe(false);
    }
  });

  it('neutralise les chemins et les caractères dangereux', () => {
    expect(sanitizeFileName('../../etc/passwd')).toBe('passwd');
    expect(sanitizeFileName('<script>.pdf')).toBe('_script_.pdf');
    expect(sanitizeFileName('')).toBe('document');
    expect(sanitizeFileName('Contrat de vente (v2).pdf')).toBe('Contrat de vente (v2).pdf');
  });

  it('remet les accents en UTF-8 après le décodage latin1 de multer', () => {
    expect(fixMulterFilename('Ã©')).toBe('é');
  });
});

describe('stockage local', () => {
  let dir;
  let store;

  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'elikia-'));
    store = createLocalStorage(dir);
  });

  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('enregistre le fichier sous une clé générée, dans le dossier demandé', async () => {
    const { key, size } = await store.saveFile({
      buffer: Buffer.from('abc'),
      folder: 'projects/p1/d1',
      extension: '.pdf',
    });
    expect(key.startsWith('projects/p1/d1/')).toBe(true);
    expect(key.endsWith('.pdf')).toBe(true);
    expect(size).toBe(3);
    expect((await fs.readFile(path.join(dir, key))).toString()).toBe('abc');
  });

  it('refuse un dossier ou une extension qui sortent de la racine', async () => {
    const buffer = Buffer.from('abc');
    await expect(store.saveFile({ buffer, folder: '../evil' })).rejects.toThrow();
    await expect(
      store.saveFile({ buffer, folder: 'projects/p1', extension: '/../x' })
    ).rejects.toThrow();
  });

  it('refuse de supprimer une clé hors de la racine', async () => {
    await expect(store.deleteFile('../secret.txt')).rejects.toThrow();
  });

  it('supprime un fichier, et ne génère jamais de lien signé en local', async () => {
    const { key } = await store.saveFile({ buffer: Buffer.from('abc'), folder: 'p/d' });
    await store.deleteFile(key);
    await expect(fs.access(path.join(dir, key))).rejects.toThrow();
    expect(await store.getSignedUrl(key)).toBeNull();
  });
});

const makeDocument = (overrides = {}) => ({
  _id: '65a000000000000000000010',
  project: '65a000000000000000000003',
  title: 'Passeport',
  category: 'identite',
  status: 'recu',
  versions: [
    {
      version: 1,
      storageKey: 'projects/p1/d1/cle-secrete.pdf',
      originalName: 'passeport.pdf',
      mimeType: 'application/pdf',
      size: 10,
    },
  ],
  ...overrides,
});

describe('règles des documents', () => {
  it('ne laisse jamais sortir la clé de stockage', () => {
    const result = serializeDocument(makeDocument());
    const json = JSON.stringify(result);
    expect(json).not.toContain('storageKey');
    expect(json).not.toContain('cle-secrete');
    expect(result.hasFile).toBe(true);
    expect(result.currentVersion.version).toBe(1);
  });

  it("limite l'accès selon le rôle : finance sans pièces d'identité, partenaire et inconnus exclus", () => {
    const identite = makeDocument();
    const contrat = makeDocument({ category: 'contrat' });

    for (const role of ['admin', 'advisor', 'client']) {
      expect(canAccessDocument(role, identite)).toBe(true);
    }
    expect(canAccessDocument('finance', identite)).toBe(false);
    expect(canAccessDocument('finance', contrat)).toBe(true);
    expect(canAccessDocument('partner', contrat)).toBe(false);
    expect(canAccessDocument(undefined, contrat)).toBe(false);
  });

  it('empêche un client de déposer sur un document validé', () => {
    expect(canUploadDocument('client', makeDocument({ status: 'valide' }))).toBe(false);
    expect(canUploadDocument('client', makeDocument({ status: 'recu' }))).toBe(true);
    expect(canUploadDocument('advisor', makeDocument({ status: 'valide' }))).toBe(true);
  });

  it('numérote les versions sans jamais écraser', () => {
    expect(nextVersionNumber(makeDocument())).toBe(2);
    expect(nextVersionNumber(makeDocument({ versions: [] }))).toBe(1);
  });

  it('filtre la liste pour le rôle finance', () => {
    const list = [makeDocument(), makeDocument({ category: 'contrat' })];
    expect(serializeDocuments(list, 'finance')).toHaveLength(1);
    expect(serializeDocuments(list, 'client')).toHaveLength(2);
  });
});
