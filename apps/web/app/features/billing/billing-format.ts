import { formatCurrency } from '@recetario/stripe/formatters';
import type { UserSubscriptionInfo } from '@recetario/types';
import type { BillingInterval } from './billing-interval';

/**
 * Formato de fechas e importes de facturación.
 *
 * El baseline descartaba fechas con año < 2025 (valores espurios del seed) y
 * separaba la moneda del importe; aquí se conserva ese contrato en piezas puras
 * cubiertas por `test/unit`.
 */

const MIN_DISPLAYABLE_YEAR = 2025;

function toDisplayableDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;

  const date = new Date(iso);
  if (Number.isNaN(date.getTime()) || date.getFullYear() < MIN_DISPLAYABLE_YEAR) {
    return null;
  }
  return date;
}

/** Fecha corta (`15/10/2026`) o `null` si el valor no es mostrable. */
export function formatBillingDate(iso: string | null | undefined): string | null {
  return toDisplayableDate(iso)?.toLocaleDateString('es-MX') ?? null;
}

/** Fecha larga para la confirmación (`15 de octubre de 2026`). */
export function formatLongBillingDate(iso: string | null | undefined): string | null {
  return (
    toDisplayableDate(iso)?.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }) ?? null
  );
}

export function planPriceSuffix(interval: BillingInterval | null): string {
  return interval === 'yearly' ? '/año' : '/mes';
}

/** Importe del plan (`$19.99`); `null` para Free o sin precio. */
export function formatSubscriptionPrice(subscription: UserSubscriptionInfo): string | null {
  if (subscription.tier === 'free' || subscription.priceCents == null) {
    return null;
  }
  return formatCurrency(subscription.priceCents / 100);
}

export function subscriptionCurrencyLabel(subscription: UserSubscriptionInfo): string {
  return subscription.currency?.toUpperCase() ?? '';
}
