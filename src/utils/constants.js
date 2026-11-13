export const ROLES = Object.freeze({
  ADMIN: 'admin',
  ADVISOR: 'advisor',
  FINANCE: 'finance',
  CLIENT: 'client',
  PARTNER: 'partner',
});

export const STAFF_ROLES = [ROLES.ADMIN, ROLES.ADVISOR, ROLES.FINANCE];

export const PROJECT_CATEGORIES = [
  'entrepreneuriat',
  'immobilier',
  'retour',
  'vehicule',
  'emploi',
  'investissement',
  'autre',
];

export const PROJECT_STATUS = [
  'brouillon',
  'actif',
  'en_pause',
  'bloque',
  'termine',
  'annule',
];

export const PRIORITIES = ['basse', 'normale', 'haute', 'urgente'];

export const LEAD_STATUS = [
  'nouveau',
  'qualifie',
  'rdv_realise',
  'proposition_envoyee',
  'converti',
  'perdu',
];

export const TASK_STATUS = [
  'a_faire',
  'en_cours',
  'en_attente_client',
  'en_attente_partenaire',
  'termine',
  'bloque',
];

export const EXPENSE_STATUS = ['prevu', 'engage', 'paye'];

export const DOCUMENT_CATEGORIES = [
  'identite',
  'contrat',
  'devis',
  'facture',
  'administratif',
  'immobilier',
  'juridique',
  'livrable',
  'autre',
];

export const DOCUMENT_STATUS = [
  'demande',
  'recu',
  'a_verifier',
  'valide',
  'refuse',
];

export const ASSIGNMENT_STATUS = [
  'propose',
  'valide',
  'en_cours',
  'termine',
  'annule',
];

export const NOTIFICATION_TYPES = [
  'diagnostic_recu',
  'projet_cree',
  'document_demande',
  'document_valide',
  'document_refuse',
  'tache_client_en_attente',
  'jalon_termine',
  'budget_modifie',
  'projet_cloture',
];