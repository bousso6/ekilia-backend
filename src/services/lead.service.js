import crypto from 'crypto';
import { Lead } from '../models/Lead.js';
import { DiagnosticForm } from '../models/DiagnosticForm.js';
import { User } from '../models/User.js';
import { Project } from '../models/Project.js';
import { ApiError } from '../utils/ApiError.js';
import { ROLES, STAFF_ROLES } from '../utils/constants.js';
import { DEFAULT_DIAGNOSTIC_FORM } from '../utils/diagnosticForm.js';
import { logActivity, notify } from './events.js';
import { sendPasswordResetLink } from './auth.service.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const budgetAmountOf = (budget) => budget?.amount ?? budget?.max ?? budget?.min ?? 0;

export const calculateLeadScore = ({ budget, horizon, progress, needs = [] } = {}) => {
  let score = 0;
  const budgetAmount = budgetAmountOf(budget);
  const needList = Array.isArray(needs) ? needs : [];

  if (budgetAmount >= 5000000) score += 30;
  else if (budgetAmount >= 2000000) score += 20;
  else if (budgetAmount >= 500000) score += 10;

  if (horizon === 'immediat' || horizon === '0_3_mois') score += 30;
  else if (horizon === '3_6_mois') score += 20;
  else if (horizon === '6_12_mois') score += 10;

  if (progress === 'execution_en_cours') score += 30;
  else if (progress === 'prestataires_identifies') score += 20;
  else if (progress === 'demarches_engagees') score += 15;
  else if (progress === 'preparation') score += 10;

  if (needList.includes('execution') || needList.includes('audit')) score += 10;

  return Math.min(100, score);
};

const notifyLeadCreated = async (lead) => {
  const staff = await User.find({
    role: { $in: STAFF_ROLES },
    isActive: true,
  }).select('_id');

  const message = `Nouveau lead : ${lead.firstName} ${lead.lastName} (${lead.email})`;
  const link = `/admin/leads/${lead._id}`;

  await Promise.all(
    staff.map((member) =>
      notify({
        user: member._id,
        type: 'diagnostic_recu',
        message,
        link,
      })
    )
  );

  await notify({
    user: lead.client ?? lead.email,
    type: 'diagnostic_recu',
    message: `Merci ${lead.firstName}, votre diagnostic a bien été reçu. Un conseiller Elikia vous contactera prochainement.`,
    link: null,
  });
};

export const getDiagnosticForm = async () => {
  const form = await DiagnosticForm.findOne({ isActive: true }).sort({ version: -1 });
  return form ? form.toJSON() : { ...DEFAULT_DIAGNOSTIC_FORM };
};

export const createLead = async (payload) => {
  const existingClient = await User.findOne({ email: payload.email }).select('_id role');

  const lead = await Lead.create({
    ...payload,
    consent: {
      accepted: true,
      acceptedAt: new Date(),
    },
    score: calculateLeadScore(payload),
    status: 'nouveau',
    client: existingClient?.role === ROLES.CLIENT ? existingClient._id : undefined,
  });

  await notifyLeadCreated(lead);

  return lead.toJSON();
};

export const listLeads = async ({
  page,
  limit,
  status,
  category,
  source,
  assignedTo,
  search,
}) => {
  const filter = {};

  if (status) filter.status = status;
  if (category) filter.projectCategory = category;
  if (source) filter.source = source;
  if (assignedTo) filter.assignedTo = assignedTo;

  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    filter.$or = [
      { firstName: regex },
      { lastName: regex },
      { email: regex },
      { phone: regex },
    ];
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Lead.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('assignedTo', 'firstName lastName email role')
      .populate('convertedTo.client', 'firstName lastName email')
      .populate('convertedTo.project', 'title status'),
    Lead.countDocuments(filter),
  ]);

  return {
    items: items.map((lead) => lead.toJSON()),
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

export const getLeadById = async (id) => {
  const lead = await Lead.findById(id)
    .populate('assignedTo', 'firstName lastName email role')
    .populate('convertedTo.client', 'firstName lastName email')
    .populate('convertedTo.project', 'title status');

  if (!lead) {
    throw ApiError.notFound('Lead introuvable');
  }

  return lead.toJSON();
};

export const updateLead = async (id, payload) => {
  const lead = await Lead.findById(id);
  if (!lead) {
    throw ApiError.notFound('Lead introuvable');
  }

  if (payload.status === 'converti') {
    throw ApiError.badRequest(
      'Utilisez la route de conversion pour transformer un lead en projet'
    );
  }

  if (payload.status !== undefined) lead.status = payload.status;
  if (payload.notes !== undefined) lead.notes = payload.notes;
  if (payload.assignedTo !== undefined) lead.assignedTo = payload.assignedTo;

  await lead.save();

  return lead.toJSON();
};

const findOrCreateClient = async (lead) => {
  let client = lead.client ? await User.findById(lead.client) : null;

  if (!client) {
    client = await User.findOne({ email: lead.email });
  }

  if (client) {
    if (client.role !== ROLES.CLIENT) {
      throw ApiError.conflict('Un compte non client utilise déjà cet email');
    }
    return { client, created: false };
  }

  client = new User({
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phone: lead.phone,
    countryOfResidence: lead.country,
    cityOfResidence: lead.city,
    password: crypto.randomBytes(24).toString('hex'),
    role: ROLES.CLIENT,
    isEmailVerified: true,
    consent: {
      accepted: true,
      acceptedAt: lead.consent?.acceptedAt ?? new Date(),
    },
  });

  await client.save();

  return { client, created: true };
};

export const convertLead = async (id, actorId) => {
  const lead = await Lead.findById(id);
  if (!lead) {
    throw ApiError.notFound('Lead introuvable');
  }

  if (lead.status === 'converti' || lead.convertedTo?.project) {
    throw ApiError.conflict('Ce lead a déjà été converti');
  }

  const previousStatus = lead.status;
  const { client, created } = await findOrCreateClient(lead);

  let project;
  try {
    project = await Project.create({
      title:
        lead.projectTitle ||
        `Projet ${lead.projectCategory} - ${lead.projectLocation}`,
      description: lead.message || undefined,
      client: client._id,
      advisor: lead.assignedTo || undefined,
      category: lead.projectCategory,
      status: 'brouillon',
      priority: 'normale',
      location: lead.projectLocation,
      sourceLead: lead._id,
      nextAction: {
        label: 'Premier échange avec le conseiller',
        owner: 'elikia',
      },
    });
  } catch (error) {
    if (created) {
      await User.deleteOne({ _id: client._id });
    }
    throw error;
  }

  lead.status = 'converti';
  lead.client = client._id;
  lead.convertedTo = { client: client._id, project: project._id };
  lead.convertedAt = new Date();
  await lead.save();

  await logActivity({
    project: project._id,
    actor: actorId,
    action: 'lead.converti',
    before: { status: previousStatus },
    after: {
      status: 'converti',
      client: client._id,
      project: project._id,
    },
  });

  await notify({
    user: client._id,
    type: 'projet_cree',
    message:
      'Votre projet a été créé. Vous pouvez accéder à votre espace client.',
    link: `/projects/${project._id}`,
  });

  if (created) {
    await sendPasswordResetLink(client);
  }

  return {
    lead: lead.toJSON(),
    client: client.toJSON(),
    project: project.toJSON(),
  };
};
