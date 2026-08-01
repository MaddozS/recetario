import { describe, expect, it, vi } from "vitest";

vi.mock("@recetario/db", () => ({
  getSubscriptionPlans: vi.fn(),
  getSubscriptionByUserId: vi.fn(),
  getSubscriptionPlanByStripePriceId: vi.fn(),
  getStripeCustomerId: vi.fn(),
}));

import { buildPricingPlans } from "./billing";

describe("buildPricingPlans", () => {
  it("returns enriched free, basic, and pro plans", () => {
    const plans = buildPricingPlans([
      { id: "basic_monthly", stripePriceId: "price_basic_m", priceCents: 999, currency: "mxn" },
      { id: "basic_yearly", stripePriceId: "price_basic_y", priceCents: 9590, currency: "mxn" },
      { id: "pro_monthly", stripePriceId: "price_pro_m", priceCents: 1999, currency: "mxn" },
      { id: "pro_yearly", stripePriceId: "price_pro_y", priceCents: 19190, currency: "mxn" },
    ]);

    expect(plans.map((plan) => plan.id)).toEqual(["free", "basic", "pro"]);
    expect(plans[1]).toMatchObject({
      monthlyPriceId: "price_basic_m",
      monthlyDisplay: "$9.99",
      yearlyPriceId: "price_basic_y",
      yearlyDisplay: "$95.90",
      yearlyPerMonthDisplay: "$7.99",
      currency: "MXN",
    });
    expect(plans[2]?.features.length).toBeGreaterThan(0);
  });
});
