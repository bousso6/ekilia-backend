import { describe, it, expect } from '@jest/globals';
import { serializeAssignment } from '../src/services/assignment.service.js';

const partner = {
  _id: '65a000000000000000000001',
  name: 'Étude Ndiaye',
  category: 'notaire',
  verificationStatus: 'verifie',
  prestations: ['audit titre foncier'],
  contacts: {
    phone: '+221770000000',
    email: 'contact@ndiaye.sn',
    address: 'Dakar Plateau',
  },
  internalNotes: 'Retard fréquent sur les délais',
};

const makeAssignment = (overrides = {}) => ({
  _id: '65a000000000000000000002',
  project: '65a000000000000000000003',
  partner,
  role: 'Audit du titre foncier',
  status: 'en_cours',
  contactRevealed: false,
  ...overrides,
});

const HIDDEN_FROM_CLIENT = [
  'contact@ndiaye.sn',
  '+221770000000',
  'Dakar Plateau',
  'Retard fréquent',
  'Étude Ndiaye',
  'internalNotes',
];

describe('serializeAssignment', () => {
  it('ne montre au client que catégorie, rôle et statut tant que les contacts sont masqués', () => {
    const result = serializeAssignment(makeAssignment(), 'client');
    const json = JSON.stringify(result);

    for (const secret of HIDDEN_FROM_CLIENT) {
      expect(json).not.toContain(secret);
    }
    expect(result.partner).toEqual({ category: 'notaire' });
    expect(result.role).toBe('Audit du titre foncier');
    expect(result.status).toBe('en_cours');
  });

  it('montre les coordonnées au client une fois révélées, mais jamais les notes internes', () => {
    const result = serializeAssignment(
      makeAssignment({ contactRevealed: true }),
      'client'
    );
    const json = JSON.stringify(result);

    expect(json).toContain('contact@ndiaye.sn');
    expect(json).toContain('+221770000000');
    expect(json).not.toContain('Retard fréquent');
    expect(json).not.toContain('internalNotes');
  });

  it('applique la vue restreinte aux rôles finance, partner et inconnus', () => {
    for (const role of ['finance', 'partner', 'inconnu', undefined]) {
      const json = JSON.stringify(serializeAssignment(makeAssignment(), role));
      for (const secret of HIDDEN_FROM_CLIENT) {
        expect(json).not.toContain(secret);
      }
    }
  });

  it("donne tout à l'admin et au conseiller, même sans révélation", () => {
    for (const role of ['admin', 'advisor']) {
      const json = JSON.stringify(serializeAssignment(makeAssignment(), role));
      expect(json).toContain('contact@ndiaye.sn');
      expect(json).toContain('Retard fréquent');
    }
  });

  it("ne plante pas si le partenaire n'est pas chargé (simple identifiant)", () => {
    const result = serializeAssignment(
      makeAssignment({ partner: '65a000000000000000000001' }),
      'client'
    );
    expect(result.partner).toEqual({ category: null });
  });
});
