import './helpers/testEnv.js';
import request from 'supertest';
import app from '../src/app.js';
import { Project } from '../src/models/Project.js';
import {
  connectTestDb,
  disconnectTestDb,
  resetTestDb,
  createUser,
  loginAs,
} from './helpers/testDb.js';

const agent = () => request(app);
const api = (token) =>
  token ? { Authorization: `Bearer ${token}` } : {};

const getProject = (token, projectId) =>
  agent().get(`/api/v1/projects/${projectId}`).set(api(token));

describe('projectAccess (HTTP)', () => {
  let clientA;
  let clientB;
  let advisorAssigned;
  let advisorOther;
  let finance;
  let projectA;

  beforeAll(async () => {
    await connectTestDb();
    await resetTestDb();

    clientA = await createUser({ role: 'client' });
    clientB = await createUser({ role: 'client' });
    advisorAssigned = await createUser({ role: 'advisor' });
    advisorOther = await createUser({ role: 'advisor' });
    finance = await createUser({ role: 'finance' });

    projectA = await Project.create({
      title: 'Projet du client A',
      client: clientA._id,
      advisor: advisorAssigned._id,
      category: 'immobilier',
      status: 'actif',
    });
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  test('le client propriétaire accède à son projet', async () => {
    const token = await loginAs(agent(), clientA.email);
    const response = await getProject(token, projectA._id);

    expect(response.status).toBe(200);
    expect(response.body.data.project._id).toBe(projectA._id.toString());
  });

  test('un client ne peut pas voir le projet d’un autre client (404, pas 403)', async () => {
    const token = await loginAs(agent(), clientB.email);
    const response = await getProject(token, projectA._id);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
  });

  test('la liste des projets d’un client ne contient pas ceux des autres', async () => {
    const token = await loginAs(agent(), clientB.email);
    const response = await agent()
      .get('/api/v1/projects')
      .set(api(token));

    expect(response.status).toBe(200);
    const ids = (response.body.data.projects ?? response.body.data.items ?? [])
      .map((project) => project._id ?? project.id);
    expect(ids).not.toContain(projectA._id.toString());
  });

  test('un conseiller n’accède qu’à ses projets', async () => {
    const assignedToken = await loginAs(agent(), advisorAssigned.email);
    const otherToken = await loginAs(agent(), advisorOther.email);

    const own = await getProject(assignedToken, projectA._id);
    expect(own.status).toBe(200);

    const foreign = await getProject(otherToken, projectA._id);
    expect(foreign.status).toBe(404);
  });

  test('la finance a un accès en lecture à tous les projets', async () => {
    const token = await loginAs(agent(), finance.email);
    const response = await getProject(token, projectA._id);

    expect(response.status).toBe(200);
  });

  test('un client ne peut jamais modifier un projet', async () => {
    const token = await loginAs(agent(), clientA.email);

    const update = await agent()
      .patch(`/api/v1/projects/${projectA._id}`)
      .set(api(token))
      .send({ title: 'Tentative de modification' });
    expect(update.status).toBe(403);

    const create = await agent()
      .post('/api/v1/projects')
      .set(api(token))
      .send({ title: 'Nouveau projet', category: 'autre' });
    expect(create.status).toBe(403);
  });

  test('renvoie 404 pour un projet inexistant ou un identifiant invalide', async () => {
    const token = await loginAs(agent(), clientA.email);
    const mongoose = (await import('mongoose')).default;

    const missing = await getProject(
      token,
      new mongoose.Types.ObjectId().toString()
    );
    expect(missing.status).toBe(404);

    const invalid = await getProject(token, 'pas-un-objectid');
    expect(invalid.status).toBe(404);
  });
});
