import { User } from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';
import { ROLES } from '../utils/constants.js';

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const countActiveAdmins = () =>
  User.countDocuments({ role: ROLES.ADMIN, isActive: true });

export const listUsers = async ({ page, limit, role, isActive, search }) => {
  const filter = {};

  if (role) filter.role = role;
  if (isActive !== undefined) filter.isActive = isActive;

  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    filter.$or = [{ firstName: regex }, { lastName: regex }, { email: regex }];
  }

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
    User.countDocuments(filter),
  ]);

  return {
    items: items.map((user) => user.toJSON()),
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

export const getUserById = async (id) => {
  const user = await User.findById(id);
  if (!user) {
    throw ApiError.notFound('Utilisateur introuvable');
  }
  return user.toJSON();
};

export const updateUserRole = async (id, role, actingUserId) => {
  const user = await User.findById(id);
  if (!user) {
    throw ApiError.notFound('Utilisateur introuvable');
  }

  if (String(user._id) === String(actingUserId) && role !== ROLES.ADMIN) {
    throw ApiError.badRequest(
      'Vous ne pouvez pas retirer votre propre rôle administrateur'
    );
  }

  if (user.role === ROLES.ADMIN && role !== ROLES.ADMIN) {
    const admins = await countActiveAdmins();
    if (admins <= 1) {
      throw ApiError.badRequest('Au moins un administrateur actif doit être conservé');
    }
  }

  user.role = role;
  await user.save();
  return user.toJSON();
};

export const updateUserStatus = async (id, isActive, actingUserId) => {
  const user = await User.findById(id);
  if (!user) {
    throw ApiError.notFound('Utilisateur introuvable');
  }

  if (String(user._id) === String(actingUserId) && !isActive) {
    throw ApiError.badRequest('Vous ne pouvez pas désactiver votre propre compte');
  }

  if (user.role === ROLES.ADMIN && user.isActive && !isActive) {
    const admins = await countActiveAdmins();
    if (admins <= 1) {
      throw ApiError.badRequest('Au moins un administrateur actif doit être conservé');
    }
  }

  user.isActive = isActive;
  await user.save();

  if (!isActive) {
    await User.updateOne({ _id: user._id }, { $unset: { refreshTokenHash: 1 } });
  }

  return user.toJSON();
};
