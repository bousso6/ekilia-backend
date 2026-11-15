import { ActivityLog } from '../models/ActivityLog.js';

export async function logActivity({ project, actor, action, before = undefined, after = undefined }) {
  try {
    if (!project || !action) {
      return null;
    }

    return await ActivityLog.create({
      project,
      actor: actor || undefined,
      action,
      before,
      after,
    });
  } catch (err) {
    console.error('[activity.service] Échec logActivity:', err?.message || err);
    return null;
  }
}
