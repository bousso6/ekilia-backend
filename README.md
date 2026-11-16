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

## Dashboards par rôle

La réponse de `POST /api/v1/auth/login` inclut `data.redirectTo` pour les rôles
`admin`, `finance` et `advisor` (`/admin/dashboard`, `/finance/dashboard` et
`/advisor/dashboard`). L'application cliente doit naviguer vers cette adresse
après avoir enregistré les jetons de connexion.

Les données de dashboard sont disponibles via :

- `GET /api/v1/admin/dashboard` (admin)
- `GET /api/v1/dashboard/finance` (finance)
- `GET /api/v1/dashboard/advisor` (conseiller)

## Validation des demandes de projet

Dans le back-office, l'administrateur suit les étapes d'une demande : nouvelle,
qualifiée, rendez-vous réalisé, puis proposition envoyée. Seule une demande au
statut `proposition_envoyee` peut être convertie par
`POST /api/v1/admin/leads/:id/convert`. La conversion crée le compte client et
un projet actif, visible dans son espace, et conserve l'historique des statuts.