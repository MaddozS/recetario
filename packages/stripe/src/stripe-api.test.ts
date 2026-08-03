import { describe, expect, it, vi } from "vitest";

const prices = vi.hoisted(() => vi.fn());
vi.mock("./stripe-client", () => ({
  stripe: { prices: { list: prices } },
}));

const { listPrices } = await import("./stripe-api");

describe("listPrices", () => {
  it("filters unknown tiers and maps Stripe prices to sync inputs", async () => {
    prices.mockResolvedValueOnce({
      data: [
        {
          id: "price_basic_monthly",
          unit_amount: 999,
          currency: "mxn",
          recurring: { interval: "month" },
          product: { name: "Basic", metadata: { tier: "basic", recipes_limit: "75" } },
        },
        {
          id: "price_unknown",
          unit_amount: 1,
          currency: "mxn",
          recurring: { interval: "month" },
          product: { name: "Unknown", metadata: { tier: "unknown" } },
        },
      ],
    });

    await expect(listPrices()).resolves.toEqual([
      expect.objectContaining({
        id: "basic_monthly",
        tier: "basic",
        billingInterval: "monthly",
        stripePriceId: "price_basic_monthly",
        priceCents: 999,
        recipesLimit: 75,
        featuresJson: expect.stringContaining("recipe_duplicate"),
      }),
    ]);
  });
});
