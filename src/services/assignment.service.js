import { ROLES } from '../utils/constants.js';

// Seuls ces rôles voient les coordonnées et les notes internes d'un partenaire.
const CONTACT_VIEWERS = [ROLES.ADMIN, ROLES.ADVISOR];

const toPlain = (doc) =>
  doc && typeof doc.toObject === 'function' ? doc.toObject() : doc;

const idOf = (value) => {
  if (!value) return null;
  return String(value._id ?? value);
};

const isPopulated = (value) =>
  Boolean(value) && typeof value === 'object' && 'name' in value;

export const canSeePartnerContacts = (viewerRole) =>
  CONTACT_VIEWERS.includes(viewerRole);

/**
 * Transforme une affectation en réponse JSON selon le rôle de celui qui la lit.
 * - admin / conseiller : tout (coordonnées et notes internes comprises)
 * - tous les autres (client, finance, partenaire, rôle inconnu) :
 *   catégorie, rôle, statut. Les coordonnées et le nom n'apparaissent
 *   qu'une fois contactRevealed = true. Les notes internes jamais.
 */
export function serializeAssignment(assignment, viewerRole) {
  const a = toPlain(assignment);
  if (!a) return null;

  const partner = isPopulated(a.partner) ? toPlain(a.partner) : null;
  const partnerId = idOf(a.partner);

  const base = {
    id: idOf(a._id),
    project: idOf(a.project),
    role: a.role,
    status: a.status,
    contactRevealed: Boolean(a.contactRevealed),
    createdAt: a.createdAt,
    updatedAt: a.updatedAt,
  };

  if (canSeePartnerContacts(viewerRole)) {
    return {
      ...base,
      revealedBy: idOf(a.revealedBy),
      revealedAt: a.revealedAt ?? null,
      partner: partner
        ? {
            id: partnerId,
            name: partner.name,
            category: partner.category,
            verificationStatus: partner.verificationStatus,
            prestations: partner.prestations ?? [],
            contacts: partner.contacts ?? {},
            internalNotes: partner.internalNotes ?? '',
          }
        : { id: partnerId },
    };
  }

  const partnerView = { category: partner?.category ?? null };

  if (a.contactRevealed && partner) {
    partnerView.name = partner.name;
    partnerView.contacts = {
      phone: partner.contacts?.phone ?? null,
      email: partner.contacts?.email ?? null,
      address: partner.contacts?.address ?? null,
    };
  }

  return { ...base, partner: partnerView };
}

export const serializeAssignments = (list, viewerRole) =>
  list.map((assignment) => serializeAssignment(assignment, viewerRole));