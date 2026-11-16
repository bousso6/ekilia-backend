import { envoyerMail } from './src/config/mailer.js';

await envoyerMail({
  to: 'gayemamebousso749@gmail.com',
  sujet: 'Test SMTP Ekilia',
  html: '<p>Ça marche avec nodemailer !</p>',
});

console.log('Mail envoyé');