import type { UserSubscriptionInfo } from "@recetario/types";
import type { BillingInterval } from "./billing-interval";
import { formatBillingDate } from "./billing-format";

/**
 * Estado y copys del cambio de plan, portados del `PricingModal`.
 *
 * Puro y sin aliases: cubierto por `test/unit`. El baseline recalculaba estas
 * reglas mutando `data-*` del DOM; aquí se derivan del estado.
 */

const TIER_RANKS: Record<string, number> = { free: 0, basic: 1, pro: 2 };

const TIER_LABELS: Record<string, string> = {
  free: "Free",
  basic: "Basic",
  pro: "Pro",
};

export const RECIPES_WARNING_THRESHOLD = 3;
export const INGREDIENTS_WARNING_THRESHOLD = 5;

export function tierRank(tier: string): number {
  return TIER_RANKS[tier] ?? 0;
}

/**
 * Mensual → anual siempre es upgrade (se cobra el periodo completo) y
 * anual → mensual siempre es downgrade; si no, decide el rango del tier.
 */
export function isPlanChangeUpgrade(
  currentTier: string,
  currentInterval: BillingInterval,
  targetTier: string,
  targetInterval: BillingInterval,
): boolean {
  if (currentInterval === "monthly" && targetInterval === "yearly") return true;
  if (currentInterval === "yearly" && targetInterval === "monthly")
    return false;
  return tierRank(targetTier) > tierRank(currentTier);
}

export type PlanActionKind = "free" | "current" | "upgrade" | "downgrade";

export type PlanAction = {
  kind: PlanActionKind;
  label: string;
  disabled: boolean;
  isUpgrade: boolean;
};

/** Etiqueta y estado del CTA de un plan dentro del selector. */
export function planAction(
  currentTier: string,
  currentInterval: BillingInterval,
  targetTier: string,
  targetInterval: BillingInterval,
): PlanAction {
  if (targetTier === "free") {
    return {
      kind: "free",
      label: "Plan actual",
      disabled: true,
      isUpgrade: false,
    };
  }

  if (targetTier === currentTier && targetInterval === currentInterval) {
    return {
      kind: "current",
      label: "Plan actual",
      disabled: true,
      isUpgrade: false,
    };
  }

  const isUpgrade = isPlanChangeUpgrade(
    currentTier,
    currentInterval,
    targetTier,
    targetInterval,
  );

  if (isUpgrade) {
    return {
      kind: "upgrade",
      label: `Actualizar a ${TIER_LABELS[targetTier] ?? targetTier}`,
      disabled: false,
      isUpgrade,
    };
  }

  return {
    kind: "downgrade",
    label: targetTier === "pro" ? "Cambiar a Pro Mensual" : "Cambiar a Basic",
    disabled: false,
    isUpgrade,
  };
}

export function planDisplayName(tier: string): string {
  return `KitchCalc ${TIER_LABELS[tier] ?? tier}`;
}

/** `BASIC Mensual` — así se muestra el plan vigente en la confirmación. */
export function currentPlanLabel(
  tier: string,
  interval: BillingInterval,
): string {
  return `${tier.toUpperCase()} ${interval === "yearly" ? "Anual" : "Mensual"}`;
}

/** `KitchCalc Pro Anual` — el plan destino en la confirmación. */
export function targetPlanLabel(
  planName: string,
  interval: BillingInterval,
): string {
  return `${planName} ${interval === "yearly" ? "Anual" : "Mensual"}`;
}

export type PlanChangeCopy = {
  title: string;
  description: string;
  chargeDetails: string;
  tone: "upgrade" | "downgrade";
};

export function planChangeCopy(options: {
  isUpgrade: boolean;
  currentPlanName: string;
  targetPlanName: string;
  effectiveDate: string;
}): PlanChangeCopy {
  const { isUpgrade, currentPlanName, targetPlanName, effectiveDate } = options;

  if (isUpgrade) {
    return {
      title: "Cambio inmediato (Upgrade)",
      description: `Tu suscripción se actualizará de forma inmediata al plan ${targetPlanName}. Se aplicará el prorrateo ajustado de tus días restantes.`,
      chargeDetails:
        "Se procesará el cobro inmediato correspondiente a la actualización en Stripe.",
      tone: "upgrade",
    };
  }

  return {
    title: "Cambio programado (Downgrade)",
    description: `Tu plan actual (${currentPlanName}) seguirá activo con todas sus funciones hasta ${effectiveDate}. El nuevo plan (${targetPlanName}) comenzará a partir de esa fecha.`,
    chargeDetails: `No se realizará ningún cobro el día de hoy. El cobro del nuevo plan se aplicará cuando inicie el próximo periodo de facturación (${effectiveDate}).`,
    tone: "downgrade",
  };
}

/**
 * Línea de estado del plan actual. El orden de prioridad es el del baseline:
 * cambio programado → cancelación → prueba → renovación.
 */
export function subscriptionSummaryLine(
  subscription: UserSubscriptionInfo,
): string {
  if (subscription.tier === "free") return "Gratis para siempre";

  const periodEnd = formatBillingDate(subscription.currentPeriodEnd);
  const trialEnd = formatBillingDate(subscription.trialEnd) ?? periodEnd;

  if (subscription.scheduledChange && periodEnd) {
    return `Cambiará a ${subscription.scheduledChange.targetPlanName} el ${periodEnd}`;
  }

  if (subscription.cancelAtPeriodEnd && periodEnd) {
    return `Se cancelará el ${periodEnd}`;
  }

  if (subscription.isTrial && trialEnd) {
    return `Prueba hasta el ${trialEnd}`;
  }

  if (periodEnd) {
    return `Se renueva el ${periodEnd}`;
  }

  return "Renovación recurrente";
}

/** Ancho de la barra de uso; `0` cuando el plan es ilimitado. */
export function usagePercentage(count: number, limit: number | null): number {
  if (limit === null || limit <= 0) return 0;
  return Math.min(100, (count / limit) * 100);
}

export function showsLowRemainingWarning(
  remaining: number | null,
  threshold: number,
): boolean {
  return remaining !== null && remaining <= threshold;
}
