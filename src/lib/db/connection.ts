/**
 * Inicialización y gestión de la conexión a base de datos.
 *
 * Soporta dos backends: Postgres (producción) y SQLite (desarrollo local).
 * Decide cuál usar según variables de entorno. Proporciona las funciones
 * de inicialización de esquema (createTables), seeding (seedIfNeeded) y
 * verificación de pertenencia de registros (recipeBelongsToOwner, etc.).
 */

import fs from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";
import { prepareSqliteDatabasePath } from "../sqlite-path";
import type {
  Driver,
  PostgresQueryable,
  RecipeSeed,
  RecipeDataUser,
  Ingredient,
  RecipePresentation,
  RecipeIngredient,
} from "./types";
import {
  normalizeOptionalText,
  normalizeEmail,
  requireOwnerId,
  normalizeDesiredMargin,
  normalizeFixedCostsPercentage,
  normalizeRecipeComment,
  normalizeCategory,
  toNumber,
  toRecipePresentation,
} from "./helpers";

const preferPostgresForRecipes =
  (import.meta.env.RECIPES_USE_POSTGRES ||
    process.env.RECIPES_USE_POSTGRES ||
    import.meta.env.APP_USE_POSTGRES ||
    process.env.APP_USE_POSTGRES ||
    import.meta.env.RECIPES_USE_DB ||
    process.env.RECIPES_USE_DB ||
    import.meta.env.APP_USE_DB ||
    process.env.APP_USE_DB ||
    import.meta.env.BETTER_AUTH_USE_DB ||
    process.env.BETTER_AUTH_USE_DB ||
    "true") !== "false";

const databasePath =
  import.meta.env.RECIPES_DB_PATH ||
  process.env.RECIPES_DB_PATH ||
  import.meta.env.APP_DB_PATH ||
  process.env.APP_DB_PATH ||
  "./data/recipes.db";

const postgresUrlRaw =
  import.meta.env.DATABASE_URL ||
  process.env.DATABASE_URL ||
  import.meta.env.POSTGRES_URL ||
  process.env.POSTGRES_URL;

const postgresUrl = postgresUrlRaw?.trim();

const safePostgresUrl = (() => {
  if (!postgresUrl) return undefined;
  try {
    const parsed = new URL(postgresUrl);
    if (parsed.protocol !== "postgres:" && parsed.protocol !== "postgresql:") {
      return undefined;
    }
    return postgresUrl;
  } catch {
    return undefined;
  }
})();

const isLocalDatabaseUrl = safePostgresUrl
  ? /localhost|127\.0\.0\.1/.test(safePostgresUrl)
  : false;

const postgresSslInsecure =
  (import.meta.env.POSTGRES_SSL_INSECURE ||
    process.env.POSTGRES_SSL_INSECURE ||
    "false") === "true";

const postgresSslCa =
  import.meta.env.POSTGRES_SSL_CA || process.env.POSTGRES_SSL_CA;

const postgresSslConfig =
  !safePostgresUrl || isLocalDatabaseUrl
    ? undefined
    : {
        rejectUnauthorized: !postgresSslInsecure,
        ...(postgresSslCa ? { ca: postgresSslCa.replace(/\\n/g, "\n") } : {}),
      };

const RECIPE_DATA_SCHEMA_VERSION = 5;

const globals = globalThis as typeof globalThis & {
  __recipesDriver?: Driver;
  __recipesInit?: Promise<void>;
  __recipesSchemaVersion?: number;
};

const seedIngredientsPath = path.resolve(
  process.cwd(),
  "data/ingredients.json",
);
const seedRecipesPath = path.resolve(process.cwd(), "data/recipes.json");

export const STATIC_OWNER_SCOPE = "__static_seed__";

const staticOwnerId = normalizeOptionalText(
  import.meta.env.RECIPES_STATIC_OWNER_ID ||
    process.env.RECIPES_STATIC_OWNER_ID,
);

const staticOwnerEmail = normalizeEmail(
  import.meta.env.RECIPES_STATIC_OWNER_EMAIL ||
    process.env.RECIPES_STATIC_OWNER_EMAIL,
);

/**
 * Determina el ID de owner que debe usarse para el usuario autenticado.
 *
 * Si el usuario coincide con las variables de entorno `RECIPES_STATIC_OWNER_ID`
 * o `RECIPES_STATIC_OWNER_EMAIL`, se asigna al scope estático de datos semilla.
 * De lo contrario, se usa su ID de autenticación.
 */
export function getRecipeDataOwner(user: RecipeDataUser): string {
  const userId = requireOwnerId(user.id);
  const userEmail = normalizeEmail(user.email);

  if (
    (staticOwnerId && userId === staticOwnerId) ||
    (staticOwnerEmail && userEmail === staticOwnerEmail)
  ) {
    return STATIC_OWNER_SCOPE;
  }

  return userId;
}

/**
 * Obtiene una presentación por su ID dentro de una receta.
 * Retorna `null` si no existe.
 */
export async function getPresentationById(
  driver: Driver,
  recipeId: number,
  id: number,
): Promise<RecipePresentation | null> {
  if (driver.kind === "postgres") {
    const presentationRes = await driver.pool.query<{
      id: number;
      name: string;
      units_per_batch: string;
      sale_price: string | null;
    }>(
      `
      SELECT id, name, units_per_batch::text, sale_price::text
      FROM recipe_presentations
      WHERE id = $1 AND recipe_id = $2
      LIMIT 1
      `,
      [id, recipeId],
    );

    const presentation = presentationRes.rows[0];
    return presentation ? toRecipePresentation(presentation) : null;
  }

  const presentation = driver.db
    .prepare(
      `
    SELECT id, name, units_per_batch, sale_price
    FROM recipe_presentations
    WHERE id = ? AND recipe_id = ?
    LIMIT 1
    `,
    )
    .get(id, recipeId) as
    | {
        id: number;
        name: string;
        units_per_batch: number;
        sale_price: number | null;
      }
    | undefined;

  return presentation ? toRecipePresentation(presentation) : null;
}

/**
 * Sincroniza la secuencia de identidad de Postgres con el máximo ID
 * existente en la tabla `ingredients`. Evita gaps en IDs después de seeds.
 */
export async function syncPostgresIngredientsIdentity(
  queryable: PostgresQueryable,
) {
  await queryable.query(`
    DO $$
    DECLARE
      seq_name text;
      max_id bigint;
      has_rows boolean;
    BEGIN
      SELECT pg_get_serial_sequence('ingredients', 'id') INTO seq_name;
      IF seq_name IS NULL THEN
        RETURN;
      END IF;

      SELECT COALESCE(MAX(id), 1), COUNT(*) > 0
      INTO max_id, has_rows
      FROM ingredients;

      PERFORM setval(seq_name::regclass, max_id, has_rows);
    END $$;
  `);
}

/**
 * Obtiene (o crea) el driver de base de datos.
 *
 * El driver es un singleton global (`globals.__recipesDriver`)
 * que se instancia una sola vez según la configuración de entorno.
 * Soporta Postgres (vía `pg.Pool`) y SQLite (vía `node:sqlite`).
 */
export async function getDriver(): Promise<Driver> {
  if (globals.__recipesDriver) return globals.__recipesDriver;

  if (preferPostgresForRecipes && safePostgresUrl) {
    const pool = new Pool({
      connectionString: safePostgresUrl,
      ssl: postgresSslConfig,
    });
    globals.__recipesDriver = { kind: "postgres", pool };
    return globals.__recipesDriver;
  }

  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(prepareSqliteDatabasePath(databasePath));
  db.exec("PRAGMA foreign_keys = ON;");
  globals.__recipesDriver = { kind: "sqlite", db };
  return globals.__recipesDriver;
}

/**
 * Crea las tablas necesarias si no existen.
 *
 * Esquema:
 * - `ingredients` — insumos con costo de empaque.
 * - `recipes` — recetas con márgenes y costos fijos.
 * - `recipe_ingredients` — relación N:M receta-ingrediente.
 * - `recipe_presentations` — presentaciones de venta por receta.
 *
 * También aplica migraciones incrementales (ej. columnas `owner_id`,
 * `updated_at`, secuencias de identidad en Postgres).
 */
export async function createTables(driver: Driver) {
  if (driver.kind === "postgres") {
    await driver.pool.query(`
      CREATE TABLE IF NOT EXISTS ingredients (
        id INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
        owner_id TEXT NOT NULL DEFAULT '${STATIC_OWNER_SCOPE}',
        name TEXT NOT NULL,
        unit TEXT NOT NULL,
        price NUMERIC NOT NULL,
        purchase_quantity NUMERIC NOT NULL,
        brand TEXT,
        supplier TEXT
      );
    `);

    await driver.pool.query(`
      CREATE TABLE IF NOT EXISTS recipes (
        id INTEGER PRIMARY KEY,
        owner_id TEXT NOT NULL DEFAULT '${STATIC_OWNER_SCOPE}',
        name TEXT NOT NULL,
        desired_margin NUMERIC NOT NULL DEFAULT 0,
        fixed_costs_percentage NUMERIC NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ
      );
    `);

    await driver.pool.query(
      `ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS owner_id TEXT NOT NULL DEFAULT '${STATIC_OWNER_SCOPE}'`,
    );
    await driver.pool.query(
      `ALTER TABLE recipes ADD COLUMN IF NOT EXISTS owner_id TEXT NOT NULL DEFAULT '${STATIC_OWNER_SCOPE}'`,
    );

    await driver.pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'ingredients'
            AND column_name = 'id'
            AND is_identity = 'NO'
            AND column_default IS NULL
        ) THEN
          ALTER TABLE ingredients ALTER COLUMN id ADD GENERATED BY DEFAULT AS IDENTITY;
        END IF;
      END $$;
    `);

    await driver.pool.query(
      "ALTER TABLE recipes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ",
    );
    await driver.pool.query(
      "ALTER TABLE recipes ADD COLUMN IF NOT EXISTS category TEXT",
    );
    await driver.pool.query(
      "ALTER TABLE recipes ADD COLUMN IF NOT EXISTS instructions TEXT",
    );
    await driver.pool.query(
      "CREATE INDEX IF NOT EXISTS idx_ingredients_owner_id ON ingredients(owner_id, id);",
    );
    await driver.pool.query(
      "CREATE INDEX IF NOT EXISTS idx_recipes_owner_id ON recipes(owner_id, id);",
    );
    await driver.pool.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'recipes'
            AND column_name = 'updated_at'
            AND data_type <> 'timestamp with time zone'
        ) THEN
          ALTER TABLE recipes
          ALTER COLUMN updated_at TYPE TIMESTAMPTZ
          USING CASE
            WHEN updated_at IS NULL THEN NULL
            ELSE updated_at AT TIME ZONE 'UTC'
          END;
        END IF;
      END $$;
    `);

    await driver.pool.query(`
      CREATE TABLE IF NOT EXISTS recipe_ingredients (
        id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
        recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
        ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
        quantity NUMERIC NOT NULL,
        unit TEXT NOT NULL,
        comment TEXT
      );
    `);

    await driver.pool.query(`
      CREATE TABLE IF NOT EXISTS recipe_presentations (
        id INTEGER PRIMARY KEY,
        recipe_id INTEGER NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        units_per_batch NUMERIC NOT NULL,
        sale_price NUMERIC
      );
    `);

    await driver.pool.query(
      "CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);",
    );
    await driver.pool.query(
      "CREATE INDEX IF NOT EXISTS idx_recipe_presentations_recipe_id ON recipe_presentations(recipe_id);",
    );
    await driver.pool.query(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        user_id TEXT PRIMARY KEY,
        theme TEXT NOT NULL DEFAULT 'light',
        accent_color TEXT NOT NULL DEFAULT 'indigo',
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    await driver.pool.query(`
      CREATE TABLE IF NOT EXISTS subscription_plans (
        id TEXT PRIMARY KEY,
        stripe_price_id TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        tier TEXT NOT NULL CHECK (tier IN ('basic', 'pro')),
        billing_interval TEXT NOT NULL CHECK (billing_interval IN ('monthly', 'yearly')),
        price_cents INTEGER NOT NULL,
        recipes_limit INTEGER,
        ingredients_limit INTEGER,
        features_json JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    await driver.pool.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT UNIQUE,
        plan_id TEXT REFERENCES subscription_plans(id),
        status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'unpaid', 'incomplete')),
        current_period_start TIMESTAMPTZ,
        current_period_end TIMESTAMPTZ,
        cancel_at_period_end BOOLEAN DEFAULT false,
        trial_end TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT now()
      );
    `);

    await driver.pool.query(
      "CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);",
    );
    await driver.pool.query(
      "CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub_id ON subscriptions(stripe_subscription_id);",
    );

    await syncPostgresIngredientsIdentity(driver.pool);
    return;
  }

  driver.db.exec(`
    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY,
      owner_id TEXT NOT NULL DEFAULT '${STATIC_OWNER_SCOPE}',
      name TEXT NOT NULL,
      unit TEXT NOT NULL,
      price REAL NOT NULL,
      purchase_quantity REAL NOT NULL,
      brand TEXT,
      supplier TEXT
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY,
      owner_id TEXT NOT NULL DEFAULT '${STATIC_OWNER_SCOPE}',
      name TEXT NOT NULL,
      desired_margin REAL NOT NULL DEFAULT 0,
      fixed_costs_percentage REAL NOT NULL DEFAULT 0,
      updated_at TEXT
    );
  `);

  const ingredientColumns = driver.db
    .prepare("PRAGMA table_info(ingredients)")
    .all() as Array<{ name: string }>;

  if (!ingredientColumns.some((column) => column.name === "owner_id")) {
    driver.db.exec(
      `ALTER TABLE ingredients ADD COLUMN owner_id TEXT NOT NULL DEFAULT '${STATIC_OWNER_SCOPE}'`,
    );
  }

  const recipeColumns = driver.db
    .prepare("PRAGMA table_info(recipes)")
    .all() as Array<{ name: string }>;

  if (!recipeColumns.some((column) => column.name === "owner_id")) {
    driver.db.exec(
      `ALTER TABLE recipes ADD COLUMN owner_id TEXT NOT NULL DEFAULT '${STATIC_OWNER_SCOPE}'`,
    );
  }

  if (!recipeColumns.some((column) => column.name === "updated_at")) {
    driver.db.exec("ALTER TABLE recipes ADD COLUMN updated_at TEXT");
  }

  if (!recipeColumns.some((column) => column.name === "category")) {
    driver.db.exec("ALTER TABLE recipes ADD COLUMN category TEXT");
  }

  if (!recipeColumns.some((column) => column.name === "instructions")) {
    driver.db.exec("ALTER TABLE recipes ADD COLUMN instructions TEXT");
  }

  driver.db.exec(`
    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      recipe_id INTEGER NOT NULL,
      ingredient_id INTEGER NOT NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL,
      comment TEXT,
      FOREIGN KEY(recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
      FOREIGN KEY(ingredient_id) REFERENCES ingredients(id) ON DELETE RESTRICT
    );

    CREATE TABLE IF NOT EXISTS recipe_presentations (
      id INTEGER PRIMARY KEY,
      recipe_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      units_per_batch REAL NOT NULL,
      sale_price REAL,
      FOREIGN KEY(recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
    CREATE INDEX IF NOT EXISTS idx_recipe_presentations_recipe_id ON recipe_presentations(recipe_id);
    CREATE INDEX IF NOT EXISTS idx_ingredients_owner_id ON ingredients(owner_id, id);
    CREATE INDEX IF NOT EXISTS idx_recipes_owner_id ON recipes(owner_id, id);

    CREATE TABLE IF NOT EXISTS user_preferences (
      user_id TEXT PRIMARY KEY,
      theme TEXT NOT NULL DEFAULT 'light',
      accent_color TEXT NOT NULL DEFAULT 'indigo',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS subscription_plans (
      id TEXT PRIMARY KEY,
      stripe_price_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      tier TEXT NOT NULL CHECK (tier IN ('basic', 'pro')),
      billing_interval TEXT NOT NULL CHECK (billing_interval IN ('monthly', 'yearly')),
      price_cents INTEGER NOT NULL,
      recipes_limit INTEGER,
      ingredients_limit INTEGER,
      features_json TEXT NOT NULL DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS subscriptions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      stripe_customer_id TEXT,
      stripe_subscription_id TEXT UNIQUE,
      plan_id TEXT REFERENCES subscription_plans(id),
      status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'past_due', 'trialing', 'unpaid', 'incomplete')),
      current_period_start TEXT,
      current_period_end TEXT,
      cancel_at_period_end INTEGER DEFAULT 0,
      trial_end TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
    CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_sub_id ON subscriptions(stripe_subscription_id);
  `);
}

/** Lee los archivos JSON de datos semilla desde `data/`. */
export async function readSeedData() {
  const [ingredientsRaw, recipesRaw] = await Promise.all([
    fs.readFile(seedIngredientsPath, "utf-8"),
    fs.readFile(seedRecipesPath, "utf-8"),
  ]);

  return {
    ingredients: JSON.parse(ingredientsRaw) as Ingredient[],
    recipes: JSON.parse(recipesRaw) as RecipeSeed[],
  };
}

/**
 * Inserta datos semilla si la base de datos está vacía para el scope
 * `STATIC_OWNER_SCOPE`. Los datos se leen de `data/ingredients.json`
 * y `data/recipes.json`.
 */
export async function seedIfNeeded(driver: Driver) {
  if (driver.kind === "postgres") {
    const countRes = await driver.pool.query<{ count: string }>(
      "SELECT COUNT(*)::text AS count FROM ingredients WHERE owner_id = $1;",
      [STATIC_OWNER_SCOPE],
    );
    if (Number(countRes.rows[0]?.count ?? 0) > 0) return;

    const { ingredients, recipes } = await readSeedData();
    const client = await driver.pool.connect();
    try {
      await client.query("BEGIN");

      for (const ingredient of ingredients) {
        await client.query(
          `INSERT INTO ingredients (id, owner_id, name, unit, price, purchase_quantity, brand, supplier)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            ingredient.id,
            STATIC_OWNER_SCOPE,
            ingredient.name,
            ingredient.unit,
            ingredient.price,
            ingredient.purchaseQuantity,
            normalizeOptionalText(ingredient.brand),
            normalizeOptionalText(ingredient.supplier),
          ],
        );
      }

      for (const recipe of recipes) {
        await client.query(
          `INSERT INTO recipes (id, owner_id, name, desired_margin, fixed_costs_percentage, category, instructions)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            recipe.id,
            STATIC_OWNER_SCOPE,
            recipe.name,
            normalizeDesiredMargin(recipe.desiredMargin),
            normalizeFixedCostsPercentage(recipe.fixedCostsPercentage),
            normalizeCategory(recipe.category),
            normalizeOptionalText(recipe.instructions) ?? null,
          ],
        );

        for (const ri of recipe.ingredients) {
          await client.query(
            `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, comment)
             VALUES ($1, $2, $3, $4, $5)`,
            [
              recipe.id,
              ri.ingredientId,
              ri.quantity,
              ri.unit,
              normalizeRecipeComment(ri.comment),
            ],
          );
        }

        for (const presentation of recipe.presentations) {
          await client.query(
            `INSERT INTO recipe_presentations (id, recipe_id, name, units_per_batch)
             VALUES ($1, $2, $3, $4)`,
            [
              presentation.id,
              recipe.id,
              presentation.name,
              presentation.unitsPerBatch,
            ],
          );
        }
      }

      await syncPostgresIngredientsIdentity(client);

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return;
  }

  const countStmt = driver.db.prepare(
    "SELECT COUNT(*) AS count FROM ingredients WHERE owner_id = ?;",
  );
  const count = Number(
    (countStmt.get(STATIC_OWNER_SCOPE) as { count: number }).count ?? 0,
  );
  if (count > 0) return;

  const { ingredients, recipes } = await readSeedData();

  const insertIngredient = driver.db.prepare(`
    INSERT INTO ingredients (id, owner_id, name, unit, price, purchase_quantity, brand, supplier)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insertRecipe = driver.db.prepare(`
    INSERT INTO recipes (id, owner_id, name, desired_margin, fixed_costs_percentage, category, instructions)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertRecipeIngredient = driver.db.prepare(`
    INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, comment)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertPresentation = driver.db.prepare(`
    INSERT INTO recipe_presentations (id, recipe_id, name, units_per_batch)
    VALUES (?, ?, ?, ?)
  `);

  driver.db.exec("BEGIN;");
  try {
    for (const ingredient of ingredients) {
      insertIngredient.run(
        ingredient.id,
        STATIC_OWNER_SCOPE,
        ingredient.name,
        ingredient.unit,
        ingredient.price,
        ingredient.purchaseQuantity,
        normalizeOptionalText(ingredient.brand) ?? null,
        normalizeOptionalText(ingredient.supplier) ?? null,
      );
    }

    for (const recipe of recipes) {
      insertRecipe.run(
        recipe.id,
        STATIC_OWNER_SCOPE,
        recipe.name,
        normalizeDesiredMargin(recipe.desiredMargin),
        normalizeFixedCostsPercentage(recipe.fixedCostsPercentage),
        normalizeCategory(recipe.category),
        normalizeOptionalText(recipe.instructions) ?? null,
      );

      for (const ri of recipe.ingredients) {
        insertRecipeIngredient.run(
          recipe.id,
          ri.ingredientId,
          ri.quantity,
          ri.unit,
          normalizeRecipeComment(ri.comment),
        );
      }

      for (const presentation of recipe.presentations) {
        insertPresentation.run(
          presentation.id,
          recipe.id,
          presentation.name,
          presentation.unitsPerBatch,
        );
      }
    }

    driver.db.exec("COMMIT;");
  } catch (error) {
    driver.db.exec("ROLLBACK;");
    throw error;
  }
}

/**
 * Verifica que una receta pertenezca al owner dado.
 * Retorna `true` si existe la receta con ese `owner_id`.
 */
export async function recipeBelongsToOwner(
  driver: Driver,
  recipeId: number,
  ownerId: string,
): Promise<boolean> {
  const scopeId = requireOwnerId(ownerId);

  if (driver.kind === "postgres") {
    const recipeRes = await driver.pool.query<{ id: number }>(
      "SELECT id FROM recipes WHERE id = $1 AND owner_id = $2 LIMIT 1",
      [recipeId, scopeId],
    );
    return Boolean(recipeRes.rows[0]);
  }

  const recipe = driver.db
    .prepare("SELECT id FROM recipes WHERE id = ? AND owner_id = ? LIMIT 1")
    .get(recipeId, scopeId) as { id: number } | undefined;

  return Boolean(recipe);
}

/**
 * Verifica que todos los ingredientes en `ingredientIds` pertenezcan
 * al mismo owner. Retorna `true` solo si todos existen bajo ese owner.
 */
export async function ingredientsBelongToOwner(
  driver: Driver,
  ingredientIds: number[],
  ownerId: string,
): Promise<boolean> {
  const uniqueIngredientIds = [
    ...new Set(ingredientIds.filter((id) => Number.isFinite(id))),
  ];
  if (uniqueIngredientIds.length === 0) return true;

  const scopeId = requireOwnerId(ownerId);

  if (driver.kind === "postgres") {
    const countRes = await driver.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM ingredients
       WHERE owner_id = $1
         AND id = ANY($2::int[])`,
      [scopeId, uniqueIngredientIds],
    );

    return Number(countRes.rows[0]?.count ?? 0) === uniqueIngredientIds.length;
  }

  const placeholders = uniqueIngredientIds.map(() => "?").join(", ");
  const countRow = driver.db
    .prepare(
      `SELECT COUNT(*) AS count
       FROM ingredients
       WHERE owner_id = ?
         AND id IN (${placeholders})`,
    )
    .get(scopeId, ...uniqueIngredientIds) as { count: number };

  return Number(countRow.count ?? 0) === uniqueIngredientIds.length;
}

/**
 * Inicializa la base de datos de forma lazy y cacheada.
 *
 * Garantiza que `createTables` y `seedIfNeeded` se ejecuten una sola
 * vez por proceso. Si la versión del esquema cambia, reinicia la
 * inicialización. Todas las funciones CRUD llaman a `ensureInitialized`
 * antes de operar.
 */
export async function ensureInitialized() {
  if (globals.__recipesSchemaVersion !== RECIPE_DATA_SCHEMA_VERSION) {
    globals.__recipesInit = undefined;
  }

  if (!globals.__recipesInit) {
    globals.__recipesInit = (async () => {
      const driver = await getDriver();
      await createTables(driver);
      await seedIfNeeded(driver);
    })();
    globals.__recipesSchemaVersion = RECIPE_DATA_SCHEMA_VERSION;
  }

  try {
    await globals.__recipesInit;
  } catch (error) {
    globals.__recipesInit = undefined;
    globals.__recipesSchemaVersion = undefined;
    throw error;
  }
}
