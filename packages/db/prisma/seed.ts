import dotenv from 'dotenv';
import pg from 'pg';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();
dotenv.config({ path: resolve(__dirname, '../../../.env') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

interface IngredientInput {
  id: number;
  name: string;
  unit: string;
  price: number;
  purchaseQuantity: number;
  brand?: string | null;
  supplier?: string | null;
}

interface RecipeInput {
  id: number;
  name: string;
  category?: string;
  instructions?: string;
  desiredMargin: number;
  fixedCostsPercentage: number;
  ingredients: {
    ingredientId: number;
    quantity: number;
    unit: string;
    comment?: string;
  }[];
  presentations: {
    id: number;
    name: string;
    unitsPerBatch: number;
    salePrice?: number | null;
  }[];
  fixedCosts?: {
    id?: number;
    name: string;
    type: 'PERCENTAGE' | 'AMOUNT';
    base: 'PER_BATCH' | 'PER_UNIT' | 'PER_HOUR';
    value: number;
    hours?: number | null;
  }[];
}

interface UserDataExport {
  user: {
    id: string;
    name: string;
    firstName: string;
    lastName: string;
    email: string;
    emailVerified: boolean;
    image?: string | null;
    role: string;
    createdAt: string;
    updatedAt: string;
  };
  accounts: {
    id: string;
    accountId: string;
    providerId: string;
    userId: string;
    accessToken?: string | null;
    refreshToken?: string | null;
    idToken?: string | null;
    accessTokenExpiresAt?: string | null;
    refreshTokenExpiresAt?: string | null;
    scope?: string | null;
    password?: string | null;
    createdAt: string;
    updatedAt: string;
  }[];
  preferences: {
    userId: string;
    theme: string;
    accentColor: string;
    updatedAt?: string | null;
  }[];
  subscriptions: {
    id: string;
    userId: string;
    stripeCustomerId?: string | null;
    stripeSubscriptionId?: string | null;
    planId: string;
    status: string;
    currentPeriodStart?: string | null;
    currentPeriodEnd?: string | null;
    cancelAtPeriodEnd: boolean;
    trialEnd?: string | null;
    createdAt: string;
  }[];
}

async function seed() {
  const pool = new pg.Pool({ connectionString });
  const client = await pool.connect();

  try {
    const dataDir = resolve(__dirname, '../../../data');
    const userDataPath = resolve(dataDir, 'axel_user_data.json');
    const ingredientsPath = resolve(dataDir, 'ingredients.json');
    const recipesPath = resolve(dataDir, 'recipes.json');

    let ownerId = process.env.RECIPES_STATIC_OWNER_ID || 'YAcM7VNYBRQkSIGvBJSYwkwNRNXZpZGh';

    // 1. Seed User, Account, Preferences, Subscriptions if axel_user_data.json exists
    if (existsSync(userDataPath)) {
      const userData: UserDataExport = JSON.parse(readFileSync(userDataPath, 'utf-8'));
      const u = userData.user;

      // Check if user already exists by email in the target database
      const existingUserRes = await client.query(`SELECT id FROM "user" WHERE email = $1`, [
        u.email,
      ]);

      if (existingUserRes.rows.length > 0) {
        ownerId = existingUserRes.rows[0].id;
        console.log(`Using existing target user ID for ${u.email}: ${ownerId}`);

        await client.query(
          `UPDATE "user"
           SET name = $1, first_name = $2, last_name = $3, email_verified = $4, image = COALESCE($5, image), role = $6, updated_at = NOW()
           WHERE id = $7`,
          [
            u.name,
            u.firstName,
            u.lastName,
            u.emailVerified,
            u.image ?? null,
            u.role || 'USER',
            ownerId,
          ]
        );
      } else {
        ownerId = u.id;
        await client.query(
          `INSERT INTO "user" (id, name, first_name, last_name, email, email_verified, image, role, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             first_name = EXCLUDED.first_name,
             last_name = EXCLUDED.last_name,
             email = EXCLUDED.email,
             email_verified = EXCLUDED.email_verified,
             image = EXCLUDED.image,
             role = EXCLUDED.role,
             updated_at = EXCLUDED.updated_at`,
          [
            u.id,
            u.name,
            u.firstName,
            u.lastName,
            u.email,
            u.emailVerified,
            u.image ?? null,
            u.role || 'USER',
            new Date(u.createdAt),
            new Date(u.updatedAt),
          ]
        );
        console.log(`Seeded new user: ${u.email} (${ownerId})`);
      }

      for (const acc of userData.accounts) {
        await client.query(
          `INSERT INTO account (id, account_id, provider_id, user_id, access_token, refresh_token, id_token, access_token_expires_at, refresh_token_expires_at, scope, password, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
           ON CONFLICT (id) DO UPDATE SET
             account_id = EXCLUDED.account_id,
             provider_id = EXCLUDED.provider_id,
             user_id = EXCLUDED.user_id,
             access_token = EXCLUDED.access_token,
             refresh_token = EXCLUDED.refresh_token,
             id_token = EXCLUDED.id_token,
             access_token_expires_at = EXCLUDED.access_token_expires_at,
             refresh_token_expires_at = EXCLUDED.refresh_token_expires_at,
             scope = EXCLUDED.scope,
             password = EXCLUDED.password,
             updated_at = EXCLUDED.updated_at`,
          [
            acc.id,
            acc.accountId,
            acc.providerId,
            ownerId,
            acc.accessToken ?? null,
            acc.refreshToken ?? null,
            acc.idToken ?? null,
            acc.accessTokenExpiresAt ? new Date(acc.accessTokenExpiresAt) : null,
            acc.refreshTokenExpiresAt ? new Date(acc.refreshTokenExpiresAt) : null,
            acc.scope ?? null,
            acc.password ?? null,
            new Date(acc.createdAt),
            new Date(acc.updatedAt),
          ]
        );
      }

      for (const pref of userData.preferences) {
        await client.query(
          `INSERT INTO user_preferences (user_id, theme, accent_color, updated_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (user_id) DO UPDATE SET
             theme = EXCLUDED.theme,
             accent_color = EXCLUDED.accent_color,
             updated_at = EXCLUDED.updated_at`,
          [
            ownerId,
            pref.theme,
            pref.accentColor,
            pref.updatedAt ? new Date(pref.updatedAt) : new Date(),
          ]
        );
      }

      for (const sub of userData.subscriptions) {
        await client.query(
          `INSERT INTO subscriptions (id, user_id, stripe_customer_id, stripe_subscription_id, plan_id, status, current_period_start, current_period_end, cancel_at_period_end, trial_end, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           ON CONFLICT (id) DO UPDATE SET
             user_id = EXCLUDED.user_id,
             stripe_customer_id = EXCLUDED.stripe_customer_id,
             stripe_subscription_id = EXCLUDED.stripe_subscription_id,
             plan_id = EXCLUDED.plan_id,
             status = EXCLUDED.status,
             current_period_start = EXCLUDED.current_period_start,
             current_period_end = EXCLUDED.current_period_end,
             cancel_at_period_end = EXCLUDED.cancel_at_period_end,
             trial_end = EXCLUDED.trial_end`,
          [
            sub.id,
            ownerId,
            sub.stripeCustomerId ?? null,
            sub.stripeSubscriptionId ?? null,
            sub.planId,
            sub.status,
            sub.currentPeriodStart ? new Date(sub.currentPeriodStart) : null,
            sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null,
            sub.cancelAtPeriodEnd ?? false,
            sub.trialEnd ? new Date(sub.trialEnd) : null,
            new Date(sub.createdAt),
          ]
        );
      }
    }

    // 2. Seed Ingredients
    const ingredients: IngredientInput[] = JSON.parse(readFileSync(ingredientsPath, 'utf-8'));
    let ingredientCount = 0;
    for (const ing of ingredients) {
      await client.query(
        `INSERT INTO ingredients (id, owner_id, name, unit, price, purchase_quantity, brand, supplier)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           owner_id = EXCLUDED.owner_id,
           name = EXCLUDED.name,
           unit = EXCLUDED.unit,
           price = EXCLUDED.price,
           purchase_quantity = EXCLUDED.purchase_quantity,
           brand = EXCLUDED.brand,
           supplier = EXCLUDED.supplier`,
        [
          ing.id,
          ownerId,
          ing.name,
          ing.unit,
          ing.price,
          ing.purchaseQuantity,
          ing.brand || null,
          ing.supplier || null,
        ]
      );
      ingredientCount++;
    }
    console.log(`Seeded ${ingredientCount} ingredients for owner ${ownerId}`);

    const maxIngRes = await client.query(`SELECT MAX(id) as max_id FROM ingredients`);
    const maxIngId = maxIngRes.rows[0]?.max_id;
    if (maxIngId) {
      await client.query(`SELECT setval('ingredients_id_seq', $1, true)`, [maxIngId]);
    }

    // 3. Seed Recipes
    const recipes: RecipeInput[] = JSON.parse(readFileSync(recipesPath, 'utf-8'));
    let recipeCount = 0;
    for (const rec of recipes) {
      await client.query(
        `INSERT INTO recipes (id, owner_id, name, category, instructions, desired_margin, fixed_costs_percentage, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
         ON CONFLICT (id) DO UPDATE SET
           owner_id = EXCLUDED.owner_id,
           name = EXCLUDED.name,
           category = EXCLUDED.category,
           instructions = EXCLUDED.instructions,
           desired_margin = EXCLUDED.desired_margin,
           fixed_costs_percentage = EXCLUDED.fixed_costs_percentage,
           updated_at = NOW()`,
        [
          rec.id,
          ownerId,
          rec.name,
          rec.category ?? null,
          rec.instructions ?? null,
          rec.desiredMargin,
          rec.fixedCostsPercentage,
        ]
      );

      await client.query(`DELETE FROM recipe_ingredients WHERE recipe_id = $1`, [rec.id]);
      const mergedIngredients = new Map<
        number,
        {
          ingredientId: number;
          quantity: number;
          unit: string;
          comment: string | null;
        }
      >();
      for (const ri of rec.ingredients) {
        const existing = mergedIngredients.get(ri.ingredientId);
        if (existing) {
          existing.quantity += ri.quantity;
          if (ri.comment && !existing.comment) existing.comment = ri.comment;
          else if (ri.comment && existing.comment) existing.comment += '; ' + ri.comment;
        } else {
          mergedIngredients.set(ri.ingredientId, {
            ingredientId: ri.ingredientId,
            quantity: ri.quantity,
            unit: ri.unit,
            comment: ri.comment ?? null,
          });
        }
      }

      for (const mi of mergedIngredients.values()) {
        await client.query(
          `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, comment)
           VALUES ($1, $2, $3, $4, $5)`,
          [rec.id, mi.ingredientId, mi.quantity, mi.unit, mi.comment]
        );
      }

      for (const p of rec.presentations) {
        await client.query(
          `INSERT INTO recipe_presentations (id, recipe_id, name, units_per_batch, sale_price)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id) DO UPDATE SET
             recipe_id = EXCLUDED.recipe_id,
             name = EXCLUDED.name,
             units_per_batch = EXCLUDED.units_per_batch,
             sale_price = EXCLUDED.sale_price`,
          [p.id, rec.id, p.name, p.unitsPerBatch, p.salePrice ?? null]
        );
      }

      if (rec.fixedCosts && rec.fixedCosts.length > 0) {
        await client.query(`DELETE FROM recipe_fixed_costs WHERE recipe_id = $1`, [rec.id]);
        for (const fc of rec.fixedCosts) {
          if (fc.id) {
            await client.query(
              `INSERT INTO recipe_fixed_costs (id, recipe_id, name, type, base, value, hours)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               ON CONFLICT (id) DO UPDATE SET
                 recipe_id = EXCLUDED.recipe_id,
                 name = EXCLUDED.name,
                 type = EXCLUDED.type,
                 base = EXCLUDED.base,
                 value = EXCLUDED.value,
                 hours = EXCLUDED.hours`,
              [fc.id, rec.id, fc.name, fc.type, fc.base, fc.value, fc.hours ?? null]
            );
          } else {
            await client.query(
              `INSERT INTO recipe_fixed_costs (recipe_id, name, type, base, value, hours)
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [rec.id, fc.name, fc.type, fc.base, fc.value, fc.hours ?? null]
            );
          }
        }
      }

      recipeCount++;
      console.log(`  ${rec.name}`);
    }
    console.log(`Seeded ${recipeCount} recipes for owner ${ownerId}`);

    // 4. Reset sequences
    const maxRecRes = await client.query(`SELECT MAX(id) as max_id FROM recipes`);
    if (maxRecRes.rows[0]?.max_id) {
      await client.query(`SELECT setval('recipes_id_seq', $1, true)`, [maxRecRes.rows[0].max_id]);
    }

    const maxRiRes = await client.query(`SELECT MAX(id) as max_id FROM recipe_ingredients`);
    if (maxRiRes.rows[0]?.max_id) {
      await client.query(`SELECT setval('recipe_ingredients_id_seq', $1, true)`, [
        maxRiRes.rows[0].max_id,
      ]);
    }

    const maxPresRes = await client.query(`SELECT MAX(id) as max_id FROM recipe_presentations`);
    if (maxPresRes.rows[0]?.max_id) {
      await client.query(`SELECT setval('recipe_presentations_id_seq', $1, true)`, [
        maxPresRes.rows[0].max_id,
      ]);
    }

    const maxRfcRes = await client.query(`SELECT MAX(id) as max_id FROM recipe_fixed_costs`);
    if (maxRfcRes.rows[0]?.max_id) {
      await client.query(`SELECT setval('recipe_fixed_costs_id_seq', $1, true)`, [
        maxRfcRes.rows[0].max_id,
      ]);
    }
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((e) => {
  console.error('Seed error:', e);
  process.exit(1);
});
