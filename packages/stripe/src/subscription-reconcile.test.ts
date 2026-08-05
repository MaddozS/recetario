import { describe, expect, it, vi } from "vitest";
import type Stripe from "stripe";
import {
  ReconcileStatus,
  reconcileSubscriptionWith,
} from "./subscription-reconcile";
import type { UserSubscriptionInfo } from "@recetario/types";

type Plan = {
  id: string;
  stripePriceId: string;
  name: string;
  tier: string;
  billingInterval: string;
  priceCents: number;
  currency: string;
  recipesLimit: number | null;
  ingredientsLimit: number | null;
  featuresJson: string;
  active: boolean;
};

type SubRow = {
  id: string;
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  planId: string;
  status: string;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: Date | null;
  createdAt: Date;
  plan: Plan | null;
};

function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: "pro_monthly",
    stripePriceId: "price_pro_monthly",
    name: "Pro",
    tier: "pro",
    billingInterval: "monthly",
    priceCents: 1999,
    currency: "mxn",
    recipesLimit: null,
    ingredientsLimit: null,
    featuresJson: JSON.stringify({ recipe_duplicate: true, pdf_export: true }),
    active: true,
    ...overrides,
  };
}

function makeSub(overrides: Partial<SubRow> = {}): SubRow {
  return {
    id: "sub-row-1",
    userId: "user-1",
    stripeCustomerId: "cus_123",
    stripeSubscriptionId: "sub_123",
    planId: "pro_monthly",
    status: "active",
    currentPeriodStart: new Date("2025-01-01T00:00:00Z"),
    currentPeriodEnd: new Date("2030-01-01T00:00:00Z"),
    cancelAtPeriodEnd: false,
    trialEnd: null,
    createdAt: new Date("2025-01-01T00:00:00Z"),
    plan: makePlan(),
    ...overrides,
  };
}

type DbMocks = {
  getSubscriptionByUserId: ReturnType<typeof vi.fn>;
  upsertSubscription: ReturnType<typeof vi.fn>;
  getSubscriptionPlanByStripePriceId: ReturnType<typeof vi.fn>;
};

type StripeMocks = {
  retrieveSubscription: ReturnType<typeof vi.fn>;
  getSubscriptionSchedules: ReturnType<typeof vi.fn>;
};

function makeDeps() {
  const db: DbMocks = {
    getSubscriptionByUserId: vi.fn().mockResolvedValue(null),
    upsertSubscription: vi.fn().mockResolvedValue(undefined),
    getSubscriptionPlanByStripePriceId: vi.fn().mockResolvedValue(null),
  };
  const stripe: StripeMocks = {
    retrieveSubscription: vi.fn().mockResolvedValue(null),
    getSubscriptionSchedules: vi.fn().mockResolvedValue(null),
  };
  const log = vi.fn();
  return { db, stripe, log };
}

describe("reconcileSubscriptionWith", () => {
  it("returns null when no DB row exists", async () => {
    const { db, stripe, log } = makeDeps();
    const reconcile = reconcileSubscriptionWith({ db, stripe, log });

    db.getSubscriptionByUserId.mockResolvedValue(null);
    const result = await reconcile("user-1");

    expect(result).toBeNull();
    expect(db.getSubscriptionByUserId).toHaveBeenCalledWith("user-1", [
      ReconcileStatus.Active,
      ReconcileStatus.Trialing,
      ReconcileStatus.Canceled,
      ReconcileStatus.PastDue,
    ]);
    expect(stripe.retrieveSubscription).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
  });

  it("shapes from the DB row alone when there is no Stripe id", async () => {
    const { db, stripe, log } = makeDeps();
    const reconcile = reconcileSubscriptionWith({ db, stripe, log });
    db.getSubscriptionByUserId.mockResolvedValue(makeSub({ stripeSubscriptionId: null }));

    const result = await reconcile("user-1");

    expect(result).toMatchObject({
      tier: "pro",
      status: "active",
      recipesLimit: null,
      ingredientsLimit: null,
      features: { recipe_duplicate: true, pdf_export: true },
      priceCents: 1999,
      currency: "mxn",
      billingInterval: "monthly",
      currentPeriodEnd: "2030-01-01T00:00:00.000Z",
      cancelAtPeriodEnd: false,
      isTrial: false,
      trialEnd: null,
      scheduledChange: null,
    });
    expect(stripe.retrieveSubscription).not.toHaveBeenCalled();
  });

  it("detects status drift and writes the exact upsert + live status", async () => {
    const { db, stripe, log } = makeDeps();
    const reconcile = reconcileSubscriptionWith({ db, stripe, log });
    const sub = makeSub();
    db.getSubscriptionByUserId.mockResolvedValue(sub);
    stripe.retrieveSubscription.mockResolvedValue({
      status: "past_due",
      cancel_at_period_end: false,
      cancel_at: null,
      current_period_end: 1893456000, // 2030-01-01
    } as unknown as Stripe.Subscription);

    const result = await reconcile("user-1");

    expect(db.upsertSubscription).toHaveBeenCalledWith("sub_123", {
      id: "sub_123",
      userId: "user-1",
      stripeCustomerId: "cus_123",
      planId: "pro_monthly",
      status: "past_due",
      currentPeriodStart: new Date("2025-01-01T00:00:00Z"),
      currentPeriodEnd: new Date("2030-01-01T00:00:00.000Z"),
      cancelAtPeriodEnd: false,
      trialEnd: null,
    });
    expect(result?.status).toBe("past_due");
    expect(result?.currentPeriodEnd).toBe("2030-01-01T00:00:00.000Z");
    expect(result?.cancelAtPeriodEnd).toBe(false);
    expect(log).not.toHaveBeenCalled();
  });

  it("does not write when status and cancel match the DB", async () => {
    const { db, stripe, log } = makeDeps();
    const reconcile = reconcileSubscriptionWith({ db, stripe, log });
    const sub = makeSub();
    db.getSubscriptionByUserId.mockResolvedValue(sub);
    stripe.retrieveSubscription.mockResolvedValue({
      status: "active",
      cancel_at_period_end: false,
      cancel_at: null,
    } as unknown as Stripe.Subscription);

    const result = await reconcile("user-1");

    expect(db.upsertSubscription).not.toHaveBeenCalled();
    expect(result?.status).toBe("active");
    expect(result?.currentPeriodEnd).toBe("2030-01-01T00:00:00.000Z");
  });

  it("detects cancel drift and sets cancelAtPeriodEnd from live data", async () => {
    const { db, stripe, log } = makeDeps();
    const reconcile = reconcileSubscriptionWith({ db, stripe, log });
    const sub = makeSub();
    db.getSubscriptionByUserId.mockResolvedValue(sub);
    stripe.retrieveSubscription.mockResolvedValue({
      status: "active",
      cancel_at_period_end: true,
      cancel_at: null,
    } as unknown as Stripe.Subscription);

    const result = await reconcile("user-1");

    expect(db.upsertSubscription).toHaveBeenCalledTimes(1);
    expect(result?.cancelAtPeriodEnd).toBe(true);
  });

  it("treats a live cancel_at signal as cancel drift", async () => {
    const { db, stripe, log } = makeDeps();
    const reconcile = reconcileSubscriptionWith({ db, stripe, log });
    const sub = makeSub();
    db.getSubscriptionByUserId.mockResolvedValue(sub);
    stripe.retrieveSubscription.mockResolvedValue({
      status: "active",
      cancel_at_period_end: false,
      cancel_at: 1893456000, // future
    } as unknown as Stripe.Subscription);

    const result = await reconcile("user-1");

    expect(db.upsertSubscription).toHaveBeenCalledTimes(1);
    expect(result?.cancelAtPeriodEnd).toBe(true);
  });

  it("populates scheduledChange from the schedule happy path", async () => {
    const { db, stripe, log } = makeDeps();
    const reconcile = reconcileSubscriptionWith({ db, stripe, log });
    db.getSubscriptionByUserId.mockResolvedValue(makeSub());
    stripe.retrieveSubscription.mockResolvedValue({
      status: "active",
      cancel_at_period_end: false,
      cancel_at: null,
      schedule: "sub_sched_123",
    } as unknown as Stripe.Subscription);
    stripe.getSubscriptionSchedules.mockResolvedValue({
      phases: [
        { start_date: 1767225600 },
        { items: [{ price: "price_basic_monthly" }], start_date: 1893456000 },
      ],
    } as unknown as Stripe.SubscriptionSchedule);
    db.getSubscriptionPlanByStripePriceId.mockResolvedValue(
      makePlan({ tier: "basic", billingInterval: "monthly", name: "Basic" }),
    );

    const result = await reconcile("user-1");

    expect(result?.scheduledChange).toEqual({
      targetTier: "basic",
      targetPlanName: "Basic",
      targetInterval: "monthly",
      effectiveDate: "2030-01-01T00:00:00.000Z",
    });
    expect(db.upsertSubscription).not.toHaveBeenCalled();
  });

  it("returns null scheduledChange when the next plan price does not resolve", async () => {
    const { db, stripe, log } = makeDeps();
    const reconcile = reconcileSubscriptionWith({ db, stripe, log });
    db.getSubscriptionByUserId.mockResolvedValue(makeSub());
    stripe.retrieveSubscription.mockResolvedValue({
      status: "active",
      cancel_at_period_end: false,
      schedule: "sub_sched_123",
    } as unknown as Stripe.Subscription);
    stripe.getSubscriptionSchedules.mockResolvedValue({
      phases: [
        { start_date: 1767225600 },
        { items: [{ price: "price_unknown" }], start_date: 1893456000 },
      ],
    } as unknown as Stripe.SubscriptionSchedule);
    db.getSubscriptionPlanByStripePriceId.mockResolvedValue(null);

    const result = await reconcile("user-1");

    expect(result?.scheduledChange).toBeNull();
  });

  it("returns null scheduledChange when the schedule has a single phase", async () => {
    const { db, stripe, log } = makeDeps();
    const reconcile = reconcileSubscriptionWith({ db, stripe, log });
    db.getSubscriptionByUserId.mockResolvedValue(makeSub());
    stripe.retrieveSubscription.mockResolvedValue({
      status: "active",
      cancel_at_period_end: false,
      schedule: "sub_sched_123",
    } as unknown as Stripe.Subscription);
    stripe.getSubscriptionSchedules.mockResolvedValue({
      phases: [{ items: [{ price: "price_pro_monthly" }], start_date: 1767225600 }],
    } as unknown as Stripe.SubscriptionSchedule);

    const result = await reconcile("user-1");

    expect(result?.scheduledChange).toBeNull();
  });

  it("returns null scheduledChange and still shapes when the schedule read fails", async () => {
    const { db, stripe, log } = makeDeps();
    const reconcile = reconcileSubscriptionWith({ db, stripe, log });
    db.getSubscriptionByUserId.mockResolvedValue(makeSub());
    stripe.retrieveSubscription.mockResolvedValue({
      status: "active",
      cancel_at_period_end: false,
      schedule: "sub_sched_123",
    } as unknown as Stripe.Subscription);
    stripe.getSubscriptionSchedules.mockRejectedValue(new Error("stripe down"));

    const result = await reconcile("user-1");

    expect(result).not.toBeNull();
    expect(result?.scheduledChange).toBeNull();
    expect(log).toHaveBeenCalledTimes(1);
  });

  it("propagates DB plan-lookup errors instead of falling back", async () => {
    const { db, stripe, log } = makeDeps();
    const reconcile = reconcileSubscriptionWith({ db, stripe, log });
    db.getSubscriptionByUserId.mockResolvedValue(makeSub());
    stripe.retrieveSubscription.mockResolvedValue({
      status: "active",
      cancel_at_period_end: false,
      schedule: "sub_sched_123",
    } as unknown as Stripe.Subscription);
    stripe.getSubscriptionSchedules.mockResolvedValue({
      phases: [
        { start_date: 1767225600 },
        { items: [{ price: "price_basic_monthly" }], start_date: 1893456000 },
      ],
    } as unknown as Stripe.SubscriptionSchedule);
    db.getSubscriptionPlanByStripePriceId.mockRejectedValue(
      new Error("plan lookup failed"),
    );

    await expect(reconcile("user-1")).rejects.toThrow("plan lookup failed");
    expect(log).not.toHaveBeenCalled();
  });

  it("falls back to DB state and logs when the Stripe read fails", async () => {
    const { db, stripe, log } = makeDeps();
    const reconcile = reconcileSubscriptionWith({ db, stripe, log });
    const sub = makeSub();
    db.getSubscriptionByUserId.mockResolvedValue(sub);
    stripe.retrieveSubscription.mockRejectedValue(new Error("network"));

    const result = await reconcile("user-1");

    expect(result).toMatchObject({
      tier: "pro",
      status: "active",
      currentPeriodEnd: "2030-01-01T00:00:00.000Z",
      cancelAtPeriodEnd: false,
      scheduledChange: null,
    });
    expect(log).toHaveBeenCalledWith(
      "Subscription reconcile failed; falling back to DB state",
      expect.any(Error),
    );
    expect(db.upsertSubscription).not.toHaveBeenCalled();
  });

  it("returns null for a canceled subscription past its period end (after writing drift)", async () => {
    const { db, stripe, log } = makeDeps();
    const reconcile = reconcileSubscriptionWith({ db, stripe, log });
    const sub = makeSub({
      status: "active",
      cancelAtPeriodEnd: false,
      currentPeriodEnd: new Date("2024-01-01T00:00:00Z"),
    });
    db.getSubscriptionByUserId.mockResolvedValue(sub);
    stripe.retrieveSubscription.mockResolvedValue({
      status: "canceled",
      cancel_at_period_end: true,
      cancel_at: null,
      current_period_end: 1704067200, // 2024-01-01, in the past
    } as unknown as Stripe.Subscription);

    const result = await reconcile("user-1");

    expect(result).toBeNull();
    expect(db.upsertSubscription).toHaveBeenCalledTimes(1);
  });

  it("keeps returning a canceled subscription within its grace period", async () => {
    const { db, stripe, log } = makeDeps();
    const reconcile = reconcileSubscriptionWith({ db, stripe, log });
    const sub = makeSub({
      status: "canceled",
      cancelAtPeriodEnd: true,
      currentPeriodEnd: new Date("2030-01-01T00:00:00Z"),
    });
    db.getSubscriptionByUserId.mockResolvedValue(sub);

    const result = await reconcile("user-1");

    expect(result).not.toBeNull();
    expect(result?.status).toBe("canceled");
    expect(result?.cancelAtPeriodEnd).toBe(true);
  });

  it("does not treat a canceled row with a null period end as expired", async () => {
    const { db, stripe, log } = makeDeps();
    const reconcile = reconcileSubscriptionWith({ db, stripe, log });
    const sub = makeSub({
      status: "canceled",
      cancelAtPeriodEnd: true,
      currentPeriodEnd: null,
    });
    db.getSubscriptionByUserId.mockResolvedValue(sub);

    const result = await reconcile("user-1");

    expect(result).not.toBeNull();
    expect(result?.status).toBe("canceled");
    expect(result?.currentPeriodEnd).toBeNull();
  });

  it("derives isTrial from the reconciled status", async () => {
    const { db, stripe, log } = makeDeps();
    const reconcile = reconcileSubscriptionWith({ db, stripe, log });
    db.getSubscriptionByUserId.mockResolvedValue(makeSub({ status: "trialing" }));

    const result = await reconcile("user-1");

    expect(result?.status).toBe("trialing");
    expect(result?.isTrial).toBe(true);
  });

  it("shapes as free-tier when the plan row is missing", async () => {
    const { db, stripe, log } = makeDeps();
    const reconcile = reconcileSubscriptionWith({ db, stripe, log });
    db.getSubscriptionByUserId.mockResolvedValue(
      makeSub({ plan: null, planId: "missing_plan" }),
    );

    const result = await reconcile("user-1");

    expect(result).toMatchObject({
      tier: "free",
      status: "active",
      recipesLimit: null,
      ingredientsLimit: null,
      features: {},
      priceCents: null,
      currency: null,
      billingInterval: null,
    });
  });

  it("falls back to the DB period end when the live one is missing on drift", async () => {
    const { db, stripe, log } = makeDeps();
    const reconcile = reconcileSubscriptionWith({ db, stripe, log });
    const sub = makeSub({
      status: "active",
      currentPeriodEnd: new Date("2030-01-01T00:00:00Z"),
    });
    db.getSubscriptionByUserId.mockResolvedValue(sub);
    stripe.retrieveSubscription.mockResolvedValue({
      status: "past_due",
      cancel_at_period_end: false,
      cancel_at: null,
      current_period_end: undefined,
    } as unknown as Stripe.Subscription);

    const result = await reconcile("user-1");

    expect(db.upsertSubscription).toHaveBeenCalledWith(
      "sub_123",
      expect.objectContaining({
        currentPeriodEnd: new Date("2030-01-01T00:00:00Z"),
      }),
    );
    expect(result?.currentPeriodEnd).toBe("2030-01-01T00:00:00.000Z");
  });

  it("propagates DB read errors instead of falling back", async () => {
    const { db, stripe, log } = makeDeps();
    const reconcile = reconcileSubscriptionWith({ db, stripe, log });
    db.getSubscriptionByUserId.mockRejectedValue(new Error("db down"));

    await expect(reconcile("user-1")).rejects.toThrow("db down");
    expect(log).not.toHaveBeenCalled();
  });

  it("propagates DB write errors instead of falling back", async () => {
    const { db, stripe, log } = makeDeps();
    const reconcile = reconcileSubscriptionWith({ db, stripe, log });
    db.getSubscriptionByUserId.mockResolvedValue(makeSub());
    db.upsertSubscription.mockRejectedValue(new Error("write failed"));
    stripe.retrieveSubscription.mockResolvedValue({
      status: "past_due",
      cancel_at_period_end: false,
      cancel_at: null,
    } as unknown as Stripe.Subscription);

    await expect(reconcile("user-1")).rejects.toThrow("write failed");
    expect(log).not.toHaveBeenCalled();
  });
});
