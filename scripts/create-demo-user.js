import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { ROLES } from '../src/utils/constants.js';

const DEMO_EMAIL = 'demo.elikia@example.com';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;

const run = async () => {
  if (!DEMO_PASSWORD || DEMO_PASSWORD.length < 8) {
    console.error('DEMO_PASSWORD est requis (8 caractères minimum).');
    process.exit(1);
  }

  const confirmed = process.argv.includes('--confirm');

  await connectDB();

  try {
    const dbName = mongoose.connection.name;
    console.log(`Base ciblée : ${dbName}`);

    if (dbName === 'elikia_test') {
      console.error('Refus : cette base est la base de tests (elikia_test).');
      process.exitCode = 1;
      return;
    }

    const existing = await User.findOne({ email: DEMO_EMAIL });

    if (!confirmed) {
      console.log(
        existing
          ? `Le compte ${DEMO_EMAIL} existe déjà : son mot de passe serait réinitialisé.`
          : `Le compte ${DEMO_EMAIL} n'existe pas : il serait créé.`
      );
      console.log('Aucune écriture. Relancez avec --confirm pour appliquer.');
      return;
    }

    if (existing) {
      if (existing.role !== ROLES.CLIENT) {
        console.error(`Refus : ${DEMO_EMAIL} existe avec le rôle ${existing.role}.`);
        process.exitCode = 1;
        return;
      }

      existing.password = DEMO_PASSWORD; // le hook pre('save') le hache
      existing.isActive = true;
      existing.isEmailVerified = true;
      await existing.save();
      console.log(`~ ${DEMO_EMAIL} mis à jour (mot de passe réinitialisé).`);
      return;
    }

    const user = new User({
      firstName: 'Demo',
      lastName: 'Elikia',
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
      role: ROLES.CLIENT,
      isEmailVerified: true,
      isActive: true,
      consent: { accepted: true, acceptedAt: new Date() },
    });
    await user.save();
    console.log(`+ ${DEMO_EMAIL} créé (rôle client).`);
  } catch (error) {
    console.error('Erreur :', error);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
};

run();