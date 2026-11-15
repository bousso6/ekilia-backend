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

export const connectTestDb = async () => {
  await mongoose.connect(getTestDatabaseUri());
};

export const disconnectTestDb = async () => {
  await mongoose.disconnect();
};

export const resetTestDb = async () => {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(
    collections.map((collection) => collection.deleteMany({}))
  );
};

let userCounter = 0;

export const createUser = (overrides = {}) => {
  userCounter += 1;
  return User.create({
    firstName: 'Test',
    lastName: `User${userCounter}`,
    email: `test-user-${Date.now()}-${userCounter}@elikia.test`,
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
