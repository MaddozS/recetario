/**
 * Formato y aritmética de presentación del detalle de receta.
 *
 * Módulo puro: cubierto en `test/unit`. `formatLastUpdated` acepta `now` para
 * poder testear sin depender del reloj.
 */

const HALF_UP = (value: number) => (value >= 0 ? Math.floor(value + 0.5) : Math.ceil(value - 0.5));

/** g/ml se muestran como entero (redondeo contable); el resto con 2 decimales. */
export function formatCantidad(cantidad: number, unidad: string): string {
  const u = unidad.toLowerCase();
  const ajustada = u === 'g' || u === 'ml' ? HALF_UP(cantidad) : cantidad;
  return u === 'g' || u === 'ml' ? ajustada.toString() : ajustada.toFixed(2);
}

/** «hoy 10:00 a. m.» si es de hoy; «14/9/2026 10:00 a. m.» si no. */
export function formatLastUpdated(updatedAt: string | undefined, now: Date = new Date()): string {
  if (!updatedAt) return '';

  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return '';

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const time = date.toLocaleTimeString('es-MX', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  return isToday ? `hoy ${time}` : `${date.toLocaleDateString('es-MX')} ${time}`;
}

export function clampPercentage(value: number, max = Number.POSITIVE_INFINITY): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(max, Math.max(0, value));
}

/** `?multiplier=`: cualquier valor inválido o < 0.01 cae a 1 / 0.01. */
export function parseMultiplierParam(raw: unknown): number {
  const parsed = typeof raw === 'string' ? Number.parseFloat(raw) : Number.NaN;
  return Math.max(Number.isFinite(parsed) ? parsed : 1, 0.01);
}

/** Cuatro decimales, como el `onchange` heredado. */
export function normalizeMultiplier(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/** El paso crece a 1 unidad cuando la mezcla ya es de 2 o más. */
export function multiplierStepFor(value: number): number {
  return value >= 2 ? 1 : 0.5;
}

export function showAdjustedQuantity(multiplier: number): boolean {
  return Math.abs(multiplier - 1) > 0.0001;
}
