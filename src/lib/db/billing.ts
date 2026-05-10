/**
 * Operaciones CRUD para billing: planes de suscripción y suscripciones activas.
 *
 * Soporta ambos backends (Postgres y SQLite) con queries
 * parametrizadas según el tipo de driver.
 */

import { getDriver, ensureInitialized } from "./connection";

const BASIC_FEATURES: Record<string, boolean> = {
  recipe_duplicate: true,
  recipe_photos: true,
  stock_tracking: true,
  production_planner: false,
  pdf_export: false,
  advanced_costs: false,
  change_history: false,
  data_import_export: false,
  nutrition_info: false,
};

const PRO_FEATURES: Record<string, boolean> = {
  recipe_duplicate: true,
  recipe_photos: true,
  stock_tracking: true,
  production_planner: true,
  pdf_export: true,
  advanced_costs: true,
  change_history: true,
  data_import_export: true,
  nutrition_info: true,
};

const SEED_PLANS = [
  {
    id: "basic_monthly",
    stripePriceId:
      import.meta.env.STRIPE_PRICE_ID_BASIC_MONTHLY ||
      process.env.STRIPE_PRICE_ID_BASIC_MONTHLY ||
      "",
    name: "KitchCalc Basic",
    tier: "basic",
    billingInterval: "monthly",
    priceCents: 500,
    recipesLimit: 75,
    ingredientsLimit: null as number | null,
    featuresJson: BASIC_FEATURES,
  },
  {
    id: "basic_yearly",
    stripePriceId:
      import.meta.env.STRIPE_PRICE_ID_BASIC_YEARLY ||
      process.env.STRIPE_PRICE_ID_BASIC_YEARLY ||
      "",
    name: "KitchCalc Basic",
    tier: "basic",
    billingInterval: "yearly",
    priceCents: 4800,
    recipesLimit: 75,
    ingredientsLimit: null as number | null,
    featuresJson: BASIC_FEATURES,
  },
  {
    id: "pro_monthly",
    stripePriceId:
      import.meta.env.STRIPE_PRICE_ID_PRO_MONTHLY ||
      process.env.STRIPE_PRICE_ID_PRO_MONTHLY ||
      "",
    name: "KitchCalc Pro",
    tier: "pro",
    billingInterval: "monthly",
    priceCents: 1000,
    recipesLimit: null as number | null,
    ingredientsLimit: null as number | null,
    featuresJson: PRO_FEATURES,
  },
  {
    id: "pro_yearly",
    stripePriceId:
      import.meta.env.STRIPE_PRICE_ID_PRO_YEARLY ||
      process.env.STRIPE_PRICE_ID_PRO_YEARLY ||
      "",
    name: "KitchCalc Pro",
    tier: "pro",
    billingInterval: "yearly",
    priceCents: 8400,
    recipesLimit: null as number | null,
    ingredientsLimit: null as number | null,
    featuresJson: PRO_FEATURES,
  },
];

export type UserSubscription = {
  id: string;
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  planId: string;
  status: string;
  tier: string;
  recipesLimit: number | null;
  ingredientsLimit: number | null;
  features: Record<string, boolean>;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: Date | null;
  createdAt: Date;
};

export type CreateSubscriptionInput = {
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  userId: string | null;
  planId: string | null;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date | null;
};

/**
 * Inserta los 4 planes estáticos en `subscription_plans` si no existen.
 */
export async function seedSubscriptionPlans(): Promise<void> {
  await ensureInitialized();
  const driver = await getDriver();

  for (const plan of SEED_PLANS) {
    if (!plan.stripePriceId) continue;

    const featuresJson = JSON.stringify(plan.featuresJson);

    if (driver.kind === "postgres") {
      await driver.pool.query(
        `INSERT INTO subscription_plans (id, stripe_price_id, name, tier, billing_interval, price_cents, recipes_limit, ingredients_limit, features_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (id) DO NOTHING`,
        [
          plan.id,
          plan.stripePriceId,
          plan.name,
          plan.tier,
          plan.billingInterval,
          plan.priceCents,
          plan.recipesLimit,
          plan.ingredientsLimit,
          featuresJson,
        ],
      );
    } else {
      driver.db
        .prepare(
          `INSERT OR IGNORE INTO subscription_plans (id, stripe_price_id, name, tier, billing_interval, price_cents, recipes_limit, ingredients_limit, features_json)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          plan.id,
          plan.stripePriceId,
          plan.name,
          plan.tier,
          plan.billingInterval,
          plan.priceCents,
          plan.recipesLimit,
          plan.ingredientsLimit,
          featuresJson,
        );
    }
  }
}

/**
 * Obtiene la suscripción activa de un usuario.
 * Retorna null si no tiene suscripción (tier free).
 */
export async function getUserSubscription(
  userId: string,
): Promise<UserSubscription | null> {
  await ensureInitialized();
  const driver = await getDriver();

  if (driver.kind === "postgres") {
    const res = await driver.pool.query<{
      id: string;
      user_id: string;
      stripe_customer_id: string | null;
      stripe_subscription_id: string | null;
      plan_id: string;
      status: string;
      tier: string;
      recipes_limit: number | null;
      ingredients_limit: number | null;
      features_json: string;
      current_period_start: Date | null;
      current_period_end: Date | null;
      cancel_at_period_end: boolean;
      trial_end: Date | null;
      created_at: Date;
    }>(
      `SELECT s.*, sp.tier, sp.recipes_limit, sp.ingredients_limit, sp.features_json::text
       FROM subscriptions s
       JOIN subscription_plans sp ON sp.id = s.plan_id
       WHERE s.user_id = $1
         AND s.status IN ('active', 'trialing')
       ORDER BY s.created_at DESC
       LIMIT 1`,
      [userId],
    );

    const row = res.rows[0];
    if (!row) return null;

    return {
      id: row.id,
      userId: row.user_id,
      stripeCustomerId: row.stripe_customer_id,
      stripeSubscriptionId: row.stripe_subscription_id,
      planId: row.plan_id,
      status: row.status,
      tier: row.tier,
      recipesLimit: row.recipes_limit,
      ingredientsLimit: row.ingredients_limit,
      features: parseFeaturesJson(row.features_json),
      currentPeriodStart: row.current_period_start,
      currentPeriodEnd: row.current_period_end,
      cancelAtPeriodEnd: row.cancel_at_period_end,
      trialEnd: row.trial_end,
      createdAt: row.created_at,
    };
  }

  const row = driver.db
    .prepare(
      `SELECT s.*, sp.tier, sp.recipes_limit, sp.ingredients_limit, sp.features_json
       FROM subscriptions s
       JOIN subscription_plans sp ON sp.id = s.plan_id
       WHERE s.user_id = ?
         AND s.status IN ('active', 'trialing')
       ORDER BY s.created_at DESC
       LIMIT 1`,
    )
    .get(userId) as
    | {
        id: string;
        user_id: string;
        stripe_customer_id: string | null;
        stripe_subscription_id: string | null;
        plan_id: string;
        status: string;
        tier: string;
        recipes_limit: number | null;
        ingredients_limit: number | null;
        features_json: string;
        current_period_start: string | null;
        current_period_end: string | null;
        cancel_at_period_end: number;
        trial_end: string | null;
        created_at: string;
      }
    | undefined;

  if (!row) return null;

  return {
    id: row.id,
    userId: row.user_id,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    planId: row.plan_id,
    status: row.status,
    tier: row.tier,
    recipesLimit: row.recipes_limit,
    ingredientsLimit: row.ingredients_limit,
    features: parseFeaturesJson(row.features_json),
    currentPeriodStart: row.current_period_start
      ? new Date(row.current_period_start)
      : null,
    currentPeriodEnd: row.current_period_end
      ? new Date(row.current_period_end)
      : null,
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    trialEnd: row.trial_end ? new Date(row.trial_end) : null,
    createdAt: new Date(row.created_at),
  };
}

/**
 * Crea o actualiza una suscripción desde un webhook de Stripe.
 * Usa upsert sobre `stripe_subscription_id`.
 */
export async function createOrUpdateSubscription(
  input: CreateSubscriptionInput,
): Promise<void> {
  await ensureInitialized();
  const driver = await getDriver();

  let resolvedPlanId = input.planId;
  let resolvedUserId = input.userId;

  if (!resolvedPlanId || !resolvedUserId) {
    if (driver.kind === "postgres") {
      if (!resolvedPlanId) {
        const planRes = await driver.pool.query<{ id: string }>(
          `SELECT id FROM subscription_plans WHERE stripe_price_id = (
            SELECT price_id FROM stripe_prices WHERE stripe_id = $1
          ) LIMIT 1`,
          [input.stripeSubscriptionId],
        );
        if (planRes.rows[0]) {
          resolvedPlanId = planRes.rows[0].id;
        }
      }
      if (!resolvedUserId) {
        const userRes = await driver.pool.query<{ user_id: string }>(
          `SELECT user_id FROM subscriptions WHERE stripe_subscription_id = $1 LIMIT 1`,
          [input.stripeSubscriptionId],
        );
        if (userRes.rows[0]) {
          resolvedUserId = userRes.rows[0].user_id;
        }
      }
    } else {
      if (!resolvedPlanId) {
        const planRow = driver.db
          .prepare(
            `SELECT id FROM subscription_plans WHERE stripe_price_id = ? LIMIT 1`,
          )
          .get(input.stripeSubscriptionId) as { id: string } | undefined;
        if (planRow) {
          resolvedPlanId = planRow.id;
        }
      }
      if (!resolvedUserId) {
        const userRow = driver.db
          .prepare(
            `SELECT user_id FROM subscriptions WHERE stripe_subscription_id = ? LIMIT 1`,
          )
          .get(input.stripeSubscriptionId) as { user_id: string } | undefined;
        if (userRow) {
          resolvedUserId = userRow.user_id;
        }
      }
    }
  }

  if (!resolvedPlanId || !resolvedUserId) {
    return;
  }

  const id = `sub_${resolvedUserId}_${resolvedPlanId}`;

  if (driver.kind === "postgres") {
    await driver.pool.query(
      `INSERT INTO subscriptions (id, user_id, stripe_customer_id, stripe_subscription_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end, trial_end)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (stripe_subscription_id) DO UPDATE SET
         status = EXCLUDED.status,
         current_period_start = EXCLUDED.current_period_start,
         current_period_end = EXCLUDED.current_period_end,
         cancel_at_period_end = EXCLUDED.cancel_at_period_end,
         trial_end = EXCLUDED.trial_end,
         plan_id = EXCLUDED.plan_id`,
      [
        id,
        resolvedUserId,
        input.stripeCustomerId,
        input.stripeSubscriptionId,
        resolvedPlanId,
        input.status,
        input.currentPeriodStart,
        input.currentPeriodEnd,
        input.cancelAtPeriodEnd,
        input.trialEnd ?? null,
      ],
    );
  } else {
    driver.db
      .prepare(
        `INSERT OR REPLACE INTO subscriptions (id, user_id, stripe_customer_id, stripe_subscription_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end, trial_end)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        resolvedUserId,
        input.stripeCustomerId,
        input.stripeSubscriptionId,
        resolvedPlanId,
        input.status,
        input.currentPeriodStart.toISOString(),
        input.currentPeriodEnd.toISOString(),
        input.cancelAtPeriodEnd ? 1 : 0,
        input.trialEnd ? input.trialEnd.toISOString() : null,
      );
  }
}

/**
 * Marca una suscripción como cancelada.
 */
export async function cancelSubscription(
  stripeSubscriptionId: string,
): Promise<void> {
  await ensureInitialized();
  const driver = await getDriver();

  if (driver.kind === "postgres") {
    await driver.pool.query(
      `UPDATE subscriptions SET status = 'canceled', cancel_at_period_end = true WHERE stripe_subscription_id = $1`,
      [stripeSubscriptionId],
    );
  } else {
    driver.db
      .prepare(
        `UPDATE subscriptions SET status = 'canceled', cancel_at_period_end = 1 WHERE stripe_subscription_id = ?`,
      )
      .run(stripeSubscriptionId);
  }
}

/**
 * Marca una suscripción como past_due.
 */
export async function markSubscriptionPastDue(
  stripeSubscriptionId: string,
): Promise<void> {
  await ensureInitialized();
  const driver = await getDriver();

  if (driver.kind === "postgres") {
    await driver.pool.query(
      `UPDATE subscriptions SET status = 'past_due' WHERE stripe_subscription_id = $1`,
      [stripeSubscriptionId],
    );
  } else {
    driver.db
      .prepare(
        `UPDATE subscriptions SET status = 'past_due' WHERE stripe_subscription_id = ?`,
      )
      .run(stripeSubscriptionId);
  }
}

/**
 * Obtiene un plan por su Stripe Price ID.
 */
export async function getPlanByStripePriceId(stripePriceId: string): Promise<{
  id: string;
  tier: string;
  name: string;
  stripePriceId: string;
} | null> {
  await ensureInitialized();
  const driver = await getDriver();

  if (driver.kind === "postgres") {
    const res = await driver.pool.query<{
      id: string;
      tier: string;
      name: string;
      stripe_price_id: string;
    }>(
      `SELECT id, tier, name, stripe_price_id FROM subscription_plans WHERE stripe_price_id = $1 LIMIT 1`,
      [stripePriceId],
    );
    const row = res.rows[0];
    if (!row) return null;
    return {
      id: row.id,
      tier: row.tier,
      name: row.name,
      stripePriceId: row.stripe_price_id,
    };
  }

  const row = driver.db
    .prepare(
      `SELECT id, tier, name, stripe_price_id FROM subscription_plans WHERE stripe_price_id = ? LIMIT 1`,
    )
    .get(stripePriceId) as
    | { id: string; tier: string; name: string; stripe_price_id: string }
    | undefined;

  if (!row) return null;
  return {
    id: row.id,
    tier: row.tier,
    name: row.name,
    stripePriceId: row.stripe_price_id,
  };
}

/**
 * Obtiene el stripe_customer_id para un usuario, si existe.
 */
export async function getStripeCustomerId(
  userId: string,
): Promise<string | null> {
  await ensureInitialized();
  const driver = await getDriver();

  if (driver.kind === "postgres") {
    const res = await driver.pool.query<{ stripe_customer_id: string | null }>(
      `SELECT stripe_customer_id FROM subscriptions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [userId],
    );
    return res.rows[0]?.stripe_customer_id ?? null;
  }

  const row = driver.db
    .prepare(
      `SELECT stripe_customer_id FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
    )
    .get(userId) as { stripe_customer_id: string | null } | undefined;

  return row?.stripe_customer_id ?? null;
}

/**
 * Cuenta las recetas de un usuario.
 */
export async function countUserRecipes(ownerId: string): Promise<number> {
  await ensureInitialized();
  const driver = await getDriver();

  if (driver.kind === "postgres") {
    const res = await driver.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM recipes WHERE owner_id = $1`,
      [ownerId],
    );
    return Number(res.rows[0]?.count ?? 0);
  }

  const row = driver.db
    .prepare(`SELECT COUNT(*) AS count FROM recipes WHERE owner_id = ?`)
    .get(ownerId) as { count: number } | undefined;

  return Number(row?.count ?? 0);
}

/**
 * Cuenta los ingredientes de un usuario.
 */
export async function countUserIngredients(ownerId: string): Promise<number> {
  await ensureInitialized();
  const driver = await getDriver();

  if (driver.kind === "postgres") {
    const res = await driver.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM ingredients WHERE owner_id = $1`,
      [ownerId],
    );
    return Number(res.rows[0]?.count ?? 0);
  }

  const row = driver.db
    .prepare(`SELECT COUNT(*) AS count FROM ingredients WHERE owner_id = ?`)
    .get(ownerId) as { count: number } | undefined;

  return Number(row?.count ?? 0);
}

function parseFeaturesJson(
  raw: string | Record<string, unknown>,
): Record<string, boolean> {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (parsed && typeof parsed === "object") {
      const result: Record<string, boolean> = {};
      for (const [key, value] of Object.entries(parsed)) {
        result[key] = Boolean(value);
      }
      return result;
    }
    return {};
  } catch {
    return {};
  }
}
