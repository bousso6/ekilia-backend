import { asyncHandler } from '../utils/asyncHandler.js';
import * as dashboardService from '../services/dashboard.service.js';
import * as financeDashboardService from '../services/financeDashboard.service.js';

export { getAdvisorDashboard } from './clientDashboard.controller.js';

export const getClientDashboard = asyncHandler(async (req, res) => {
  const data = await dashboardService.getClientDashboard(req.user);
  res.status(200).json({ success: true, data });
});

export const getAdminDashboard = asyncHandler(async (req, res) => {
  const data = await dashboardService.getAdminDashboard();
  res.status(200).json({ success: true, data });
});

export const getFinanceDashboard = asyncHandler(async (req, res) => {
  const data = await financeDashboardService.getFinanceDashboard();
  res.status(200).json({ success: true, data });
});
