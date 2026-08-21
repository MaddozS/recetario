import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    $executeRawUnsafe: vi.fn().mockResolvedValue(undefined),
    subscription: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    stripeEventAttempt: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    checkoutIntent: {
      update: vi.fn(),
    },
  };
  const prisma = {
    $transaction: vi.fn((fn: (t: typeof tx) => unknown) => fn(tx)),
    checkoutIntent: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    stripeEventAttempt: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    subscription: {
      findUnique: vi.fn(),
    },
  };
  const invalidateAccelerateCache = vi.fn();
  return { prisma, tx, invalidateAccelerateCache };
});

vi.mock("./prisma", () => ({
  prisma: mocks.prisma,
  invalidateAccelerateCache: mocks.invalidateAccelerateCache,
  userCacheTag: (userId: string) => `user_${userId}`,
}));

import {
  createCheckoutIntent,
  getCheckoutIntentBySession,
  applySubscriptionMutation,
  recordFailedEventAttempt,
  getLatestEventAttempt,
  upsertSubscriptionAndConsumeIntent,
  type EventAttemptInput,
} from "./billing-ingestion";

const attempt: EventAttemptInput = {
  stripeEventId: "evt_1",
  attemptNumber: 1,
  eventType: "checkout.session.completed",
  stripeCreated: 1700000000n,
  stripeSubscriptionId: "sub_123",
  outcome: "applied",
};

const mutation = {
  userId: "user-1",
  stripeCustomerId: "cus_123",
  planId: "pro_monthly",
  status: "active",
  currentPeriodStart: new Date("2026-01-01T00:00:00Z"),
  currentPeriodEnd: new Date("2026-02-01T00:00:00Z"),
  cancelAtPeriodEnd: false,
  trialEnd: null,
};

beforeEach(() => {
  for (const model of Object.values(mocks.prisma)) {
    for (const method of Object.values(model as Record<string, unknown>)) {
      if (typeof method === "function" && "mockReset" in method) {
        (method as ReturnType<typeof vi.fn>).mockReset();
      }
    }
  }
  for (const model of Object.values(mocks.tx)) {
    for (const method of Object.values(model as Record<string, unknown>)) {
      if (typeof method === "function" && "mockReset" in method) {
        (method as ReturnType<typeof vi.fn>).mockReset();
      }
    }
  }
  mocks.invalidateAccelerateCache.mockReset();
});

describe("checkout intent persistence", () => {
  it("creates a pending intent with the bound identities", async () => {
    mocks.prisma.checkoutIntent.create.mockResolvedValue({ id: "i1" });
    await createCheckoutIntent({
      userId: "user-1",
      checkoutSessionId: "cs_123",
      stripeCustomerId: "cus_123",
      priceId: "price_pro",
      expiresAt: new Date("2026-01-02T00:00:00Z"),
    });
    expect(mocks.prisma.checkoutIntent.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        checkoutSessionId: "cs_123",
        stripeCustomerId: "cus_123",
        priceId: "price_pro",
        expiresAt: new Date("2026-01-02T00:00:00Z"),
        state: "pending",
      },
    });
  });

  it("looks intents up by session", async () => {
    mocks.prisma.checkoutIntent.findUnique.mockResolvedValue({ id: "i1" });
    await getCheckoutIntentBySession("cs_123");
    expect(mocks.prisma.checkoutIntent.findUnique).toHaveBeenCalledWith({
      where: { checkoutSessionId: "cs_123" },
    });
  });
});

describe("applySubscriptionMutation", () => {
  it("applies the mutation and attempt atomically under advisory locks", async () => {
    mocks.tx.stripeEventAttempt.findFirst.mockResolvedValue(null);
    mocks.tx.subscription.findUnique.mockResolvedValue(null);
    mocks.tx.subscription.upsert.mockResolvedValue({});

    const result = await applySubscriptionMutation("sub_123", mutation, attempt);

    expect(result).toEqual({ applied: true });
    expect(mocks.tx.$executeRawUnsafe).toHaveBeenCalledTimes(2);
    expect(mocks.tx.subscription.upsert).toHaveBeenCalledWith({
      where: { stripeSubscriptionId: "sub_123" },
      update: mutation,
      create: {
        ...mutation,
        id: "sub_123",
        stripeSubscriptionId: "sub_123",
      },
    });
    expect(mocks.tx.stripeEventAttempt.create).toHaveBeenCalledWith({
      data: { ...attempt, outcome: "applied" },
    });
    expect(mocks.invalidateAccelerateCache).toHaveBeenCalledWith(["user_user-1"]);
  });

  it("consumes a Checkout intent to the resulting subscription in the same transaction", async () => {
    mocks.tx.stripeEventAttempt.findFirst.mockResolvedValue(null);
    mocks.tx.subscription.findUnique.mockResolvedValue(null);
    mocks.tx.subscription.upsert.mockResolvedValue({});

    const result = await applySubscriptionMutation(
      "sub_123",
      mutation,
      attempt,
      "intent-1",
    );

    expect(result).toEqual({ applied: true });
    expect(mocks.tx.checkoutIntent.update).toHaveBeenCalledWith({
      where: { id: "intent-1" },
      data: {
        state: "consumed",
        stripeSubscriptionId: "sub_123",
        consumedAt: expect.any(Date),
      },
    });
    expect(mocks.invalidateAccelerateCache).toHaveBeenCalledWith(["user_user-1"]);
  });

  it("records an ignored duplicate when a terminal attempt already exists", async () => {
    mocks.tx.stripeEventAttempt.findFirst.mockResolvedValue({
      attemptNumber: 1,
      outcome: "applied",
    });

    const result = await applySubscriptionMutation("sub_123", mutation, attempt);

    expect(result).toEqual({ applied: false, ignored: true, reason: "duplicate" });
    expect(mocks.tx.subscription.upsert).not.toHaveBeenCalled();
    expect(mocks.tx.stripeEventAttempt.create).toHaveBeenCalledWith({
      data: { ...attempt, outcome: "ignored", ignoredReason: "duplicate" },
    });
  });

  it("records an ignored stale attempt when the event is older than the terminal cursor", async () => {
    mocks.tx.stripeEventAttempt.findFirst.mockResolvedValueOnce(null); // no terminal for this event
    mocks.tx.stripeEventAttempt.findFirst.mockResolvedValueOnce({
      stripeCreated: 2000000000n,
      stripeEventId: "evt_newer",
    });

    const result = await applySubscriptionMutation(
      "sub_123",
      mutation,
      { ...attempt, stripeCreated: 1000000000n },
    );

    expect(result).toEqual({ applied: false, ignored: true, reason: "stale" });
    expect(mocks.tx.subscription.upsert).not.toHaveBeenCalled();
    expect(mocks.tx.stripeEventAttempt.create).toHaveBeenCalledWith({
      data: {
        ...attempt,
        stripeCreated: 1000000000n,
        outcome: "ignored",
        ignoredReason: "stale",
      },
    });
  });
});

describe("snapshot upsert with intent consumption", () => {
  it("upserts the subscription and consumes the intent atomically", async () => {
    mocks.tx.subscription.upsert.mockResolvedValue({ id: "sub_123" });

    await upsertSubscriptionAndConsumeIntent("sub_123", mutation, "intent-1");

    expect(mocks.tx.subscription.upsert).toHaveBeenCalledWith({
      where: { stripeSubscriptionId: "sub_123" },
      update: mutation,
      create: { ...mutation, id: "sub_123", stripeSubscriptionId: "sub_123" },
    });
    expect(mocks.tx.checkoutIntent.update).toHaveBeenCalledWith({
      where: { id: "intent-1" },
      data: {
        state: "consumed",
        stripeSubscriptionId: "sub_123",
        consumedAt: expect.any(Date),
      },
    });
    expect(mocks.invalidateAccelerateCache).toHaveBeenCalledWith(["user_user-1"]);
  });
});

describe("event attempt helpers", () => {
  it("records failed attempts with failure detail", async () => {
    mocks.prisma.stripeEventAttempt.create.mockResolvedValue({});
    await recordFailedEventAttempt({
      ...attempt,
      outcome: "failed",
      failureMessage: "boom",
    });
    expect(mocks.prisma.stripeEventAttempt.create).toHaveBeenCalledWith({
      data: { ...attempt, outcome: "failed", failureMessage: "boom" },
    });
  });

  it("reads the latest attempt sequence regardless of outcome", async () => {
    mocks.prisma.stripeEventAttempt.findFirst.mockResolvedValue({
      attemptNumber: 2,
    });
    const result = await getLatestEventAttempt("evt_1");
    expect(mocks.prisma.stripeEventAttempt.findFirst).toHaveBeenCalledWith({
      where: { stripeEventId: "evt_1" },
      orderBy: { attemptNumber: "desc" },
      select: { attemptNumber: true },
    });
    expect(result).toEqual({ attemptNumber: 2 });
  });
});
