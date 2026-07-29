import { formatCurrency } from "./formatters.js";
import { TIER_CONFIG } from "./plans-config.js";

export interface PricingPlan {
  id: string;
  tier: string;
  name: string;
  description: string;
  badge: { text: string; class: string } | null;
  currency: string;
  monthlyPriceId: string | null;
  monthlyDisplay: string | null;
  yearlyPriceId: string | null;
  yearlyDisplay: string | null;
  yearlyPerMonthDisplay: string | null;
  features: { text: string; included: boolean; status?: "coming_soon" }[];
}

export function buildPricingPlans(
  rawPlans: {
    id: string;
    stripePriceId: string;
    priceCents: number;
    currency: string;
  }[],
): PricingPlan[] {
  const priceMap: Record<
    string,
    { priceId: string; priceCents: number; currency: string }
  > = {};
  for (const plan of rawPlans) {
    priceMap[plan.id] = {
      priceId: plan.stripePriceId,
      priceCents: plan.priceCents,
      currency: plan.currency,
    };
  }

  const result: PricingPlan[] = [];

  for (const [tier, config] of Object.entries(TIER_CONFIG)) {
    if (tier === "free") {
      result.push({
        id: "free",
        tier: "free",
        name: config.name,
        description: config.description,
        badge: config.badge,
        currency: "USD",
        monthlyPriceId: null,
        monthlyDisplay: null,
        yearlyPriceId: null,
        yearlyDisplay: null,
        yearlyPerMonthDisplay: null,
        features: config.features,
      });
      continue;
    }

    const monthlyKey = `${tier}_monthly`;
    const yearlyKey = `${tier}_yearly`;

    const monthly = priceMap[monthlyKey] ?? null;
    const yearly = priceMap[yearlyKey] ?? null;

    const monthlyDisplay = monthly
      ? formatCurrency(monthly.priceCents / 100)
      : "—";
    const yearlyDisplay = yearly
      ? formatCurrency(yearly.priceCents / 100)
      : "—";
    const yearlyPerMonthDisplay = yearly
      ? formatCurrency(yearly.priceCents / 12 / 100)
      : "—";

    result.push({
      id: tier,
      tier,
      name: config.name,
      description: config.description,
      badge: config.badge,
      currency: (monthly?.currency ?? yearly?.currency ?? "MXN").toUpperCase(),
      monthlyPriceId: monthly?.priceId ?? null,
      monthlyDisplay,
      yearlyPriceId: yearly?.priceId ?? null,
      yearlyDisplay,
      yearlyPerMonthDisplay,
      features: config.features,
    });
  }

  return result;
}
