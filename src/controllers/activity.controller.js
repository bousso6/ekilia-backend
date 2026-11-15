import { ActivityLog } from '../models/ActivityLog.js';
import { ApiError } from '../utils/ApiError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { loadAccessibleProject } from '../utils/guards.js';

export const getProjectActivity = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw ApiError.unauthorized('Authentification requise');
  }

  await loadAccessibleProject(req.user, req.params.projectId);

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));

  const [items, total] = await Promise.all([
    ActivityLog.find({ project: req.params.projectId })
      .populate('actor', 'name role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    ActivityLog.countDocuments({ project: req.params.projectId }),
  ]);

  res.json({
    success: true,
    data: {
      items,
      pagination: { page, limit, total },
    },
  });
});
