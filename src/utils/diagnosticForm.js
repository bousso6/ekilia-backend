import {
  LEAD_HORIZONS,
  LEAD_NEEDS,
  LEAD_OBSTACLES,
  LEAD_PROGRESS,
  PROJECT_CATEGORIES,
} from './constants.js';

const CATEGORY_LABELS = {
  entrepreneuriat: 'Entrepreneuriat',
  immobilier: 'Immobilier',
  retour: 'Retour / installation',
  vehicule: 'Véhicule',
  emploi: 'Emploi',
  investissement: 'Investissement',
  autre: 'Autre',
};

const HORIZON_LABELS = {
  immediat: 'Immédiat',
  '0_3_mois': '0-3 mois',
  '3_6_mois': '3-6 mois',
  '6_12_mois': '6-12 mois',
  plus_12_mois: 'Plus de 12 mois',
};

const PROGRESS_LABELS = {
  idee: 'Idée',
  preparation: 'Préparation',
  demarches_engagees: 'Démarches engagées',
  prestataires_identifies: 'Prestataires identifiés',
  execution_en_cours: 'Exécution en cours',
};

const NEED_LABELS = {
  conseil: 'Conseil',
  mise_en_relation: 'Mise en relation',
  execution: 'Exécution',
  suivi: 'Suivi',
  audit: 'Audit',
  autre: 'Autre',
};

const OBSTACLE_LABELS = {
  distance: 'Distance',
  confiance: 'Confiance',
  administratif: 'Administratif',
  budget: 'Budget',
  temps: 'Temps',
  prestataires: 'Prestataires',
  information: 'Information',
};

const toOptions = (values, labels) =>
  values.map((value) => ({ value, label: labels[value] || value }));

export const DEFAULT_DIAGNOSTIC_FORM = {
  name: 'Pré-diagnostic Elikia',
  version: 1,
  isActive: true,
  fields: [
    {
      key: 'firstName',
      label: 'Prénom',
      type: 'text',
      required: true,
      order: 1,
    },
    {
      key: 'lastName',
      label: 'Nom',
      type: 'text',
      required: true,
      order: 2,
    },
    {
      key: 'email',
      label: 'Email',
      type: 'email',
      required: true,
      order: 3,
    },
    {
      key: 'phone',
      label: 'Téléphone',
      type: 'tel',
      required: true,
      order: 4,
    },
    {
      key: 'country',
      label: 'Pays de résidence',
      type: 'text',
      required: true,
      order: 5,
    },
    {
      key: 'city',
      label: 'Ville de résidence',
      type: 'text',
      required: false,
      order: 6,
    },
    {
      key: 'projectCategory',
      label: 'Catégorie de projet',
      type: 'select',
      required: true,
      order: 7,
      options: toOptions(PROJECT_CATEGORIES, CATEGORY_LABELS),
    },
    {
      key: 'projectLocation',
      label: 'Ville / zone au Sénégal',
      type: 'text',
      required: true,
      order: 8,
    },
    {
      key: 'horizon',
      label: 'Horizon',
      type: 'select',
      required: true,
      order: 9,
      options: toOptions(LEAD_HORIZONS, HORIZON_LABELS),
    },
    {
      key: 'budget',
      label: 'Budget indicatif (XOF)',
      type: 'budget-range',
      required: false,
      order: 10,
    },
    {
      key: 'progress',
      label: 'Avancement',
      type: 'select',
      required: true,
      order: 11,
      options: toOptions(LEAD_PROGRESS, PROGRESS_LABELS),
    },
    {
      key: 'needs',
      label: 'Besoin',
      type: 'multiselect',
      required: true,
      order: 12,
      options: toOptions(LEAD_NEEDS, NEED_LABELS),
    },
    {
      key: 'obstacles',
      label: 'Freins',
      type: 'multiselect',
      required: false,
      order: 13,
      options: toOptions(LEAD_OBSTACLES, OBSTACLE_LABELS),
    },
    {
      key: 'message',
      label: 'Décrivez votre projet',
      type: 'textarea',
      required: false,
      order: 14,
    },
    {
      key: 'consent',
      label:
        "J'accepte que mes données soient utilisées pour être contacté par Elikia Diaspora.",
      type: 'consent',
      required: true,
      order: 15,
    },
  ],
};
