/**
 * Formatea un número como moneda en pesos mexicanos.
 *
 * Siempre muestra dos decimales, anteponiendo el signo `$`.
 *
 * @example
 * formatCurrency(45)     // → "$45.00"
 * formatCurrency(12.5)   // → "$12.50"
 */
export const formatCurrency = (value: number): string => `$${value.toFixed(2)}`;

export function timeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return 'ahora';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'ayer';
  if (days < 30) return `hace ${days} días`;
  const months = Math.floor(days / 30);
  if (months === 1) return 'hace 1 mes';
  if (months < 12) return `hace ${months} meses`;
  const years = Math.floor(months / 12);
  if (years === 1) return 'hace 1 año';
  return `hace ${years} años`;
}
