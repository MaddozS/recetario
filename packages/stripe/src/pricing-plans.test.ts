import { describe, expect, it, vi } from "vitest";

vi.mock("@recetario/db", () => ({
  getSubscriptionPlans: vi.fn(),
  getSubscriptionByUserId: vi.fn(),
  getSubscriptionPlanByStripePriceId: vi.fn(),
  getStripeCustomerId: vi.fn(),
}));

import { buildPricingPlans } from "./billing";
import { TIER_CONFIG } from "./plans-config";

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

/**
 * La matriz de `/pricing` identifica cada fila por su etiqueta: la frase del
 * plan cuando los tres coinciden, y una dimensión propia cuando las frases
 * cambian ("Hasta 10 recetas" / "Hasta 75 recetas" / "Recetas ilimitadas" son
 * tres frases, no un nombre). Sin este contrato, una fila con frases distintas
 * y sin etiqueta degradaría la tabla en silencio: el encabezado acabaría siendo
 * la frase de un solo plan.
 */
describe("etiquetas de fila de TIER_CONFIG", () => {
  const tiers = Object.values(TIER_CONFIG);
  const slots = Math.max(...tiers.map(({ features }) => features.length));

  it("toda fila con frases distintas por plan declara la misma etiqueta", () => {
    for (let index = 0; index < slots; index += 1) {
      const features = tiers
        .map(({ features }) => features[index])
        .filter((feature) => feature !== undefined);
      const texts = [...new Set(features.map(({ text }) => text))];
      if (texts.length < 2) continue;

      const context = `slot ${index} (${texts.join(" / ")})`;
      const labels = [...new Set(features.map(({ label }) => label))];
      expect(labels, context).toHaveLength(1);
      expect(labels[0], context).toBeTruthy();
    }
  });

  it("la forma del API conserva la etiqueta de fila", () => {
    const [free] = buildPricingPlans([]);
    expect(free?.features[0]?.label).toBe("Recetas");
  });
});
