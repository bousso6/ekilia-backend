import { asyncHandler } from '../utils/asyncHandler.js';
import * as adminService from '../services/admin.service.js';

export const listUsers = asyncHandler(async (req, res) => {
  const data = await adminService.listUsers(req.query);
  res.status(200).json({ success: true, data });
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await adminService.getUserById(req.params.id);
  res.status(200).json({ success: true, data: { user } });
});

export const updateUserRole = asyncHandler(async (req, res) => {
  const user = await adminService.updateUserRole(
    req.params.id,
    req.body.role,
    req.user._id
  );
  res.status(200).json({
    success: true,
    message: 'Rôle mis à jour avec succès',
    data: { user },
  });
});

export const updateUserStatus = asyncHandler(async (req, res) => {
  const user = await adminService.updateUserStatus(
    req.params.id,
    req.body.isActive,
    req.user._id
  );
  res.status(200).json({
    success: true,
    message: user.isActive ? 'Compte activé' : 'Compte désactivé',
    data: { user },
  });
});
