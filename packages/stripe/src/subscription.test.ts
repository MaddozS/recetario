import { describe, expect, it } from "vitest";
import {
  canCreateIngredient,
  canCreateRecipe,
  getDefaultSubscription,
  getRemainingIngredients,
  getRemainingRecipes,
  hasFeature,
  isPaid,
  isPro,
  isUpgrade,
} from "./subscription";

describe("subscription helpers", () => {
  it("creates the free default with all free limits and disabled flags", () => {
    const subscription = getDefaultSubscription();
    expect(subscription.tier).toBe("free");
    expect(subscription.recipesLimit).toBe(10);
    expect(subscription.ingredientsLimit).toBe(30);
    expect(hasFeature(subscription, "recipe_duplicate")).toBe(false);
  });

  it("enforces finite limits and reports remaining capacity", () => {
    const subscription = getDefaultSubscription();
    expect(canCreateRecipe(subscription, 9)).toBe(true);
    expect(canCreateRecipe(subscription, 10)).toBe(false);
    expect(getRemainingRecipes(subscription, 13)).toBe(0);
    expect(canCreateIngredient(subscription, 29)).toBe(true);
    expect(getRemainingIngredients(subscription, 35)).toBe(0);
  });

  it("recognizes paid and pro tiers", () => {
    const basic = { ...getDefaultSubscription(), tier: "basic" as const };
    const pro = { ...getDefaultSubscription(), tier: "pro" as const };
    expect(isPaid(basic)).toBe(true);
    expect(isPro(basic)).toBe(false);
    expect(isPro(pro)).toBe(true);
  });

  it("correctly identifies upgrades and downgrades", () => {
    expect(isUpgrade({ tier: "basic", billingInterval: "monthly" }, { tier: "basic", billingInterval: "yearly" })).toBe(true);
    expect(isUpgrade({ tier: "basic", billingInterval: "monthly" }, { tier: "pro", billingInterval: "monthly" })).toBe(true);
    expect(isUpgrade({ tier: "pro", billingInterval: "monthly" }, { tier: "basic", billingInterval: "yearly" })).toBe(true);
    expect(isUpgrade({ tier: "basic", billingInterval: "yearly" }, { tier: "pro", billingInterval: "monthly" })).toBe(false);
    expect(isUpgrade({ tier: "pro", billingInterval: "monthly" }, { tier: "pro", billingInterval: "yearly" })).toBe(true);
    expect(isUpgrade({ tier: "pro", billingInterval: "yearly" }, { tier: "pro", billingInterval: "monthly" })).toBe(false);
    expect(isUpgrade({ tier: "pro", billingInterval: "monthly" }, { tier: "basic", billingInterval: "monthly" })).toBe(false);
    expect(isUpgrade({ tier: "pro", billingInterval: "yearly" }, { tier: "basic", billingInterval: "yearly" })).toBe(false);
  });
});

