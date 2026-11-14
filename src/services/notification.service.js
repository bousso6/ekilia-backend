import { logger } from '../utils/logger.js';

/**
 * Signature figée (la partie A l'appelle déjà) :
 * notify({ user, type, message, link })
 * Version provisoire : écrit dans les logs. L'étape B4 créera la notification
 * en base et enverra l'e-mail. Ne doit jamais faire échouer l'appelant.
 */
export async function notify({ user, type, message, link }) {
  try {
    logger.debug(
      { user: user ? String(user) : null, type, message, link },
      'Notification (provisoire, B4 la créera en base et enverra l’e-mail)'
    );
  } catch (err) {
    // volontairement ignoré
  }
}
