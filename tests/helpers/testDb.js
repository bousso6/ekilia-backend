import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { env } from '../../src/config/env.js';
import { User } from '../../src/models/User.js';

export const TEST_DB_NAME = 'elikia_test';
export const TEST_PASSWORD = 'ElikiaTest@2026';

// Utilise MONGODB_URI_TEST si définie, sinon dérive elikia_test de MONGODB_URI
// pour ne jamais écrire dans la base partagée.
export const getTestDatabaseUri = () => {
  if (process.env.MONGODB_URI_TEST) {
    return process.env.MONGODB_URI_TEST;
  }

  const match = env.MONGODB_URI.match(
    /^(mongodb(?:\+srv)?:\/\/[^/?]+)(?:\/[^?]*)?(\?.*)?$/
  );

  if (!match) {
    throw new Error(`MONGODB_URI invalide pour les tests : ${env.MONGODB_URI}`);
  }

  return `${match[1]}/${TEST_DB_NAME}${match[2] ?? ''}`;
};

// true si une base de test est utilisable (MONGODB_URI_TEST ou MONGODB_URI)
export const hasTestDb = Boolean(
  process.env.MONGODB_URI_TEST || env.MONGODB_URI
);

export async function connectTestDb() {
  const uri = getTestDatabaseUri();

  if (!uri.includes(TEST_DB_NAME)) {
    throw new Error(
      `Sécurité tests : l'URI de test doit pointer vers la base ${TEST_DB_NAME}`
    );
  }

  await mongoose.connect(uri);
  return true;
}

export async function clearTestDb() {
  if (mongoose.connection.readyState !== 1) return;
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((col) => col.deleteMany({})));
}

// Alias conservé pour les tests existants
export const resetTestDb = clearTestDb;

export async function disconnectTestDb() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

let userCounter = 0;

export const createUser = (overrides = {}) => {
  userCounter += 1;
  return User.create({
    firstName: 'Test',
    lastName: `User${userCounter}`,
    // UUID : plusieurs suites Jest tournent en parallèle sur la même base,
    // Date.now() + compteur peuvent donc entrer en collision entre processus.
    email: `test-user-${randomUUID()}@elikia.test`,
    password: TEST_PASSWORD,
    role: 'client',
    isEmailVerified: true,
    consent: { accepted: true, acceptedAt: new Date() },
    ...overrides,
  });
};

export const loginAs = async (agent, email, password = TEST_PASSWORD) => {
  const response = await agent
    .post('/api/v1/auth/login')
    .send({ email, password });

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);

  return response.body.data.tokens.accessToken;
};