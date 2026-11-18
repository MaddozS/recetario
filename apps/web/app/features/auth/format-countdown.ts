/**
 * Formato del countdown de restablecimiento (módulo puro y unit-testeable: el
 * proyecto `unit` de Vitest no resuelve `vue`).
 */

/** `MM:SS` con el formato del original (`00:00` al agotarse). */
export function formatCountdown(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
