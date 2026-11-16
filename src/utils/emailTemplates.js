const SUBJECTS = {
  diagnostic_recu: 'Confirmation de votre pré-diagnostic',
  projet_cree: 'Votre espace projet Elikia est actif',
  document_demande: 'Nouvelle pièce demandée sur votre dossier',
  document_valide: 'Document validé par votre conseiller',
  document_refuse: 'Document à corriger sur votre dossier',
  tache_client_en_attente: 'Action attendue de votre part',
  jalon_termine: 'Avancement de votre projet : jalon terminé',
  budget_modifie: 'Mise à jour budgétaire de votre projet',
  projet_cloture: 'Clôture de votre projet Elikia Diaspora',
};

// Les valeurs saisies par des visiteurs (prénom, nom, e-mail d'un lead) se
// retrouvent dans message et recipientName : on les échappe dans le HTML.
const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export function buildNotificationEmail({ type, message, link, recipientName }) {
  const subject = `Elikia Diaspora — ${SUBJECTS[type] || 'Mise à jour de votre dossier'}`;
  const greeting = recipientName ? `Bonjour ${recipientName},` : 'Bonjour,';

  const textLines = [greeting, '', message];
  if (link) {
    textLines.push('', `Accéder à votre espace : ${link}`);
  }
  textLines.push('', 'L’équipe Elikia Diaspora (Dakar & Thiès)');

  const linkHtml = link
    ? `<p style="margin-top:16px;"><a href="${escapeHtml(link)}" style="color:#0f766e;font-weight:600;">Consulter mon dossier</a></p>`
    : '';

  const html = `
    <div style="font-family:sans-serif;color:#0f172a;line-height:1.5;">
      <p>${escapeHtml(greeting)}</p>
      <p>${escapeHtml(message)}</p>
      ${linkHtml}
      <p style="margin-top:24px;color:#64748b;font-size:13px;">
        L’équipe Elikia Diaspora — Dakar &amp; Thiès
      </p>
    </div>
  `.trim();

  return { subject, text: textLines.join('\n'), html };
}