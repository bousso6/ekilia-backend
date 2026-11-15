// Doit être importé en premier dans chaque test HTTP : neutralise les
// fournisseurs email avant que src/config/env.js ne soit évalué.
process.env.NODE_ENV = 'test';
process.env.BREVO_API_KEY = '';
process.env.SMTP_HOST = '';
