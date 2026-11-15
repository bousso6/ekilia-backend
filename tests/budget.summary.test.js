import { describe, it, expect } from '@jest/globals';
import {
  computeBudgetSummary,
  sumByStatus,
} from '../src/utils/budgetSummary.js';

describe('sumByStatus', () => {
  it('additionne les montants par statut', () => {
    const totals = sumByStatus([
      { amount: 100, status: 'prevu' },
      { amount: 200, status: 'engage' },
      { amount: 300, status: 'paye' },
      { amount: 50, status: 'paye' },
    ]);
    expect(totals).toEqual({ prevu: 100, engage: 200, paye: 350 });
  });

  it('ignore les statuts inconnus et les montants invalides', () => {
    const totals = sumByStatus([
      { amount: 100, status: 'inconnu' },
      { amount: 'abc', status: 'paye' },
      null,
    ]);
    expect(totals).toEqual({ prevu: 0, engage: 0, paye: 0 });
  });
});

describe('computeBudgetSummary', () => {
  it("renvoie des zéros et hasBudget=false s'il n'y a pas de budget", () => {
    const summary = computeBudgetSummary({ budget: null, totalsByStatus: {} });
    expect(summary.hasBudget).toBe(false);
    expect(summary.referenceAmount).toBe(0);
    expect(summary.balance).toBe(0);
  });

  it('prend le budget initial comme référence sans révision', () => {
    const summary = computeBudgetSummary({
      budget: { initialAmount: 1000000, currency: 'XOF' },
      totalsByStatus: {},
    });
    expect(summary.referenceAmount).toBe(1000000);
    expect(summary.revisedAmount).toBeNull();
  });

  it('prend le budget révisé comme référence, et calcule engagé, payé et solde', () => {
    const summary = computeBudgetSummary({
      budget: { initialAmount: 1000000, revisedAmount: 1200000, currency: 'XOF' },
      totalsByStatus: { prevu: 500000, engage: 300000, paye: 200000 },
    });
    expect(summary.referenceAmount).toBe(1200000);
    expect(summary.committedAmount).toBe(500000);
    expect(summary.paidAmount).toBe(200000);
    expect(summary.plannedAmount).toBe(500000);
    expect(summary.balance).toBe(700000);
  });

  it("n'inclut pas les dépenses prévues dans le montant engagé", () => {
    const summary = computeBudgetSummary({
      budget: { initialAmount: 1000 },
      totalsByStatus: { prevu: 900, engage: 0, paye: 0 },
    });
    expect(summary.committedAmount).toBe(0);
    expect(summary.balance).toBe(1000);
  });

  it('autorise un solde négatif en cas de dépassement', () => {
    const summary = computeBudgetSummary({
      budget: { initialAmount: 1000 },
      totalsByStatus: { engage: 800, paye: 500 },
    });
    expect(summary.committedAmount).toBe(1300);
    expect(summary.balance).toBe(-300);
  });

  it('accepte un budget révisé à 0 comme référence', () => {
    const summary = computeBudgetSummary({
      budget: { initialAmount: 1000, revisedAmount: 0 },
      totalsByStatus: {},
    });
    expect(summary.referenceAmount).toBe(0);
  });
});
