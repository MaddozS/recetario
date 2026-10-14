import { describe, expect, it } from 'vitest';
import { formatCountdown } from '../../app/features/auth/format-countdown';

describe('formatCountdown', () => {
  it('formatea MM:SS con dos dígitos', () => {
    expect(formatCountdown(540)).toBe('09:00');
    expect(formatCountdown(59)).toBe('00:59');
    expect(formatCountdown(61)).toBe('01:01');
    expect(formatCountdown(600)).toBe('10:00');
  });

  it('nunca muestra valores negativos', () => {
    expect(formatCountdown(0)).toBe('00:00');
    expect(formatCountdown(-5)).toBe('00:00');
  });
});
