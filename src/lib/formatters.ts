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
