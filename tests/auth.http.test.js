import './helpers/testEnv.js';
import request from 'supertest';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import {
  connectTestDb,
  disconnectTestDb,
  resetTestDb,
  createUser,
  loginAs,
  TEST_PASSWORD,
} from './helpers/testDb.js';

const agent = () => request(app);

describe('Authentification (HTTP)', () => {
  beforeAll(async () => {
    await connectTestDb();
    await resetTestDb();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  describe('POST /auth/register', () => {
    test('crée un compte client et ignore le rôle demandé', async () => {
      const email = `register-${Date.now()}@elikia.test`;

      const response = await agent().post('/api/v1/auth/register').send({
        firstName: 'Nouveau',
        lastName: 'Membre',
        email,
        password: 'Motdepasse@2026',
        consent: true,
        role: 'admin',
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      const user = await User.findOne({ email });
      expect(user).not.toBeNull();
      expect(user.role).toBe('client');
      expect(user.password).not.toBe('Motdepasse@2026');
    });

    test('exige le consentement', async () => {
      const response = await agent().post('/api/v1/auth/register').send({
        firstName: 'Sans',
        lastName: 'Consentement',
        email: `noconsent-${Date.now()}@elikia.test`,
        password: 'Motdepasse@2026',
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    test('refuse un mot de passe de moins de 8 caractères', async () => {
      const response = await agent().post('/api/v1/auth/register').send({
        firstName: 'Mot',
        lastName: 'Passe',
        email: `weak-${Date.now()}@elikia.test`,
        password: 'court',
        consent: true,
      });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /auth/login', () => {
    let client;

    beforeAll(async () => {
      client = await createUser({ email: `login-${Date.now()}@elikia.test` });
    });

    test('retourne un access token et un refresh token', async () => {
      const response = await agent().post('/api/v1/auth/login').send({
        email: client.email,
        password: TEST_PASSWORD,
      });

      expect(response.status).toBe(200);
      expect(response.body.data.tokens.accessToken).toEqual(expect.any(String));
      expect(response.body.data.tokens.refreshToken).toEqual(expect.any(String));
      expect(response.body.data.user.password).toBeUndefined();
    });

    test('renvoie le même message pour email inconnu et mauvais mot de passe', async () => {
      const unknown = await agent().post('/api/v1/auth/login').send({
        email: `inconnu-${Date.now()}@elikia.test`,
        password: 'Peuimporte@1',
      });

      const wrongPassword = await agent().post('/api/v1/auth/login').send({
        email: client.email,
        password: 'Mauvais@2026',
      });

      expect(unknown.status).toBe(401);
      expect(wrongPassword.status).toBe(401);
      expect(unknown.body.message).toBe(wrongPassword.body.message);
    });
  });

  describe('GET /auth/me et authorize', () => {
    test('retourne le profil sans mot de passe', async () => {
      const user = await createUser();
      const token = await loginAs(agent(), user.email);

      const response = await agent()
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(200);
      expect(response.body.data.user.email).toBe(user.email);
      expect(response.body.data.user.password).toBeUndefined();
    });

    test('refuse sans jeton', async () => {
      const response = await agent().get('/api/v1/auth/me');
      expect(response.status).toBe(401);
    });

    test('renvoie 403 pour un client sur une route admin et 200 pour un admin', async () => {
      const client = await createUser({ role: 'client' });
      const admin = await createUser({ role: 'admin' });

      const clientToken = await loginAs(agent(), client.email);
      const adminToken = await loginAs(agent(), admin.email);

      const forbidden = await agent()
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${clientToken}`);
      expect(forbidden.status).toBe(403);

      const allowed = await agent()
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(allowed.status).toBe(200);
      expect(allowed.body.success).toBe(true);
    });
  });

  describe('POST /auth/refresh et /auth/logout', () => {
    test('échange un refresh token contre un nouvel access token', async () => {
      const user = await createUser();

      const login = await agent().post('/api/v1/auth/login').send({
        email: user.email,
        password: TEST_PASSWORD,
      });
      const { refreshToken } = login.body.data.tokens;

      const refreshed = await agent()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(refreshed.status).toBe(200);
      expect(refreshed.body.data.tokens.accessToken).toEqual(expect.any(String));

      const me = await agent()
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${refreshed.body.data.tokens.accessToken}`);
      expect(me.status).toBe(200);
      expect(me.body.data.user._id).toBe(user._id.toString());
    });

    test('refuse un refresh token invalide', async () => {
      const response = await agent()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'jeton-totalement-invalide' });

      expect(response.status).toBe(401);
    });

    test('la déconnexion invalide le refresh token', async () => {
      const user = await createUser();

      const login = await agent().post('/api/v1/auth/login').send({
        email: user.email,
        password: TEST_PASSWORD,
      });
      const { accessToken, refreshToken } = login.body.data.tokens;

      const logout = await agent()
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);
      expect(logout.status).toBe(200);

      const refreshed = await agent()
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });
      expect(refreshed.status).toBe(401);
    });
  });

  describe('POST /auth/forgot-password', () => {
    test('répond de la même façon que l’email existe ou non', async () => {
      const user = await createUser();

      const known = await agent()
        .post('/api/v1/auth/forgot-password')
        .send({ email: user.email });
      const unknown = await agent()
        .post('/api/v1/auth/forgot-password')
        .send({ email: `inconnu-${Date.now()}@elikia.test` });

      expect(known.status).toBe(200);
      expect(unknown.status).toBe(200);
      expect(known.body.message).toBe(unknown.body.message);
    });
  });
});
