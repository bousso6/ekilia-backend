import { createLeadSchema } from '../src/validators/lead.validator.js';

const validPayload = {
  firstName: 'Awa',
  lastName: 'Diop',
  email: 'awa@example.com',
  phone: '+221770000000',
  country: 'France',
  city: 'Paris',
  projectCategory: 'entrepreneuriat',
  projectLocation: 'Dakar',
  horizon: '0_3_mois',
  budget: { min: 500000, max: 2000000, currency: 'XOF' },
  progress: 'preparation',
  needs: ['conseil'],
  obstacles: ['budget'],
  consent: { accepted: true },
};

describe('createLeadSchema', () => {
  test('accepte un diagnostic valide et applique les valeurs par défaut', () => {
    const result = createLeadSchema.parse(validPayload);

    expect(result.source).toBe('diagnostic');
    expect(result.obstacles).toEqual(['budget']);
  });

  test('refuse un diagnostic sans consentement', () => {
    const { consent, ...withoutConsent } = validPayload;

    expect(createLeadSchema.safeParse(withoutConsent).success).toBe(false);
    expect(consent).toBeDefined();
  });

  test('refuse un consentement non accepté', () => {
    const result = createLeadSchema.safeParse({
      ...validPayload,
      consent: { accepted: false },
    });

    expect(result.success).toBe(false);
  });

  test('refuse un diagnostic sans besoin', () => {
    const result = createLeadSchema.safeParse({
      ...validPayload,
      needs: [],
    });

    expect(result.success).toBe(false);
  });

  test('refuse un budget maximum inférieur au minimum', () => {
    const result = createLeadSchema.safeParse({
      ...validPayload,
      budget: { min: 2000000, max: 1000000 },
    });

    expect(result.success).toBe(false);
  });

  test('refuse une catégorie de projet inconnue', () => {
    const result = createLeadSchema.safeParse({
      ...validPayload,
      projectCategory: 'inconnue',
    });

    expect(result.success).toBe(false);
  });

  test('refuse un horizon inconnu', () => {
    const result = createLeadSchema.safeParse({
      ...validPayload,
      horizon: 'demain',
    });

    expect(result.success).toBe(false);
  });
});
