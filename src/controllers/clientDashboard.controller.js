import { Project, Budget, Expense, Task, Document, Lead } from '../models/index.js';
import { ROLES } from '../utils/constants.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const CATEGORY_LABELS = {
  entrepreneuriat: 'Entrepreneuriat',
  immobilier: 'Immobilier',
  retour: 'Retour au Sénégal',
  vehicule: 'Véhicule',
  emploi: 'Emploi',
  investissement: 'Investissement',
  autre: 'Autre',
};

const STATUS_LABELS = {
  brouillon: 'Brouillon',
  actif: 'En cours',
  en_pause: 'En pause',
  bloque: 'Bloqué',
  termine: 'Terminé',
  annule: 'Annulé',
};

const LEAD_STATUS_LABELS = {
  nouveau: 'Demande reçue',
  qualifie: 'Demande qualifiée',
  rdv_realise: 'Rendez-vous réalisé',
  proposition_envoyee: 'Proposition envoyée',
};

const LEAD_MESSAGES = {
  nouveau: 'Votre demande a bien été reçue. Un conseiller Elikia va vous contacter.',
  qualifie: 'Votre demande est en cours d’analyse par notre équipe.',
  rdv_realise: 'Suite à votre échange, nous préparons votre plan d’action.',
  proposition_envoyee:
    'Une proposition vous a été envoyée. Votre conseiller reste disponible pour en discuter.',
};

const DOC_CATEGORY_LABELS = {
  identite: 'Identité',
  contrat: 'Contrat',
  devis: 'Devis',
  facture: 'Facture',
  administratif: 'Administratif',
  immobilier: 'Immobilier',
  juridique: 'Juridique',
  livrable: 'Livrable',
  autre: 'Autre',
};

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : null;

const formatMonth = (d) =>
  d
    ? new Date(d).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : '—';

const formatSize = (bytes) => {
  if (!bytes) return '—';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} Mo`;
};

// Qui voit quels projets
const buildFilter = (user) => {
  const base = { status: { $in: ['actif', 'en_pause', 'bloque'] } };
  if (user.role === ROLES.ADMIN || user.role === ROLES.FINANCE) return base;
  if (user.role === ROLES.ADVISOR) return { ...base, advisor: user._id };
  return { ...base, client: user._id };
};

// Jalons = tâches marquées isMilestone, sinon toutes les tâches
const buildTimeline = (tasks) => {
  const milestones = tasks.filter((t) => t.isMilestone);
  const source = milestones.length ? milestones : tasks;
  let currentSet = false;

  return source.map((t) => {
    const completed = t.status === 'termine';
    const current = !completed && !currentSet;
    if (current) currentSet = true;

    return {
      step: t.title,
      completed,
      current,
      date: completed
        ? formatDate(t.completedAt) ?? ''
        : formatDate(t.dueDate) ?? 'À venir',
      description: t.description || undefined,
    };
  });
};

const buildDocuments = (docs) =>
  docs.map((doc) => {
    const versions = doc.versions ?? [];
    const latest = versions[versions.length - 1];
    return {
      id: String(doc._id),
      name: doc.title,
      category: DOC_CATEGORY_LABELS[doc.category] ?? 'Autre',
      size: formatSize(latest?.size),
      date: formatDate(latest?.uploadedAt ?? doc.createdAt) ?? '',
    };
  });

const groupBy = (items, getKey) => {
  const map = new Map();
  for (const item of items) {
    const key = String(getKey(item));
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  }
  return map;
};

// Demandes (leads) pas encore converties en projet, rattachées au client
// par son compte ou par son email. Email vérifié obligatoire : sinon quelqu'un
// pourrait créer un compte avec l'email d'un autre pour lire sa demande.
const findRequests = async (user) => {
  if (user.role !== ROLES.CLIENT || !user.isEmailVerified) return [];

  const leads = await Lead.find({
    $or: [{ client: user._id }, { email: user.email }],
    status: { $in: Object.keys(LEAD_STATUS_LABELS) },
    'convertedTo.project': { $exists: false },
  })
    .sort({ createdAt: -1 })
    .lean();

  return leads.map((l) => ({
    id: String(l._id),
    title: l.projectTitle || CATEGORY_LABELS[l.projectCategory] || 'Projet',
    category: CATEGORY_LABELS[l.projectCategory] ?? 'Projet',
    location: l.projectLocation ?? '',
    status: LEAD_STATUS_LABELS[l.status] ?? l.status,
    message: LEAD_MESSAGES[l.status] ?? '',
    createdAt: formatDate(l.createdAt) ?? '',
  }));
};

const buildMyDashboard = async (user) => {
  const projectQuery = Project.find(buildFilter(user)).populate(
    'advisor',
    'firstName lastName'
  );
  if (user.role === ROLES.ADVISOR) {
    projectQuery.populate('client', 'firstName lastName email');
  }

  const [projects, requests] = await Promise.all([
    projectQuery.sort({ updatedAt: -1 }).lean(),
    findRequests(user),
  ]);

  if (projects.length === 0) {
    return { projects: [], requests, advisor: null };
  }

  const ids = projects.map((p) => p._id);

  const [budgets, expenseTotals, tasks, documents] = await Promise.all([
    Budget.find({ project: { $in: ids } }).lean(),
    // Montant engagé = dépenses au statut "engage" ou "paye"
    Expense.aggregate([
      { $match: { project: { $in: ids }, status: { $in: ['engage', 'paye'] } } },
      { $group: { _id: '$project', total: { $sum: '$amount' } } },
    ]),
    Task.find({ project: { $in: ids } }).sort({ order: 1, createdAt: 1 }).lean(),
    // Documents vérifiés = statut "valide"
    Document.find({ project: { $in: ids }, status: 'valide' })
      .sort({ createdAt: -1 })
      .lean(),
  ]);

  const budgetByProject = new Map(budgets.map((b) => [String(b.project), b]));
  const engagedByProject = new Map(expenseTotals.map((e) => [String(e._id), e.total]));
  const tasksByProject = groupBy(tasks, (t) => t.project);
  const docsByProject = groupBy(documents, (d) => d.project);

  const result = projects.map((p) => {
    const key = String(p._id);
    const budget = budgetByProject.get(key);
    const total = budget ? budget.revisedAmount ?? budget.initialAmount : 0;
    const engaged = engagedByProject.get(key) ?? 0;

    return {
      id: key,
      title: p.title,
      category: CATEGORY_LABELS[p.category] ?? 'Projet',
      location: p.location ?? '',
      status: STATUS_LABELS[p.status] ?? p.status,
      progress: p.progress?.value ?? 0,
      nextStep: p.nextAction?.label ?? 'Aucune action en cours',
      lastUpdate: formatDate(p.updatedAt) ?? '',
      estimatedCompletion: formatMonth(p.dueDate),
      ...(user.role === ROLES.ADVISOR && p.client
        ? {
            client: {
              id: String(p.client._id),
              firstName: p.client.firstName,
              lastName: p.client.lastName,
              email: p.client.email,
            },
          }
        : {}),
      budget: { total, engaged, available: total - engaged },
      documents: buildDocuments(docsByProject.get(key) ?? []),
      timeline: buildTimeline(tasksByProject.get(key) ?? []),
    };
  });

  // Conseiller : celui du premier projet qui en a un
  const advisorUser = projects.find((p) => p.advisor)?.advisor;
  const advisor = advisorUser
    ? {
        name: `${advisorUser.firstName} ${advisorUser.lastName}`.trim(),
        title: 'Conseiller Elikia',
        avatar: null,
        specialties: [],
      }
    : null;

  return { projects: result, requests, advisor };
};

export const getMyDashboard = asyncHandler(async (req, res) => {
  const data = await buildMyDashboard(req.user);
  res.json({ success: true, ...data });
});

export const getAdvisorDashboard = asyncHandler(async (req, res) => {
  const data = await buildMyDashboard(req.user);
  res.json({ success: true, data });
});