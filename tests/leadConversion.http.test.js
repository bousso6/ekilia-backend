import './helpers/testEnv.js';
import request from 'supertest';
import app from '../src/app.js';
import { Lead } from '../src/models/Lead.js';
import { User } from '../src/models/User.js';
import { Project } from '../src/models/Project.js';
import {
  connectTestDb,
  disconnectTestDb,
  resetTestDb,
  createUser,
  loginAs,
} from './helpers/testDb.js';

const agent = () => request(app);
const auth = (token) => ({ Authorization: `Bearer ${token}` });

const validLeadPayload = (email) => ({
  firstName: 'Aminata',
  lastName: 'Ndiaye',
  email,
  phone: '+221770001122',
  country: 'France',
  city: 'Lyon',
  projectCategory: 'immobilier',
  projectLocation: 'Almadies, Dakar',
  projectTitle: 'Achat appartement Almadies',
  horizon: '0_3_mois',
  budget: { amount: 50000000, currency: 'XOF' },
  progress: 'preparation',
  needs: ['conseil', 'mise_en_relation'],
  obstacles: ['distance', 'confiance'],
  consent: { accepted: true },
  source: 'diagnostic',
});

describe('Leads et conversion (HTTP)', () => {
  let adminToken;
  let clientToken;
  let lead;

  beforeAll(async () => {
    await connectTestDb();
    await resetTestDb();

    const admin = await createUser({ role: 'admin' });
    const client = await createUser({ role: 'client' });

    adminToken = await loginAs(agent(), admin.email);
    clientToken = await loginAs(agent(), client.email);
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  describe('POST /leads (public)', () => {
    test('enregistre un lead avec score et consentement', async () => {
      const response = await agent()
        .post('/api/v1/leads')
        .send(validLeadPayload(`lead-${Date.now()}@elikia.test`));

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.lead.status).toBe('nouveau');
      expect(response.body.data.lead.score).toBeGreaterThan(0);
      expect(response.body.data.lead.statusHistory).toHaveLength(1);

      lead = await Lead.findById(response.body.data.lead._id);
      expect(lead.consent.accepted).toBe(true);
    });

    test('refuse un lead sans consentement', async () => {
      const payload = validLeadPayload(`noconsent-${Date.now()}@elikia.test`);
      payload.consent = { accepted: false };

      const response = await agent().post('/api/v1/leads').send(payload);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /admin/leads', () => {
    test('exige une authentification', async () => {
      const response = await agent().get('/api/v1/admin/leads');
      expect(response.status).toBe(401);
    });

    test('interdit aux clients', async () => {
      const response = await agent()
        .get('/api/v1/admin/leads')
        .set(auth(clientToken));
      expect(response.status).toBe(403);
    });

    test('autorisé aux admins et advisors', async () => {
      const response = await agent()
        .get('/api/v1/admin/leads')
        .set(auth(adminToken));
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /admin/leads/:id/convert', () => {
    test('crée le compte client et le projet sans ressaisie', async () => {
      const email = `convert-${Date.now()}@elikia.test`;
      const created = await agent()
        .post('/api/v1/leads')
        .send(validLeadPayload(email));
      const leadId = created.body.data.lead._id;

      await agent()
        .patch(`/api/v1/admin/leads/${leadId}`)
        .set(auth(adminToken))
        .send({ status: 'proposition_envoyee' });

      const response = await agent()
        .post(`/api/v1/admin/leads/${leadId}/convert`)
        .set(auth(adminToken));

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      const { lead: updatedLead, client, project } = response.body.data;
      expect(updatedLead.status).toBe('converti');
      expect(updatedLead.statusHistory.map(({ status }) => status)).toEqual([
        'nouveau',
        'proposition_envoyee',
        'converti',
      ]);
      expect(updatedLead.convertedTo.project).toBe(project._id);
      expect(project.client).toBe(client._id);
      expect(project.sourceLead).toBe(leadId);
      expect(project.title).toBe('Achat appartement Almadies');
      expect(project.location).toBe('Almadies, Dakar');
      expect(project.status).toBe('actif');

      const clientUser = await User.findById(client._id).select('+password');
      expect(clientUser.role).toBe('client');
      expect(clientUser.email).toBe(email);
      expect(clientUser.password).toMatch(/^\$2[aby]\$/);

      const projectDoc = await Project.findById(project._id);
      expect(projectDoc.sourceLead.toString()).toBe(leadId);
    });

    test('refuse une seconde conversion du même lead', async () => {
      const created = await agent()
        .post('/api/v1/leads')
        .send(validLeadPayload(`double-${Date.now()}@elikia.test`));
      const leadId = created.body.data.lead._id;

      await agent()
        .patch(`/api/v1/admin/leads/${leadId}`)
        .set(auth(adminToken))
        .send({ status: 'proposition_envoyee' });

      await agent()
        .post(`/api/v1/admin/leads/${leadId}/convert`)
        .set(auth(adminToken));

      const second = await agent()
        .post(`/api/v1/admin/leads/${leadId}/convert`)
        .set(auth(adminToken));

      expect(second.status).toBe(409);
      expect(second.body.success).toBe(false);
    });

    test('refuse de convertir une demande avant envoi de la proposition', async () => {
      const created = await agent()
        .post('/api/v1/leads')
        .send(validLeadPayload(`not-ready-${Date.now()}@elikia.test`));
      const response = await agent()
        .post(`/api/v1/admin/leads/${created.body.data.lead._id}/convert`)
        .set(auth(adminToken));

      expect(response.status).toBe(409);
      expect(response.body.message).toMatch(/proposition doit être envoyée/i);
    });

    test('interdit la conversion à un client', async () => {
      const response = await agent()
        .post(`/api/v1/admin/leads/${lead?._id ?? '0'.repeat(24)}/convert`)
        .set(auth(clientToken));

      expect(response.status).toBe(403);
    });
  });
});
