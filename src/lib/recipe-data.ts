import fs from "node:fs/promises";
import path from "node:path";
import { Pool } from "pg";

type SqliteDatabaseSync = import("node:sqlite").DatabaseSync;

export type Ingredient = {
  id: number;
  name: string;
  unit: string;
  price: number;
  purchaseQuantity: number;
  brand?: string;
  supplier?: string;
};

export type RecipeIngredient = {
  ingredientId: number;
  quantity: number;
  unit: string;
  comment?: string;
};

export type RecipeIngredientWithData = RecipeIngredient & {
  ingredient: Ingredient;
};

export type RecipePresentation = {
  id: number;
  name: string;
  unitsPerBatch: number;
  salePrice?: number;
};

export type RecipeWithIngredients = {
  id: number;
  name: string;
  desiredMargin: number;
  fixedCostsPercentage: number;
  updatedAt?: string;
  ingredients: RecipeIngredientWithData[];
  presentations: RecipePresentation[];
};

export type RecipeSummary = {
  id: number;
  name: string;
  ingredientCount: number;
};

export type CreateIngredientInput = {
  name: string;
  unit: string;
  price: number;
  purchaseQuantity?: number;
  brand?: string;
  supplier?: string;
};

export type DeleteIngredientResult =
  | { status: "deleted" }
  | { status: "not-found" }
  | {
      status: "blocked";
      recipes: Array<{ id: number; name: string }>;
    };

type RecipeSeed = {
  id: number;
  name: string;
  desiredMargin: number;
  fixedCostsPercentage: number;
  ingredients: RecipeIngredient[];
  presentations: RecipePresentation[];
};

type Driver =
  | { kind: "postgres"; pool: Pool }
  | { kind: "sqlite"; db: SqliteDatabaseSync };

const useDatabase = (import.meta.env.BETTER_AUTH_USE_DB || process.env.BETTER_AUTH_USE_DB || "true") !== "false";
const databasePath = import.meta.env.BETTER_AUTH_DB_PATH || process.env.BETTER_AUTH_DB_PATH || "./data/auth.db";
const postgresUrlRaw = import.meta.env.DATABASE_URL || process.env.DATABASE_URL || import.meta.env.POSTGRES_URL || process.env.POSTGRES_URL;
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

const isLocalDatabaseUrl = safePostgresUrl ? /localhost|127\.0\.0\.1/.test(safePostgresUrl) : false;

const globals = globalThis as typeof globalThis & {
  __recipesDriver?: Driver;
  __recipesInit?: Promise<void>;
};

const seedIngredientsPath = path.resolve(process.cwd(), "data/ingredients.json");
const seedRecipesPath = path.resolve(process.cwd(), "data/recipes.json");

const normalizeOptionalText = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

const toNumber = (value: unknown) => Number(value ?? 0);

async function getDriver(): Promise<Driver> {
  if (globals.__recipesDriver) return globals.__recipesDriver;

  if (useDatabase && safePostgresUrl) {
    const pool = new Pool({
      connectionString: safePostgresUrl,
      ssl: isLocalDatabaseUrl ? undefined : { rejectUnauthorized: false },
    });
    globals.__recipesDriver = { kind: "postgres", pool };
    return globals.__recipesDriver;
  }

  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(path.resolve(process.cwd(), databasePath));
  db.exec("PRAGMA foreign_keys = ON;");
  globals.__recipesDriver = { kind: "sqlite", db };
  return globals.__recipesDriver;
}

async function createTables(driver: Driver) {
  if (driver.kind === "postgres") {
    await driver.pool.query(`
      CREATE TABLE IF NOT EXISTS ingredients (
        id INTEGER PRIMARY KEY,
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
        name TEXT NOT NULL,
        desired_margin NUMERIC NOT NULL DEFAULT 0,
        fixed_costs_percentage NUMERIC NOT NULL DEFAULT 0,
        updated_at TIMESTAMP
      );
    `);
    
    // Add column if it doesn't exist
    try {
      await driver.pool.query("ALTER TABLE recipes ADD COLUMN updated_at TIMESTAMP");
    } catch (e) {
      // Column likely exists
    }

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

    await driver.pool.query("CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);");
    await driver.pool.query("CREATE INDEX IF NOT EXISTS idx_recipe_presentations_recipe_id ON recipe_presentations(recipe_id);");
    return;
  }

  driver.db.exec(`
    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      unit TEXT NOT NULL,
      price REAL NOT NULL,
      purchase_quantity REAL NOT NULL,
      brand TEXT,
      supplier TEXT
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      desired_margin REAL NOT NULL DEFAULT 0,
      fixed_costs_percentage REAL NOT NULL DEFAULT 0,
      updated_at TEXT
    );
  `);
  
  // Add column if it doesn't exist
  try {
    driver.db.exec("ALTER TABLE recipes ADD COLUMN updated_at TEXT");
  } catch (e) {
    // Column likely exists
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
  `);
}

async function readSeedData() {
  const [ingredientsRaw, recipesRaw] = await Promise.all([
    fs.readFile(seedIngredientsPath, "utf-8"),
    fs.readFile(seedRecipesPath, "utf-8"),
  ]);

  return {
    ingredients: JSON.parse(ingredientsRaw) as Ingredient[],
    recipes: JSON.parse(recipesRaw) as RecipeSeed[],
  };
}

async function seedIfNeeded(driver: Driver) {
  if (driver.kind === "postgres") {
    const countRes = await driver.pool.query<{ count: string }>("SELECT COUNT(*)::text AS count FROM ingredients;");
    if (Number(countRes.rows[0]?.count ?? 0) > 0) return;

    const { ingredients, recipes } = await readSeedData();
    const client = await driver.pool.connect();
    try {
      await client.query("BEGIN");

      for (const ingredient of ingredients) {
        await client.query(
          `INSERT INTO ingredients (id, name, unit, price, purchase_quantity, brand, supplier)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            ingredient.id,
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
          `INSERT INTO recipes (id, name, desired_margin, fixed_costs_percentage)
           VALUES ($1, $2, $3, $4)`,
          [recipe.id, recipe.name, recipe.desiredMargin, recipe.fixedCostsPercentage],
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
              normalizeOptionalText(ri.comment),
            ],
          );
        }

        for (const presentation of recipe.presentations) {
          await client.query(
            `INSERT INTO recipe_presentations (id, recipe_id, name, units_per_batch)
             VALUES ($1, $2, $3, $4)`,
            [presentation.id, recipe.id, presentation.name, presentation.unitsPerBatch],
          );
        }
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return;
  }

  const countStmt = driver.db.prepare("SELECT COUNT(*) AS count FROM ingredients;");
  const count = Number((countStmt.get() as { count: number }).count ?? 0);
  if (count > 0) return;

  const { ingredients, recipes } = await readSeedData();

  const insertIngredient = driver.db.prepare(`
    INSERT INTO ingredients (id, name, unit, price, purchase_quantity, brand, supplier)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertRecipe = driver.db.prepare(`
    INSERT INTO recipes (id, name, desired_margin, fixed_costs_percentage)
    VALUES (?, ?, ?, ?)
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
        ingredient.name,
        ingredient.unit,
        ingredient.price,
        ingredient.purchaseQuantity,
        normalizeOptionalText(ingredient.brand) ?? null,
        normalizeOptionalText(ingredient.supplier) ?? null,
      );
    }

    for (const recipe of recipes) {
      insertRecipe.run(recipe.id, recipe.name, recipe.desiredMargin, recipe.fixedCostsPercentage);

      for (const ri of recipe.ingredients) {
        insertRecipeIngredient.run(
          recipe.id,
          ri.ingredientId,
          ri.quantity,
          ri.unit,
          normalizeOptionalText(ri.comment) ?? null,
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

export async function updatePresentation(
  id: number,
  input: { unitsPerBatch?: number; salePrice?: number }
): Promise<void> {
  await ensureInitialized();
  const driver = await getDriver();

  if (driver.kind === "postgres") {
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (input.unitsPerBatch !== undefined) {
      updates.push(`units_per_batch = $${paramIndex++}`);
      values.push(input.unitsPerBatch);
    }
    if (input.salePrice !== undefined) {
      updates.push(`sale_price = $${paramIndex++}`);
      values.push(input.salePrice);
    }

    if (updates.length === 0) return;

    values.push(id);
    await driver.pool.query(
      `UPDATE recipe_presentations SET ${updates.join(', ')} WHERE id = $${paramIndex}`,
      values
    );
    return;
  }

  const updates = [];
  const values = [];

  if (input.unitsPerBatch !== undefined) {
    updates.push(`units_per_batch = ?`);
    values.push(input.unitsPerBatch);
  }
  if (input.salePrice !== undefined) {
    updates.push(`sale_price = ?`);
    values.push(input.salePrice);
  }

  if (updates.length === 0) return;

  values.push(id);
  driver.db.prepare(
    `UPDATE recipe_presentations SET ${updates.join(', ')} WHERE id = ?`
  ).run(...values);
}

async function ensureInitialized() {
  if (!globals.__recipesInit) {
    globals.__recipesInit = (async () => {
      const driver = await getDriver();
      await createTables(driver);
      await seedIfNeeded(driver);
    })();
  }
  await globals.__recipesInit;
}

export async function listIngredients(): Promise<Ingredient[]> {
  await ensureInitialized();
  const driver = await getDriver();

  if (driver.kind === "postgres") {
    const res = await driver.pool.query<{
      id: number;
      name: string;
      unit: string;
      price: string;
      purchase_quantity: string;
      brand: string | null;
      supplier: string | null;
    }>(`
      SELECT id, name, unit, price::text, purchase_quantity::text, brand, supplier
      FROM ingredients
      ORDER BY id ASC
    `);

    return res.rows.map((row) => ({
      id: Number(row.id),
      name: row.name,
      unit: row.unit,
      price: toNumber(row.price),
      purchaseQuantity: toNumber(row.purchase_quantity),
      brand: normalizeOptionalText(row.brand),
      supplier: normalizeOptionalText(row.supplier),
    }));
  }

  const rows = driver.db
    .prepare(
      `SELECT id, name, unit, price, purchase_quantity, brand, supplier FROM ingredients ORDER BY id ASC`,
    )
    .all() as Array<{
    id: number;
    name: string;
    unit: string;
    price: number;
    purchase_quantity: number;
    brand: string | null;
    supplier: string | null;
  }>;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    unit: row.unit,
    price: Number(row.price),
    purchaseQuantity: Number(row.purchase_quantity),
    brand: normalizeOptionalText(row.brand),
    supplier: normalizeOptionalText(row.supplier),
  }));
}

export async function listRecipeSummaries(): Promise<RecipeSummary[]> {
  await ensureInitialized();
  const driver = await getDriver();

  if (driver.kind === "postgres") {
    const res = await driver.pool.query<{ id: number; name: string; ingredient_count: string }>(`
      SELECT r.id, r.name, COUNT(ri.id)::text AS ingredient_count
      FROM recipes r
      LEFT JOIN recipe_ingredients ri ON ri.recipe_id = r.id
      GROUP BY r.id, r.name
      ORDER BY r.id ASC
    `);

    return res.rows.map((row) => ({
      id: Number(row.id),
      name: row.name,
      ingredientCount: Number(row.ingredient_count),
    }));
  }

  const rows = driver.db
    .prepare(`
      SELECT r.id, r.name, COUNT(ri.id) AS ingredient_count
      FROM recipes r
      LEFT JOIN recipe_ingredients ri ON ri.recipe_id = r.id
      GROUP BY r.id, r.name
      ORDER BY r.id ASC
    `)
    .all() as Array<{ id: number; name: string; ingredient_count: number }>;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    ingredientCount: Number(row.ingredient_count),
  }));
}

export async function listIngredientUsage(): Promise<Record<number, string[]>> {
  await ensureInitialized();
  const driver = await getDriver();

  const usageByIngredient: Record<number, string[]> = {};

  if (driver.kind === "postgres") {
    const rows = await driver.pool.query<{ ingredient_id: number; recipe_name: string }>(`
      SELECT ri.ingredient_id, r.name AS recipe_name
      FROM recipe_ingredients ri
      INNER JOIN recipes r ON r.id = ri.recipe_id
      ORDER BY ri.ingredient_id ASC, r.id ASC
    `);

    for (const row of rows.rows) {
      const ingredientId = Number(row.ingredient_id);
      if (!usageByIngredient[ingredientId]) {
        usageByIngredient[ingredientId] = [];
      }
      usageByIngredient[ingredientId].push(row.recipe_name);
    }

    return usageByIngredient;
  }

  const rows = driver.db
    .prepare(`
      SELECT ri.ingredient_id, r.name AS recipe_name
      FROM recipe_ingredients ri
      INNER JOIN recipes r ON r.id = ri.recipe_id
      ORDER BY ri.ingredient_id ASC, r.id ASC
    `)
    .all() as Array<{ ingredient_id: number; recipe_name: string }>;

  for (const row of rows) {
    const ingredientId = Number(row.ingredient_id);
    if (!usageByIngredient[ingredientId]) {
      usageByIngredient[ingredientId] = [];
    }
    usageByIngredient[ingredientId].push(row.recipe_name);
  }

  return usageByIngredient;
}

export async function getRecipeById(recipeId: string | number): Promise<RecipeWithIngredients | null> {
  await ensureInitialized();
  const driver = await getDriver();
  const id = Number(recipeId);
  if (!Number.isFinite(id)) return null;

  if (driver.kind === "postgres") {
    const recipeRes = await driver.pool.query<{
      id: number;
      name: string;
      desired_margin: string;
      fixed_costs_percentage: string;
      updated_at: string | null;
    }>(
      `SELECT id, name, desired_margin::text, fixed_costs_percentage::text, updated_at::text FROM recipes WHERE id = $1 LIMIT 1`,
      [id],
    );
    const recipe = recipeRes.rows[0];
    if (!recipe) return null;

    const ingredientsRes = await driver.pool.query<{
      ingredient_id: number;
      quantity: string;
      unit: string;
      comment: string | null;
      ingredient_name: string;
      ingredient_unit: string;
      ingredient_price: string;
      ingredient_purchase_quantity: string;
      ingredient_brand: string | null;
      ingredient_supplier: string | null;
    }>(
      `
      SELECT
        ri.ingredient_id,
        ri.quantity::text,
        ri.unit,
        ri.comment,
        i.name AS ingredient_name,
        i.unit AS ingredient_unit,
        i.price::text AS ingredient_price,
        i.purchase_quantity::text AS ingredient_purchase_quantity,
        i.brand AS ingredient_brand,
        i.supplier AS ingredient_supplier
      FROM recipe_ingredients ri
      INNER JOIN ingredients i ON i.id = ri.ingredient_id
      WHERE ri.recipe_id = $1
      ORDER BY ri.id ASC
      `,
      [id],
    );

    const presentationsRes = await driver.pool.query<{
      id: number;
      name: string;
      units_per_batch: string;
      sale_price: string | null;
    }>(
      `SELECT id, name, units_per_batch::text, sale_price::text FROM recipe_presentations WHERE recipe_id = $1 ORDER BY id ASC`,
      [id],
    );

    return {
      id: Number(recipe.id),
      name: recipe.name,
      desiredMargin: toNumber(recipe.desired_margin),
      fixedCostsPercentage: toNumber(recipe.fixed_costs_percentage),
      updatedAt: recipe.updated_at ? new Date(recipe.updated_at).toISOString() : undefined,
      ingredients: ingredientsRes.rows.map((row) => ({
        ingredientId: Number(row.ingredient_id),
        quantity: toNumber(row.quantity),
        unit: row.unit,
        comment: normalizeOptionalText(row.comment),
        ingredient: {
          id: Number(row.ingredient_id),
          name: row.ingredient_name,
          unit: row.ingredient_unit,
          price: toNumber(row.ingredient_price),
          purchaseQuantity: toNumber(row.ingredient_purchase_quantity),
          brand: normalizeOptionalText(row.ingredient_brand),
          supplier: normalizeOptionalText(row.ingredient_supplier),
        },
      })),
      presentations: presentationsRes.rows.map((row) => ({
        id: Number(row.id),
        name: row.name,
        unitsPerBatch: toNumber(row.units_per_batch),
        salePrice: row.sale_price !== null ? toNumber(row.sale_price) : undefined,
      })),
    };
  }

  const recipe = driver.db
    .prepare(
      `SELECT id, name, desired_margin, fixed_costs_percentage, updated_at FROM recipes WHERE id = ? LIMIT 1`,
    )
    .get(id) as
    | { id: number; name: string; desired_margin: number; fixed_costs_percentage: number; updated_at: string | null }
    | undefined;

  if (!recipe) return null;

  const ingredientRows = driver.db
    .prepare(`
      SELECT
        ri.ingredient_id,
        ri.quantity,
        ri.unit,
        ri.comment,
        i.name AS ingredient_name,
        i.unit AS ingredient_unit,
        i.price AS ingredient_price,
        i.purchase_quantity AS ingredient_purchase_quantity,
        i.brand AS ingredient_brand,
        i.supplier AS ingredient_supplier
      FROM recipe_ingredients ri
      INNER JOIN ingredients i ON i.id = ri.ingredient_id
      WHERE ri.recipe_id = ?
      ORDER BY ri.id ASC
    `)
    .all(id) as Array<{
    ingredient_id: number;
    quantity: number;
    unit: string;
    comment: string | null;
    ingredient_name: string;
    ingredient_unit: string;
    ingredient_price: number;
    ingredient_purchase_quantity: number;
    ingredient_brand: string | null;
    ingredient_supplier: string | null;
  }>;

  const presentationRows = driver.db
    .prepare(`SELECT id, name, units_per_batch, sale_price FROM recipe_presentations WHERE recipe_id = ? ORDER BY id ASC`)
    .all(id) as Array<{ id: number; name: string; units_per_batch: number; sale_price: number | null }>;

  return {
    id: recipe.id,
    name: recipe.name,
    desiredMargin: Number(recipe.desired_margin),
    fixedCostsPercentage: Number(recipe.fixed_costs_percentage),
    updatedAt: recipe.updated_at ? new Date(recipe.updated_at).toISOString() : undefined,
    ingredients: ingredientRows.map((row) => ({
      ingredientId: row.ingredient_id,
      quantity: Number(row.quantity),
      unit: row.unit,
      comment: normalizeOptionalText(row.comment),
      ingredient: {
        id: row.ingredient_id,
        name: row.ingredient_name,
        unit: row.ingredient_unit,
        price: Number(row.ingredient_price),
        purchaseQuantity: Number(row.ingredient_purchase_quantity),
        brand: normalizeOptionalText(row.ingredient_brand),
        supplier: normalizeOptionalText(row.ingredient_supplier),
      },
    })),
    presentations: presentationRows.map((row) => ({
      id: row.id,
      name: row.name,
      unitsPerBatch: Number(row.units_per_batch),
      salePrice: row.sale_price !== null ? Number(row.sale_price) : undefined,
    })),
  };
}

export async function createIngredient(input: CreateIngredientInput): Promise<Ingredient> {
  await ensureInitialized();
  const driver = await getDriver();

  const name = input.name.trim();
  const unit = input.unit.trim();
  const price = Number(input.price);
  const purchaseQuantity = Number(input.purchaseQuantity ?? 1);
  const brand = normalizeOptionalText(input.brand);
  const supplier = normalizeOptionalText(input.supplier);

  if (!name || !unit || !Number.isFinite(price) || price < 0 || !Number.isFinite(purchaseQuantity) || purchaseQuantity <= 0) {
    throw new Error("Invalid ingredient input");
  }

  if (driver.kind === "postgres") {
    const nextIdRes = await driver.pool.query<{ next_id: string }>(
      `SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM ingredients`,
    );
    const nextId = Number(nextIdRes.rows[0]?.next_id ?? 1);

    const insertRes = await driver.pool.query<{
      id: number;
      name: string;
      unit: string;
      price: string;
      purchase_quantity: string;
      brand: string | null;
      supplier: string | null;
    }>(
      `
      INSERT INTO ingredients (id, name, unit, price, purchase_quantity, brand, supplier)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, unit, price::text, purchase_quantity::text, brand, supplier
      `,
      [nextId, name, unit, price, purchaseQuantity, brand ?? null, supplier ?? null],
    );

    const row = insertRes.rows[0];
    return {
      id: Number(row.id),
      name: row.name,
      unit: row.unit,
      price: toNumber(row.price),
      purchaseQuantity: toNumber(row.purchase_quantity),
      brand: normalizeOptionalText(row.brand),
      supplier: normalizeOptionalText(row.supplier),
    };
  }

  const nextIdRow = driver.db
    .prepare(`SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM ingredients`)
    .get() as { next_id: number };
  const nextId = Number(nextIdRow.next_id ?? 1);

  driver.db
    .prepare(
      `
      INSERT INTO ingredients (id, name, unit, price, purchase_quantity, brand, supplier)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .run(nextId, name, unit, price, purchaseQuantity, brand ?? null, supplier ?? null);

  return {
    id: nextId,
    name,
    unit,
    price,
    purchaseQuantity,
    brand,
    supplier,
  };
}

export async function deleteIngredient(ingredientId: number): Promise<DeleteIngredientResult> {
  await ensureInitialized();
  const driver = await getDriver();

  if (!Number.isFinite(ingredientId)) {
    return { status: "not-found" };
  }

  if (driver.kind === "postgres") {
    const existsRes = await driver.pool.query<{ id: number }>(
      `SELECT id FROM ingredients WHERE id = $1 LIMIT 1`,
      [ingredientId],
    );
    if (!existsRes.rows[0]) return { status: "not-found" };

    const usageRes = await driver.pool.query<{ id: number; name: string }>(
      `
      SELECT DISTINCT r.id, r.name
      FROM recipe_ingredients ri
      INNER JOIN recipes r ON r.id = ri.recipe_id
      WHERE ri.ingredient_id = $1
      ORDER BY r.id ASC
      `,
      [ingredientId],
    );

    if (usageRes.rows.length > 0) {
      return {
        status: "blocked",
        recipes: usageRes.rows.map((row) => ({ id: Number(row.id), name: row.name })),
      };
    }

    await driver.pool.query(`DELETE FROM ingredients WHERE id = $1`, [ingredientId]);
    return { status: "deleted" };
  }

  const exists = driver.db
    .prepare(`SELECT id FROM ingredients WHERE id = ? LIMIT 1`)
    .get(ingredientId) as { id: number } | undefined;
  if (!exists) return { status: "not-found" };

  const usageRows = driver.db
    .prepare(
      `
      SELECT DISTINCT r.id, r.name
      FROM recipe_ingredients ri
      INNER JOIN recipes r ON r.id = ri.recipe_id
      WHERE ri.ingredient_id = ?
      ORDER BY r.id ASC
      `,
    )
    .all(ingredientId) as Array<{ id: number; name: string }>;

  if (usageRows.length > 0) {
    return {
      status: "blocked",
      recipes: usageRows.map((row) => ({ id: Number(row.id), name: row.name })),
    };
  }

  driver.db.prepare(`DELETE FROM ingredients WHERE id = ?`).run(ingredientId);
  return { status: "deleted" };
}
export type UpdateRecipeInput = {
  name: string;
  desiredMargin: number;
  fixedCostsPercentage: number;
  ingredients: {
    ingredientId: number;
    quantity: number;
    unit: string;
    comment: string | null;
  }[];
};

export async function updateRecipe(recipeId: number, input: UpdateRecipeInput): Promise<void> {
  await ensureInitialized();
  const driver = await getDriver();

  const now = new Date().toISOString();

  if (driver.kind === "postgres") {
    const client = await driver.pool.connect();
    try {
      await client.query("BEGIN");
      
      await client.query(
        "UPDATE recipes SET name = $1, desired_margin = $2, fixed_costs_percentage = $3, updated_at = $4 WHERE id = $5",
        [input.name, input.desiredMargin, input.fixedCostsPercentage, now, recipeId]
      );

      await client.query("DELETE FROM recipe_ingredients WHERE recipe_id = $1", [recipeId]);

      for (const ing of input.ingredients) {
        await client.query(
          `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, comment)
           VALUES ($1, $2, $3, $4, $5)`,
          [recipeId, ing.ingredientId, ing.quantity, ing.unit, ing.comment || null]
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    return;
  }

  driver.db.exec("BEGIN");
  try {
    driver.db.prepare("UPDATE recipes SET name = ?, desired_margin = ?, fixed_costs_percentage = ?, updated_at = ? WHERE id = ?").run(input.name, input.desiredMargin, input.fixedCostsPercentage, now, recipeId);
    driver.db.prepare("DELETE FROM recipe_ingredients WHERE recipe_id = ?").run(recipeId);

    const insertStmt = driver.db.prepare(
      `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, comment)
       VALUES (?, ?, ?, ?, ?)`
    );

    for (const ing of input.ingredients) {
      insertStmt.run(recipeId, ing.ingredientId, ing.quantity, ing.unit, ing.comment || null);
    }
    driver.db.exec("COMMIT");
  } catch (error) {
    driver.db.exec("ROLLBACK");
    throw error;
  }
}
