import { logger } from '../utils/logger.js';

/**
 * Signature figée (la partie A l'appelle déjà) :
 * logActivity({ project, actor, action, before, after })
 * Version provisoire : écrit dans les logs. L'étape B4 l'enregistrera en base.
 * Ne doit jamais bloquer ni faire échouer l'appelant.
 */
export async function logActivity({ project, actor, action, before = null, after = null }) {
  try {
    logger.debug(
      {
        project: project ? String(project) : null,
        actor: actor ? String(actor) : null,
        action,
        before,
        after,
      },
      'Activité (provisoire, B4 l’enregistrera en base)'
    );
  } catch (err) {
    // volontairement ignoré
  }
}
