import { describe, expect, it } from 'vitest';
import type { UserSubscriptionInfo } from '@recetario/types';
import {
  formatBillingDate,
  formatLongBillingDate,
  formatSubscriptionPrice,
  planPriceSuffix,
  subscriptionCurrencyLabel,
} from '../../app/features/billing/billing-format';

function subscription(overrides: Partial<UserSubscriptionInfo> = {}): UserSubscriptionInfo {
  return {
    tier: 'pro',
    status: 'active',
    recipesLimit: null,
    ingredientsLimit: null,
    features: {},
    priceCents: 1999,
    currency: 'MXN',
    billingInterval: 'monthly',
    currentPeriodEnd: '2026-10-15T12:00:00.000Z',
    cancelAtPeriodEnd: false,
    isTrial: false,
    trialEnd: null,
    ...overrides,
  };
}

describe('formatBillingDate', () => {
  it('formatea en es-MX', () => {
    expect(formatBillingDate('2026-10-15T12:00:00.000Z')).toBe('15/10/2026');
  });

  it('descarta valores ausentes, inválidos o anteriores a 2025', () => {
    expect(formatBillingDate(null)).toBeNull();
    expect(formatBillingDate(undefined)).toBeNull();
    expect(formatBillingDate('')).toBeNull();
    expect(formatBillingDate('no-es-fecha')).toBeNull();
    expect(formatBillingDate('2024-12-31T12:00:00.000Z')).toBeNull();
  });
});

describe('formatLongBillingDate', () => {
  it('usa el formato largo del dialog de confirmación', () => {
    expect(formatLongBillingDate('2026-10-15T12:00:00.000Z')).toBe('15 de octubre de 2026');
  });

  it('descarta valores no mostrables', () => {
    expect(formatLongBillingDate('2024-01-01T12:00:00.000Z')).toBeNull();
    expect(formatLongBillingDate(null)).toBeNull();
  });
});

describe('planPriceSuffix', () => {
  it('etiqueta el periodo mensual o anual', () => {
    expect(planPriceSuffix('monthly')).toBe('/mes');
    expect(planPriceSuffix('yearly')).toBe('/año');
    expect(planPriceSuffix(null)).toBe('/mes');
  });
});

describe('formatSubscriptionPrice', () => {
  it('formatea centavos como moneda', () => {
    expect(formatSubscriptionPrice(subscription())).toBe('$19.99');
    expect(formatSubscriptionPrice(subscription({ priceCents: 999 }))).toBe('$9.99');
  });

  it('no muestra importe para Free o sin precio', () => {
    expect(formatSubscriptionPrice(subscription({ tier: 'free' }))).toBeNull();
    expect(formatSubscriptionPrice(subscription({ priceCents: null }))).toBeNull();
  });
});

describe('subscriptionCurrencyLabel', () => {
  it('normaliza la moneda y tolera nulos', () => {
    expect(subscriptionCurrencyLabel(subscription())).toBe('MXN');
    expect(subscriptionCurrencyLabel(subscription({ currency: null }))).toBe('');
  });
});
