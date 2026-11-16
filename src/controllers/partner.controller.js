import { Partner } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { ROLES } from '../utils/constants.js';
import { requireRole } from '../utils/guards.js';

const PARTNER_MANAGERS = [ROLES.ADMIN, ROLES.ADVISOR];

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const listPartners = asyncHandler(async (req, res) => {
  requireRole(req, PARTNER_MANAGERS);

  const { category, verificationStatus, q, page, limit } = req.query;

  const filter = {};
  if (category) filter.category = category.toLowerCase();
  if (verificationStatus) filter.verificationStatus = verificationStatus;
  if (q) filter.name = { $regex: escapeRegex(q), $options: 'i' };

  const [items, total] = await Promise.all([
    Partner.find(filter)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Partner.countDocuments(filter),
  ]);

  res.json({
    success: true,
    data: items,
    meta: { page, limit, total, pages: Math.ceil(total / limit) },
  });
});

export const getPartner = asyncHandler(async (req, res) => {
  requireRole(req, PARTNER_MANAGERS);

  const partner = await Partner.findById(req.params.id);
  if (!partner) throw ApiError.notFound('Partenaire introuvable');

  res.json({ success: true, data: partner });
});

export const createPartner = asyncHandler(async (req, res) => {
  requireRole(req, PARTNER_MANAGERS);

  const partner = await Partner.create(req.body);

  res.status(201).json({ success: true, data: partner });
});

export const updatePartner = asyncHandler(async (req, res) => {
  requireRole(req, PARTNER_MANAGERS);

  // Les contacts sont mis à jour champ par champ pour ne pas effacer les autres
  const { contacts, ...rest } = req.body;
  const update = { ...rest };
  if (contacts) {
    for (const [key, value] of Object.entries(contacts)) {
      update[`contacts.${key}`] = value;
    }
  }

  const partner = await Partner.findByIdAndUpdate(
    req.params.id,
    { $set: update },
    { new: true, runValidators: true }
  );
  if (!partner) throw ApiError.notFound('Partenaire introuvable');

  res.json({ success: true, data: partner });
});
