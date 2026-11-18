import { describe, expect, it } from 'vitest';
import type { UserSubscriptionInfo } from '@recetario/types';
import {
  INGREDIENTS_WARNING_THRESHOLD,
  RECIPES_WARNING_THRESHOLD,
  currentPlanLabel,
  isPlanChangeUpgrade,
  planAction,
  planChangeCopy,
  planDisplayName,
  showsLowRemainingWarning,
  subscriptionSummaryLine,
  targetPlanLabel,
  usagePercentage,
} from '../../app/features/billing/billing-plan-state';

function subscription(overrides: Partial<UserSubscriptionInfo> = {}): UserSubscriptionInfo {
  return {
    tier: 'basic',
    status: 'active',
    recipesLimit: 75,
    ingredientsLimit: null,
    features: {},
    priceCents: 999,
    currency: 'MXN',
    billingInterval: 'monthly',
    currentPeriodEnd: '2026-10-15T12:00:00.000Z',
    cancelAtPeriodEnd: false,
    isTrial: false,
    trialEnd: null,
    ...overrides,
  };
}

describe('isPlanChangeUpgrade', () => {
  it('subir de tier es upgrade y bajar es downgrade', () => {
    expect(isPlanChangeUpgrade('free', 'monthly', 'basic', 'monthly')).toBe(true);
    expect(isPlanChangeUpgrade('free', 'monthly', 'pro', 'monthly')).toBe(true);
    expect(isPlanChangeUpgrade('basic', 'monthly', 'pro', 'monthly')).toBe(true);
    expect(isPlanChangeUpgrade('pro', 'monthly', 'basic', 'monthly')).toBe(false);
  });

  it('el cambio de periodo manda sobre el rango', () => {
    expect(isPlanChangeUpgrade('pro', 'monthly', 'pro', 'yearly')).toBe(true);
    expect(isPlanChangeUpgrade('pro', 'yearly', 'pro', 'monthly')).toBe(false);
    // Anual → mensual de un tier mayor sigue siendo downgrade.
    expect(isPlanChangeUpgrade('basic', 'yearly', 'pro', 'monthly')).toBe(false);
    // Mensual → anual de un tier menor sigue siendo upgrade.
    expect(isPlanChangeUpgrade('basic', 'monthly', 'pro', 'yearly')).toBe(true);
  });
});

describe('planAction', () => {
  it('marca el plan actual y el free como no accionables', () => {
    expect(planAction('basic', 'monthly', 'basic', 'monthly')).toMatchObject({
      kind: 'current',
      label: 'Plan actual',
      disabled: true,
    });
    expect(planAction('basic', 'monthly', 'free', 'monthly')).toMatchObject({
      kind: 'free',
      label: 'Plan actual',
      disabled: true,
    });
  });

  it('etiqueta upgrades y downgrades como el baseline', () => {
    expect(planAction('free', 'monthly', 'basic', 'monthly').label).toBe('Actualizar a Basic');
    expect(planAction('basic', 'monthly', 'pro', 'monthly').label).toBe('Actualizar a Pro');
    expect(planAction('pro', 'monthly', 'basic', 'monthly').label).toBe('Cambiar a Basic');
    // Downgrade de periodo con el tier más caro conserva el nombre explícito.
    expect(planAction('pro', 'yearly', 'pro', 'monthly').label).toBe('Cambiar a Pro Mensual');
  });

  it('marca isUpgrade sólo cuando corresponde', () => {
    expect(planAction('basic', 'monthly', 'pro', 'monthly').isUpgrade).toBe(true);
    expect(planAction('pro', 'monthly', 'basic', 'monthly').isUpgrade).toBe(false);
  });
});

describe('planChangeCopy', () => {
  it('describe el upgrade inmediato con prorrateo', () => {
    const copy = planChangeCopy({
      isUpgrade: true,
      currentPlanName: 'BASIC Mensual',
      targetPlanName: 'KitchCalc Pro Mensual',
      effectiveDate: '15 de octubre de 2026',
    });

    expect(copy.tone).toBe('upgrade');
    expect(copy.title).toBe('Cambio inmediato (Upgrade)');
    expect(copy.description).toContain('KitchCalc Pro Mensual');
    expect(copy.chargeDetails).toContain('cobro inmediato');
  });

  it('describe el downgrade programado con la fecha efectiva', () => {
    const copy = planChangeCopy({
      isUpgrade: false,
      currentPlanName: 'PRO Mensual',
      targetPlanName: 'KitchCalc Basic Mensual',
      effectiveDate: '15 de octubre de 2026',
    });

    expect(copy.tone).toBe('downgrade');
    expect(copy.title).toBe('Cambio programado (Downgrade)');
    expect(copy.description).toContain('PRO Mensual');
    expect(copy.description).toContain('15 de octubre de 2026');
    expect(copy.chargeDetails).toContain('No se realizará ningún cobro el día de hoy');
  });
});

describe('subscriptionSummaryLine', () => {
  it('prioriza el cambio programado sobre la cancelación', () => {
    expect(
      subscriptionSummaryLine(
        subscription({
          scheduledChange: {
            targetTier: 'basic',
            targetPlanName: 'KitchCalc Basic Mensual',
            targetInterval: 'monthly',
            effectiveDate: '2026-10-15T12:00:00.000Z',
          },
          cancelAtPeriodEnd: true,
        })
      )
    ).toBe('Cambiará a KitchCalc Basic Mensual el 15/10/2026');
  });

  it('describe cancelación, prueba y renovación', () => {
    expect(subscriptionSummaryLine(subscription({ cancelAtPeriodEnd: true }))).toBe(
      'Se cancelará el 15/10/2026'
    );

    expect(
      subscriptionSummaryLine(
        subscription({
          isTrial: true,
          trialEnd: '2026-10-01T12:00:00.000Z',
        })
      )
    ).toBe('Prueba hasta el 1/10/2026');

    expect(subscriptionSummaryLine(subscription())).toBe('Se renueva el 15/10/2026');
  });

  it('cae a renovación recurrente sin fechas mostrables', () => {
    expect(subscriptionSummaryLine(subscription({ currentPeriodEnd: null, trialEnd: null }))).toBe(
      'Renovación recurrente'
    );

    // El baseline descartaba fechas con año < 2025.
    expect(
      subscriptionSummaryLine(subscription({ currentPeriodEnd: '2024-01-01T12:00:00.000Z' }))
    ).toBe('Renovación recurrente');
  });

  it('el plan free es gratis para siempre', () => {
    expect(subscriptionSummaryLine(subscription({ tier: 'free', priceCents: null }))).toBe(
      'Gratis para siempre'
    );
  });
});

describe('labels de plan', () => {
  it('nombra el plan con la marca', () => {
    expect(planDisplayName('free')).toBe('KitchCalc Free');
    expect(planDisplayName('basic')).toBe('KitchCalc Basic');
    expect(planDisplayName('pro')).toBe('KitchCalc Pro');
  });

  it('compone el plan actual y el destino con el periodo', () => {
    expect(currentPlanLabel('basic', 'monthly')).toBe('BASIC Mensual');
    expect(currentPlanLabel('pro', 'yearly')).toBe('PRO Anual');
    expect(targetPlanLabel('KitchCalc Pro', 'yearly')).toBe('KitchCalc Pro Anual');
  });
});

describe('uso y umbrales', () => {
  it('calcula el porcentaje y lo recorta a 100', () => {
    expect(usagePercentage(2, 10)).toBe(20);
    expect(usagePercentage(12, 10)).toBe(100);
    expect(usagePercentage(5, null)).toBe(0);
    expect(usagePercentage(5, 0)).toBe(0);
  });

  it('avisa sólo cuando el remanente alcanza el umbral', () => {
    expect(showsLowRemainingWarning(null, RECIPES_WARNING_THRESHOLD)).toBe(false);
    expect(showsLowRemainingWarning(4, RECIPES_WARNING_THRESHOLD)).toBe(false);
    expect(showsLowRemainingWarning(3, RECIPES_WARNING_THRESHOLD)).toBe(true);
    expect(showsLowRemainingWarning(0, RECIPES_WARNING_THRESHOLD)).toBe(true);
    expect(INGREDIENTS_WARNING_THRESHOLD).toBe(5);
  });
});
