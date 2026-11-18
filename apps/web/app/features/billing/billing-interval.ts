/** Intervalo de facturación elegido en las vistas de planes. */
export type BillingInterval = 'monthly' | 'yearly';

export const BILLING_INTERVALS: readonly BillingInterval[] = ['monthly', 'yearly'];

export const BILLING_INTERVAL_LABELS: Record<BillingInterval, string> = {
  monthly: 'Mensual',
  yearly: 'Anual',
};
