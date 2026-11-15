import mongoose from 'mongoose';
import { Partner, Project, User } from '../models/index.js';
import { getBudgetSummary } from '../services/budget.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ROLES } from '../utils/constants.js';
import { sendCsvResponse } from '../utils/csv.js';
import { requireRole } from '../utils/guards.js';

function respondReport(req, res, filename, rows, columns) {
  if (req.query.format === 'json') {
    return res.json({ success: true, data: rows });
  }
  return sendCsvResponse(res, filename, rows, columns);
}

// GET /admin/reports/clients (admin)
export const exportClientsReport = asyncHandler(async (req, res) => {
  requireRole(req, [ROLES.ADMIN]);

  const clients = await User.find({ role: ROLES.CLIENT })
    .select(
      'firstName lastName email phone countryOfResidence cityOfResidence consent isActive lastLoginAt createdAt'
    )
    .sort({ createdAt: -1 })
    .lean();

  const rows = clients.map((c) => ({
    id: String(c._id),
    firstName: c.firstName || '',
    lastName: c.lastName || '',
    email: c.email || '',
    phone: c.phone || '',
    country: c.countryOfResidence || '',
    city: c.cityOfResidence || '',
    consentAccepted: Boolean(c.consent?.accepted),
    isActive: Boolean(c.isActive),
    lastLoginAt: c.lastLoginAt || '',
    createdAt: c.createdAt || '',
  }));

  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'firstName', header: 'Prénom' },
    { key: 'lastName', header: 'Nom' },
    { key: 'email', header: 'E-mail' },
    { key: 'phone', header: 'Téléphone' },
    { key: 'country', header: 'Pays de résidence' },
    { key: 'city', header: 'Ville de résidence' },
    { key: 'consentAccepted', header: 'Consentement RGPD' },
    { key: 'isActive', header: 'Compte actif' },
    { key: 'lastLoginAt', header: 'Dernière connexion' },
    { key: 'createdAt', header: 'Créé le' },
  ];

  return respondReport(req, res, 'elikia-clients.csv', rows, columns);
});

// GET /admin/reports/projects (admin, finance)
export const exportProjectsReport = asyncHandler(async (req, res) => {
  requireRole(req, [ROLES.ADMIN, ROLES.FINANCE]);

  const projects = await Project.find()
    .populate('client', 'firstName lastName email')
    .populate('advisor', 'firstName lastName')
    .sort({ createdAt: -1 })
    .lean();

  const rows = projects.map((p) => ({
    id: String(p._id),
    title: p.title || '',
    category: p.category || '',
    status: p.status || '',
    priority: p.priority || '',
    location: p.location || '',
    clientName: p.client ? `${p.client.firstName || ''} ${p.client.lastName || ''}`.trim() : '',
    clientEmail: p.client?.email || '',
    advisorName: p.advisor ? `${p.advisor.firstName || ''} ${p.advisor.lastName || ''}`.trim() : '',
    progress: p.progress?.value ?? 0,
    startDate: p.startDate || '',
    dueDate: p.dueDate || '',
    closedAt: p.closedAt || '',
    createdAt: p.createdAt || '',
  }));

  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'title', header: 'Titre du projet' },
    { key: 'category', header: 'Catégorie' },
    { key: 'status', header: 'Statut' },
    { key: 'priority', header: 'Priorité' },
    { key: 'location', header: 'Localisation Sénégal' },
    { key: 'clientName', header: 'Client' },
    { key: 'clientEmail', header: 'E-mail client' },
    { key: 'advisorName', header: 'Conseiller affecté' },
    { key: 'progress', header: 'Avancement (%)' },
    { key: 'startDate', header: 'Début' },
    { key: 'dueDate', header: 'Échéance' },
    { key: 'closedAt', header: 'Clôturé le' },
    { key: 'createdAt', header: 'Créé le' },
  ];

  return respondReport(req, res, 'elikia-projets.csv', rows, columns);
});

// GET /admin/reports/budgets (admin, finance)
export const exportBudgetsReport = asyncHandler(async (req, res) => {
  requireRole(req, [ROLES.ADMIN, ROLES.FINANCE]);

  const projects = await Project.find()
    .select('title category status client')
    .populate('client', 'firstName lastName')
    .sort({ createdAt: -1 })
    .lean();

  const rows = await Promise.all(
    projects.map(async (p) => {
      const summary = await getBudgetSummary(p._id);
      return {
        projectId: String(p._id),
        title: p.title || '',
        category: p.category || '',
        status: p.status || '',
        clientName: p.client ? `${p.client.firstName || ''} ${p.client.lastName || ''}`.trim() : '',
        currency: summary.currency || 'XOF',
        initialAmount: summary.initialAmount ?? 0,
        revisedAmount: summary.revisedAmount ?? '',
        referenceAmount: summary.referenceAmount ?? 0,
        plannedAmount: summary.plannedAmount ?? 0,
        committedAmount: summary.committedAmount ?? 0,
        paidAmount: summary.paidAmount ?? 0,
        balance: summary.balance ?? 0,
      };
    })
  );

  const columns = [
    { key: 'projectId', header: 'ID Projet' },
    { key: 'title', header: 'Projet' },
    { key: 'category', header: 'Catégorie' },
    { key: 'status', header: 'Statut projet' },
    { key: 'clientName', header: 'Client' },
    { key: 'currency', header: 'Devise' },
    { key: 'initialAmount', header: 'Budget initial' },
    { key: 'revisedAmount', header: 'Budget révisé' },
    { key: 'referenceAmount', header: 'Budget de référence' },
    { key: 'plannedAmount', header: 'Prévu' },
    { key: 'committedAmount', header: 'Engagé' },
    { key: 'paidAmount', header: 'Payé' },
    { key: 'balance', header: 'Solde disponible' },
  ];

  return respondReport(req, res, 'elikia-budgets.csv', rows, columns);
});

// GET /admin/reports/partners (admin)
export const exportPartnersReport = asyncHandler(async (req, res) => {
  requireRole(req, [ROLES.ADMIN]);

  const partners = await Partner.find().sort({ createdAt: -1 }).lean();

  const rows = partners.map((pt) => ({
    id: String(pt._id),
    name: pt.name || '',
    category: pt.category || '',
    verificationStatus: pt.verificationStatus || '',
    phone: pt.contacts?.phone || '',
    email: pt.contacts?.email || '',
    address: pt.contacts?.address || '',
    prestations: Array.isArray(pt.prestations) ? pt.prestations.join(' | ') : '',
    internalNotes: pt.internalNotes || '',
    createdAt: pt.createdAt || '',
  }));

  const columns = [
    { key: 'id', header: 'ID' },
    { key: 'name', header: 'Nom' },
    { key: 'category', header: 'Catégorie' },
    { key: 'verificationStatus', header: 'Vérification' },
    { key: 'phone', header: 'Téléphone' },
    { key: 'email', header: 'E-mail' },
    { key: 'address', header: 'Adresse' },
    { key: 'prestations', header: 'Prestations' },
    { key: 'internalNotes', header: 'Notes internes' },
    { key: 'createdAt', header: 'Créé le' },
  ];

  return respondReport(req, res, 'elikia-partenaires.csv', rows, columns);
});

// GET /admin/reports/conversions (admin)
export const exportConversionsReport = asyncHandler(async (req, res) => {
  requireRole(req, [ROLES.ADMIN]);

  const LeadModel = mongoose.models.Lead;
  let rows = [];

  if (LeadModel) {
    const leads = await LeadModel.find().sort({ createdAt: -1 }).lean();
    rows = leads.map((l) => ({
      id: String(l._id),
      fullName: l.fullName || `${l.firstName || ''} ${l.lastName || ''}`.trim(),
      email: l.email || '',
      category: l.category || '',
      status: l.status || '',
      converted: l.status === 'converti' || Boolean(l.convertedProject || l.project),
      projectId: l.convertedProject ? String(l.convertedProject) : l.project ? String(l.project) : '',
      createdAt: l.createdAt || '',
    }));
  }

  const columns = [
    { key: 'id', header: 'ID Lead' },
    { key: 'fullName', header: 'Prospect' },
    { key: 'email', header: 'E-mail' },
    { key: 'category', header: 'Catégorie' },
    { key: 'status', header: 'Statut commercial' },
    { key: 'converted', header: 'Converti en projet' },
    { key: 'projectId', header: 'ID Projet' },
    { key: 'createdAt', header: 'Reçu le' },
  ];

  return respondReport(req, res, 'elikia-conversions.csv', rows, columns);
});
