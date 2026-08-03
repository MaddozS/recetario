import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  upsert: vi.fn(),
  updateMany: vi.fn(),
}));

vi.mock("./prisma", () => ({
  prisma: {
    subscriptionPlan: {
      upsert: mocks.upsert,
      updateMany: mocks.updateMany,
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import { syncPlans } from "./billing";

const plan = {
  id: "basic_monthly",
  tier: "basic",
  billingInterval: "monthly" as const,
  stripePriceId: "price_basic",
  priceCents: 999,
  currency: "mxn",
  name: "Basic",
  recipesLimit: 75,
  ingredientsLimit: null,
  featuresJson: "{}",
  active: true,
};

describe("syncPlans", () => {
  beforeEach(() => {
    mocks.upsert.mockReset();
    mocks.updateMany.mockReset();
  });

  it("upserts every plan and deactivates missing active plans", async () => {
    await syncPlans([plan]);
    expect(mocks.upsert).toHaveBeenCalledWith({
      where: { id: plan.id },
      update: plan,
      create: plan,
    });
    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: { id: { notIn: [plan.id] }, active: true },
      data: { active: false },
    });
  });

  it("no-ops safely on empty input", async () => {
    await syncPlans([]);
    expect(mocks.upsert).not.toHaveBeenCalled();
    expect(mocks.updateMany).not.toHaveBeenCalled();
  });
});
