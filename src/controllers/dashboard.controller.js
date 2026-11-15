import { asyncHandler } from '../utils/asyncHandler.js';
import * as dashboardService from '../services/dashboard.service.js';

export const getClientDashboard = asyncHandler(async (req, res) => {
  const data = await dashboardService.getClientDashboard(req.user);
  res.status(200).json({ success: true, data });
});

export const getAdminDashboard = asyncHandler(async (req, res) => {
  const data = await dashboardService.getAdminDashboard();
  res.status(200).json({ success: true, data });
});
