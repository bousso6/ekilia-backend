import { describe, it, expect, jest, afterEach } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import app from '../src/app.js';
import routes from '../src/routes/index.js';
import { errorHandler } from '../src/middlewares/errorHandler.js';
import { notFound } from '../src/middlewares/notFound.js';
import { Budget, Expense, PartnerAssignment, Project, User } from '../src/models/index.js';
import { ROLES } from '../src/utils/constants.js';

const CLIENT_A = '507f1f77bcf86cd799439011';
const CLIENT_B = '507f1f77bcf86cd799439012';
const ADMIN_ID = '507f1f77bcf86cd799439013';
const FINANCE_ID = '507f1f77bcf86cd799439014';
const ADVISOR_ID = '507f1f77bcf86cd799439015';
const PROJECT_A = '507f1f77bcf86cd799439021';
const PROJECT_B = '507f1f77bcf86cd799439022';
const DOC_ID = '507f1f77bcf86cd799439031';

// App de test injectant req.user via le header x-test-user (en attendant les middlewares auth de la partie A)
const testApp = express();
testApp.use(express.json());
testApp.use((req, _res, next) => {
  const header = req.header('x-test-user');
  if (header) {
    req.user = JSON.parse(header);
  }
  next();
});
testApp.use('/api/v1', routes);
testApp.use(notFound);
testApp.use(errorHandler);

describe('B6 — Tests HTTP Supertest (Partie B)', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('GET /api/v1/health répond 200', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('refuse (401) toutes les routes protégées sans utilisateur connecté', async () => {
    const protectedEndpoints = [
      ['get', '/api/v1/admin/partners'],
      ['get', '/api/v1/admin/reports/clients'],
      ['get', '/api/v1/notifications'],
      ['get', `/api/v1/projects/${PROJECT_A}/partners`],
      ['get', `/api/v1/projects/${PROJECT_A}/budget`],
      ['get', `/api/v1/projects/${PROJECT_A}/documents`],
      ['get', `/api/v1/projects/${PROJECT_A}/activity`],
    ];

    for (const [method, url] of protectedEndpoints) {
      const res = await request(app)[method](url);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    }
  });

  it('B1 : masque nom, contacts et notes internes dun partenaire non révélé pour un client', async () => {
    jest.spyOn(Project, 'findById').mockReturnValueOnce({
      select: async () => ({
        _id: PROJECT_A,
        client: CLIENT_A,
        advisor: ADVISOR_ID,
        title: 'Projet A',
      }),
    });

    jest.spyOn(PartnerAssignment, 'find').mockReturnValueOnce({
      sort: () => ({
        populate: async () => [
          {
            _id: '507f1f77bcf86cd799439041',
            project: PROJECT_A,
            role: 'Audit foncier',
            status: 'propose',
            contactRevealed: false,
            partner: {
              _id: '507f1f77bcf86cd799439042',
              name: 'Me Ndèye Sy',
              category: 'notaire',
              verificationStatus: 'verifie',
              contacts: {
                phone: '+221 33 821 44 90',
                email: 'etude.sy@notaires-dakar.sn',
                address: 'Dakar Plateau',
              },
              internalNotes: 'Note confidentielle Elikia',
            },
          },
        ],
      }),
    });

    const res = await request(testApp)
      .get(`/api/v1/projects/${PROJECT_A}/partners`)
      .set('x-test-user', JSON.stringify({ _id: CLIENT_A, role: ROLES.CLIENT }));

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const bodyText = JSON.stringify(res.body.data);
    expect(bodyText).not.toContain('Me Ndèye Sy');
    expect(bodyText).not.toContain('+221 33 821 44 90');
    expect(bodyText).not.toContain('etude.sy@notaires-dakar.sn');
    expect(bodyText).not.toContain('Note confidentielle Elikia');
  });

  it('B1 : interdit /admin/partners à un client (403 - pas dannuaire ouvert)', async () => {
    const res = await request(testApp)
      .get('/api/v1/admin/partners')
      .set('x-test-user', JSON.stringify({ _id: CLIENT_A, role: ROLES.CLIENT }));

    expect(res.status).toBe(403);
  });

  it('B2 : calcule le résumé budgétaire et masque les révisions au client', async () => {
    jest.spyOn(Project, 'findById').mockReturnValueOnce({
      select: async () => ({
        _id: PROJECT_A,
        client: CLIENT_A,
        advisor: ADVISOR_ID,
        title: 'Projet A',
      }),
    });

    jest.spyOn(Budget, 'findOne').mockResolvedValueOnce({
      _id: '507f1f77bcf86cd799439051',
      project: PROJECT_A,
      initialAmount: 10000000,
      revisedAmount: 12000000,
      currency: 'XOF',
      revisions: [
        {
          previousAmount: 10000000,
          newAmount: 12000000,
          reason: 'Raison interne révision',
        },
      ],
    });

    jest.spyOn(Expense, 'find').mockReturnValueOnce({
      select: () => ({
        lean: async () => [
          { amount: 2500000, status: 'engage' },
          { amount: 1500000, status: 'paye' },
          { amount: 500000, status: 'prevu' },
        ],
      }),
    });

    const res = await request(testApp)
      .get(`/api/v1/projects/${PROJECT_A}/budget`)
      .set('x-test-user', JSON.stringify({ _id: CLIENT_A, role: ROLES.CLIENT }));

    expect(res.status).toBe(200);
    expect(res.body.data.summary).toMatchObject({
      referenceAmount: 12000000,
      committedAmount: 4000000,
      paidAmount: 1500000,
      balance: 8000000,
    });
    expect(JSON.stringify(res.body.data)).not.toContain('Raison interne révision');
  });

  it('B3 : empêche un client de télécharger un document appartenant à un autre client (403)', async () => {
    jest.spyOn(Project, 'findById').mockReturnValueOnce({
      select: async () => ({
        _id: PROJECT_B,
        client: CLIENT_B,
        advisor: ADVISOR_ID,
        title: 'Projet de Client B',
      }),
    });

    const res = await request(testApp)
      .get(`/api/v1/projects/${PROJECT_B}/documents/${DOC_ID}/download`)
      .set('x-test-user', JSON.stringify({ _id: CLIENT_A, role: ROLES.CLIENT }));

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('B4 : valide :id sur notifications (400) et garde le journal en lecture seule (404)', async () => {
    const badIdRes = await request(testApp)
      .patch('/api/v1/notifications/id-invalide/read')
      .set('x-test-user', JSON.stringify({ _id: CLIENT_A, role: ROLES.CLIENT }));

    expect(badIdRes.status).toBe(400);

    const writeLogRes = await request(testApp)
      .post(`/api/v1/projects/${PROJECT_A}/activity`)
      .set('x-test-user', JSON.stringify({ _id: ADMIN_ID, role: ROLES.ADMIN }))
      .send({ action: 'hack' });

    expect(writeLogRes.status).toBe(404);
  });

  it('B5 : exporte les clients en CSV UTF-8 BOM pour admin et refuse finance (403)', async () => {
    const denied = await request(testApp)
      .get('/api/v1/admin/reports/clients?format=csv')
      .set('x-test-user', JSON.stringify({ _id: FINANCE_ID, role: ROLES.FINANCE }));

    expect(denied.status).toBe(403);

    jest.spyOn(User, 'find').mockReturnValueOnce({
      select: () => ({
        sort: () => ({
          lean: async () => [
            {
              _id: CLIENT_A,
              firstName: 'Aïssatou',
              lastName: 'Diallo',
              email: 'aissatou@exemple.fr',
              phone: '+33600000001',
              countryOfResidence: 'France',
              cityOfResidence: 'Paris',
              consent: { accepted: true },
              isActive: true,
              createdAt: new Date('2026-11-10T10:00:00Z'),
            },
          ],
        }),
      }),
    });

    const okRes = await request(testApp)
      .get('/api/v1/admin/reports/clients?format=csv')
      .set('x-test-user', JSON.stringify({ _id: ADMIN_ID, role: ROLES.ADMIN }));

    expect(okRes.status).toBe(200);
    expect(okRes.headers['content-type']).toContain('text/csv');
    expect(okRes.text.startsWith('\uFEFF')).toBe(true);
    expect(okRes.text).toContain('Aïssatou');
  });
});
