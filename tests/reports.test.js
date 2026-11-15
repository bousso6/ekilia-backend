import { describe, it, expect, jest, afterEach } from '@jest/globals';
import { toCsvBufferString } from '../src/utils/csv.js';
import { exportClientsReport, exportBudgetsReport } from '../src/controllers/report.controller.js';
import { User } from '../src/models/index.js';
import { ROLES } from '../src/utils/constants.js';

function createMockRes() {
  const headers = {};
  return {
    statusCode: 200,
    body: null,
    headers,
    setHeader(k, v) {
      headers[k] = v;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(payload) {
      this.body = payload;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

describe('B5 — Reporting CSV', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('toCsvBufferString() ajoute le BOM UTF-8 et conserve les accents', () => {
    const csv = toCsvBufferString(
      [{ name: 'Aïssatou Diallo', city: 'Thiès / Sénégal', active: true }],
      [
        { key: 'name', header: 'Nom complet' },
        { key: 'city', header: 'Localisation Sénégal' },
        { key: 'active', header: 'Compte actif' },
      ]
    );

    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('Nom complet;Localisation Sénégal;Compte actif');
    expect(csv).toContain('Aïssatou Diallo;Thiès / Sénégal;oui');
  });

  it("exportClientsReport() refuse un rôle non-admin (finance -> 403)", async () => {
    const req = { user: { _id: '1', role: ROLES.FINANCE }, query: { format: 'csv' } };
    const res = createMockRes();
    const next = jest.fn();

    await exportClientsReport(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].statusCode).toBe(403);
  });

  it("exportBudgetsReport() refuse un client (403) et un visiteur (401)", async () => {
    const nextAnon = jest.fn();
    await exportBudgetsReport({ query: { format: 'csv' } }, createMockRes(), nextAnon);
    expect(nextAnon.mock.calls[0][0].statusCode).toBe(401);

    const nextClient = jest.fn();
    await exportBudgetsReport(
      { user: { _id: '1', role: ROLES.CLIENT }, query: { format: 'csv' } },
      createMockRes(),
      nextClient
    );
    expect(nextClient.mock.calls[0][0].statusCode).toBe(403);
  });

  it("exportClientsReport() n'exporte jamais password ni refreshTokenHash", async () => {
    jest.spyOn(User, 'find').mockReturnValueOnce({
      select: () => ({
        sort: () => ({
          lean: async () => [
            {
              _id: '507f1f77bcf86cd799439011',
              firstName: 'Moussa',
              lastName: 'Ndiaye',
              email: 'moussa@exemple.fr',
              phone: '+33600000000',
              countryOfResidence: 'France',
              cityOfResidence: 'Lyon',
              consent: { accepted: true },
              isActive: true,
              password: '$2a$12$SECRET_HASH_SHOULD_NEVER_APPEAR',
              refreshTokenHash: 'SECRET_TOKEN',
              createdAt: new Date('2026-11-10T10:00:00Z'),
            },
          ],
        }),
      }),
    });

    const req = { user: { _id: 'admin1', role: ROLES.ADMIN }, query: { format: 'csv' } };
    const res = createMockRes();
    const next = jest.fn();

    await exportClientsReport(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(200);
    expect(res.headers['Content-Type']).toContain('text/csv; charset=utf-8');
    expect(res.body.startsWith('\uFEFF')).toBe(true);
    expect(res.body).toContain('Moussa');
    expect(res.body).not.toContain('SECRET_HASH_SHOULD_NEVER_APPEAR');
    expect(res.body).not.toContain('SECRET_TOKEN');
  });
});
