# Elikia Backend

API Node.js / Express structurée par couches, avec MongoDB via Mongoose.

## Démarrage

1. Installer les dépendances avec `npm install`.
2. Copier `.env.example` vers `.env` puis renseigner `MONGODB_URI` et un `JWT_SECRET` d'au moins 32 caractères.
3. Lancer l'API avec `npm run dev` ou `npm start`.
4. Vérifier `GET /api/health`.

Les contrôleurs, services, modèles, validateurs et routes métier sont des points de départ. Le stockage et les rappels nécessitent encore le choix et la configuration de leurs fournisseurs/règles métier.

## Tests

Lancer `npm test`.