import mongoose from 'mongoose';

export const hasTestDb = Boolean(process.env.MONGODB_URI_TEST);

export async function connectTestDb() {
  if (!process.env.MONGODB_URI_TEST) {
    return false;
  }
  if (!process.env.MONGODB_URI_TEST.includes('elikia_test')) {
    throw new Error('Sécurité tests : MONGODB_URI_TEST doit pointer vers la base elikia_test');
  }
  await mongoose.connect(process.env.MONGODB_URI_TEST);
  return true;
}

export async function clearTestDb() {
  if (mongoose.connection.readyState !== 1) return;
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((col) => col.deleteMany({})));
}

export async function disconnectTestDb() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}
