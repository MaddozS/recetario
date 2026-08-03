import type { Handler } from "hono";
import { auth } from "@recetario/auth/server";
import {
  getUserPreferences,
  createUserPreferences,
  getSubscriptionByUserId,
  getCredentialAccount,
} from "@recetario/db";
import { getDefaultSubscription } from "@recetario/stripe";
import {
  subscriptionResponseSchema,
  type UserSubscriptionInfo,
} from "@recetario/types";
import * as cache from "./cache";

const DEFAULT_THEME = "system" as const;
const DEFAULT_ACCENT = "coral" as const;
const CACHE_TTL_MS = 60_000;

function parseFeatures(raw: string | null | undefined): Record<string, boolean> {
  try {
    const value = JSON.parse(raw ?? "{}");
    return value && typeof value === "object"
      ? Object.fromEntries(
          Object.entries(value).map(([key, item]) => [key, Boolean(item)]),
        )
      : {};
  } catch {
    return {};
  }
}

async function resolveUserSubscription(
  userId: string,
): Promise<UserSubscriptionInfo> {
  const cacheKey = `sub:${userId}`;
  const cached = cache.get<UserSubscriptionInfo>(cacheKey);
  if (cached !== undefined) return cached;

  const dbSub = await getSubscriptionByUserId(userId, ["active", "trialing"]);
  if (!dbSub) {
    const defaultSub = getDefaultSubscription();
    cache.set(cacheKey, defaultSub, CACHE_TTL_MS);
    return defaultSub;
  }

  const subscription = subscriptionResponseSchema.parse({
    tier: dbSub.plan?.tier ?? "free",
    status: dbSub.status,
    recipesLimit: dbSub.plan?.recipesLimit ?? null,
    ingredientsLimit: dbSub.plan?.ingredientsLimit ?? null,
    features: parseFeatures(dbSub.plan?.featuresJson),
    priceCents: dbSub.plan?.priceCents ?? null,
    currency: dbSub.plan?.currency ?? null,
    billingInterval: dbSub.plan?.billingInterval ?? null,
    currentPeriodEnd: dbSub.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: dbSub.cancelAtPeriodEnd,
    isTrial: dbSub.status === "trialing",
    trialEnd: dbSub.trialEnd?.toISOString() ?? null,
  });

  cache.set(cacheKey, subscription, CACHE_TTL_MS);
  return subscription;
}

export function authSessionHandler(): Handler {
  return async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      return c.json(null);
    }

    const userId = session.user.id;
    const [existingPrefs, subscription, credentialAccount] = await Promise.all([
      getUserPreferences(userId),
      resolveUserSubscription(userId),
      getCredentialAccount(userId),
    ]);

    const prefs =
      existingPrefs ??
      (await createUserPreferences(userId, {
        theme: DEFAULT_THEME,
        accentColor: DEFAULT_ACCENT,
      }));

    return c.json({
      ...session,
      preferences: {
        userId: prefs.userId,
        theme: prefs.theme,
        accentColor: prefs.accentColor,
      },
      subscription,
      hasPasswordAuth: credentialAccount !== null,
    });
  };
}
