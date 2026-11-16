import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { Project } from '../src/models/Project.js';
import { ROLES } from '../src/utils/constants.js';

// Le seed ne peut écrire que dans cette base de développement.
const ALLOWED_DB_NAME = 'elikia_dev';

const SEED_PASSWORD = process.env.SEED_PASSWORD;

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
    if (!existing.isEmailVerified) {
      await User.updateOne(
        { _id: existing._id },
        { $set: { isEmailVerified: true } }
      );
      log(`  ~ ${data.email} marqué comme vérifié`);
    } else {
      log(`  = ${data.email} existe déjà (${data.role})`);
    }
    return existing;
  }

  const user = new User({
    ...data,
    password: SEED_PASSWORD,
    consent: { accepted: true, acceptedAt: new Date() },
    isEmailVerified: true,
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

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const run = async () => {
  if (env.NODE_ENV === 'production') {
    fail('Le seed est interdit en production.');
  }

  if (!SEED_PASSWORD || SEED_PASSWORD.length < 12) {
    fail(
      'SEED_PASSWORD est requis (12 caractères minimum). ' +
        "Exemple : SEED_PASSWORD='un-mot-de-passe-long' npm run seed"
    );
  }

  const shouldReset = process.argv.includes('--reset');
  const resetConfirmed = process.argv.includes('--confirm-reset');

  if (shouldReset && !resetConfirmed) {
    fail('--reset supprime les comptes de seed : ajoutez --confirm-reset pour confirmer.');
  }

  await connectDB();

  try {
    const dbName = mongoose.connection.name;
    log(`Base ciblée : ${dbName}`);

    // Garde-fou : on n'écrit jamais ailleurs que dans la base de développement.
    if (dbName !== ALLOWED_DB_NAME) {
      console.error(
        `Refus : le seed ne peut écrire que dans la base "${ALLOWED_DB_NAME}" ` +
          `(base ciblée : "${dbName}").`
      );
      console.error(
        `Dans votre .env local, terminez MONGODB_URI par /${ALLOWED_DB_NAME} ` +
          '(avant le "?") puis relancez.'
      );
      process.exitCode = 1;
      return;
    }

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
    log('Comptes : admin@, conseiller@, finance@, client@ (domaine elikia.test)');
    log('Mot de passe : la valeur de SEED_PASSWORD que vous avez fournie.\n');
  } catch (error) {
    console.error('Erreur pendant le seed :', error);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
};

run();