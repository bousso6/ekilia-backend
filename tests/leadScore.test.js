import { jest } from '@jest/globals';

jest.unstable_mockModule('../src/services/auth.service.js', () => ({
  sendPasswordResetLink: jest.fn(),
}));

jest.unstable_mockModule('../src/services/events.js', () => ({
  logActivity: jest.fn(),
  notify: jest.fn(),
}));

const { calculateLeadScore } = await import('../src/services/lead.service.js');

describe('calculateLeadScore', () => {
  test('attribue 100 à un lead prioritaire', () => {
    const score = calculateLeadScore({
      budget: { amount: 6000000 },
      horizon: 'immediat',
      progress: 'execution_en_cours',
      needs: ['execution', 'audit'],
    });

    expect(score).toBe(100);
  });

  test('attribue 0 à un lead sans budget, horizon lointain et simple idée', () => {
    const score = calculateLeadScore({
      budget: {},
      horizon: 'plus_12_mois',
      progress: 'idee',
      needs: ['conseil'],
    });

    expect(score).toBe(0);
  });

  test('cumule les points budget, horizon et avancement', () => {
    const score = calculateLeadScore({
      budget: { amount: 2000000 },
      horizon: '3_6_mois',
      progress: 'demarches_engagees',
      needs: ['conseil'],
    });

    expect(score).toBe(55);
  });

  test('utilise le budget minimum quand le montant global est absent', () => {
    const score = calculateLeadScore({
      budget: { min: 600000 },
      horizon: '6_12_mois',
      progress: 'preparation',
      needs: ['suivi'],
    });

    expect(score).toBe(30);
  });

  test('accepte un lead sans budget ni freins', () => {
    const score = calculateLeadScore({
      horizon: 'immediat',
      progress: 'idee',
    });

    expect(score).toBe(30);
  });
});
