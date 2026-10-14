import { describe, expect, it } from 'vitest';
import { LANDING_CTAS } from '../../app/features/landing/landing-ctas';

describe('landing-ctas', () => {
  it('lleva a los prospectos al registro (/sign-up) y no al login', () => {
    expect(LANDING_CTAS.signUp).toBe('/sign-up');
    expect(LANDING_CTAS.signIn).toBe('/sign-in');
    expect(LANDING_CTAS.app).toBe('/recipes');
  });

  it('planCheckout redirige correctamente según plan y sesión', () => {
    expect(LANDING_CTAS.planCheckout('free', false)).toBe('/sign-up?redirect=/recipes');
    expect(LANDING_CTAS.planCheckout('free', true)).toBe('/recipes');
    expect(LANDING_CTAS.planCheckout('basic', false)).toBe('/sign-up?redirect=/pricing');
    expect(LANDING_CTAS.planCheckout('basic', true)).toBe('/pricing');
  });
});
