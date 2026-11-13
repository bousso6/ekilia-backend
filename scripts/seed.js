import { connectDB, disconnectDB } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { Project } from '../src/models/Project.js';
import { ROLES } from '../src/utils/constants.js';

const SEED_PASSWORD = process.env.SEED_PASSWORD || 'Elikia@2026!';

const SEED_USERS = [
  {
    firstName: 'Admin',
    lastName: 'Elikia',
    email: 'admin@elikia.test',
    role: ROLES.ADMIN,
    phone: '+221770000001',
    countryOfResidence: 'Sénégal',
    cityOfResidence: 'Dakar',
  },
  {
    firstName: 'Conseiller',
    lastName: 'Elikia',
    email: 'conseiller@elikia.test',
    role: ROLES.ADVISOR,
    phone: '+221770000002',
    countryOfResidence: 'Sénégal',
    cityOfResidence: 'Thiès',
  },
  {
    firstName: 'Finance',
    lastName: 'Elikia',
    email: 'finance@elikia.test',
    role: ROLES.FINANCE,
    phone: '+221770000003',
    countryOfResidence: 'Sénégal',
    cityOfResidence: 'Dakar',
  },
  {
    firstName: 'Awa',
    lastName: 'Diop',
    email: 'client@elikia.test',
    role: ROLES.CLIENT,
    phone: '+33600000004',
    countryOfResidence: 'France',
    cityOfResidence: 'Paris',
  },
];

const log = (message) => console.log(message);

const upsertUser = async (data) => {
  const existing = await User.findOne({ email: data.email });
  if (existing) {
    log(`  = ${data.email} existe déjà (${data.role})`);
    return existing;
  }

  const user = new User({
    ...data,
    password: SEED_PASSWORD,
    consent: { accepted: true, acceptedAt: new Date() },
  });
  await user.save(); // save() déclenche le hachage du mot de passe
  log(`  + ${data.email} créé (${data.role})`);
  return user;
};

const seedDemoProject = async (client, advisor) => {
  const title = 'Création de mon entreprise à Dakar (démo)';

  const existing = await Project.findOne({ title, client: client._id });
  if (existing) {
    log(`  = Projet de démonstration existe déjà`);
    return existing;
  }

  const dueDate = new Date();
  dueDate.setMonth(dueDate.getMonth() + 6);

  const project = await Project.create({
    title,
    description: 'Projet de démonstration pour tester le parcours client.',
    client: client._id,
    advisor: advisor._id,
    category: 'entrepreneuriat',
    status: 'actif',
    priority: 'normale',
    location: 'Dakar',
    startDate: new Date(),
    dueDate,
    progress: { value: 0, mode: 'auto' },
    nextAction: {
      label: 'Envoyer la pièce d\'identité',
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      owner: 'client',
    },
  });

  log(`  + Projet de démonstration créé`);
  return project;
};

const resetSeedData = async () => {
  const emails = SEED_USERS.map((u) => u.email);
  const users = await User.find({ email: { $in: emails } }).select('_id');
  const ids = users.map((u) => u._id);

  const projects = await Project.deleteMany({ client: { $in: ids } });
  const removed = await User.deleteMany({ _id: { $in: ids } });

  log(`  - ${projects.deletedCount} projet(s) supprimé(s)`);
  log(`  - ${removed.deletedCount} utilisateur(s) supprimé(s)`);
};

const run = async () => {
  if (env.NODE_ENV === 'production') {
    console.error('Le seed est interdit en production.');
    process.exit(1);
  }

  const shouldReset = process.argv.includes('--reset');

  await connectDB();

  try {
    if (shouldReset) {
      log('\nSuppression des données de seed...');
      await resetSeedData();
    }

    log('\nCréation des utilisateurs...');
    const created = {};
    for (const data of SEED_USERS) {
      created[data.role] = await upsertUser(data);
    }

    log('\nCréation du projet de démonstration...');
    await seedDemoProject(created[ROLES.CLIENT], created[ROLES.ADVISOR]);

    log('\nSeed terminé.');
    log(`Mot de passe des comptes de test : ${SEED_PASSWORD}`);
    log('Comptes : admin@, conseiller@, finance@, client@ (domaine elikia.test)\n');
  } catch (error) {
    console.error('Erreur pendant le seed :', error);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
};

run();