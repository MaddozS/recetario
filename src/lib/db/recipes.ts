/**
 * Operaciones CRUD para la entidad Recipe.
 *
 * Al igual que `ingredients.ts`, todas las operaciones requieren
 * `ownerId` para multi-tenancy. `updateRecipe` reemplaza todos
 * los ingredientes de la receta en una transacción.
 */

import type {
  RecipeSummary,
  RecipeWithIngredients,
  CreateRecipeInput,
  DeleteRecipeResult,
  UpdateRecipeInput,
} from "./types";
import {
  normalizeOptionalText,
  requireOwnerId,
  toNumber,
  normalizeDesiredMargin,
  normalizeFixedCostsPercentage,
  normalizeRecipeComment,
  normalizeCategory,
} from "./helpers";
import {
  getDriver,
  ensureInitialized,
  recipeBelongsToOwner,
  ingredientsBelongToOwner,
  STATIC_OWNER_SCOPE,
} from "./connection";

/**
 * Lista resúmenes ligeros de recetas con conteo de ingredientes.
 * Usado en el sidebar y en la página índice de recetas.
 */
export async function listRecipeSummaries(
  ownerId = STATIC_OWNER_SCOPE,
): Promise<RecipeSummary[]> {
  await ensureInitialized();
  const driver = await getDriver();
  const scopeId = requireOwnerId(ownerId);

  if (driver.kind === "postgres") {
    const res = await driver.pool.query<{
      id: number;
      name: string;
      category: string | null;
      ingredient_count: string;
    }>(
      `
      SELECT r.id, r.name, r.category, COUNT(ri.id)::text AS ingredient_count
      FROM recipes r
      LEFT JOIN recipe_ingredients ri ON ri.recipe_id = r.id
      WHERE r.owner_id = $1
      GROUP BY r.id, r.name, r.category
      ORDER BY r.id ASC
    `,
      [scopeId],
    );

    return res.rows.map((row) => ({
      id: Number(row.id),
      name: row.name,
      category: normalizeOptionalText(row.category),
      ingredientCount: Number(row.ingredient_count),
    }));
  }

  const rows = driver.db
    .prepare(
      `
       SELECT r.id, r.name, r.category, COUNT(ri.id) AS ingredient_count
       FROM recipes r
       LEFT JOIN recipe_ingredients ri ON ri.recipe_id = r.id
       WHERE r.owner_id = ?
       GROUP BY r.id, r.name, r.category
       ORDER BY r.id ASC
     `,
    )
    .all(scopeId) as Array<{
    id: number;
    name: string;
    category: string | null;
    ingredient_count: number;
  }>;

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: normalizeOptionalText(row.category),
    ingredientCount: Number(row.ingredient_count),
  }));
}

/**
 * Obtiene una receta completa por ID, incluyendo ingredientes
 * resueltos (con datos del insumo) y presentaciones. Retorna
 * `null` si no existe bajo ese owner.
 */
export async function getRecipeById(
  recipeId: string | number,
  ownerId = STATIC_OWNER_SCOPE,
): Promise<RecipeWithIngredients | null> {
  await ensureInitialized();
  const driver = await getDriver();
  const id = Number(recipeId);
  const scopeId = requireOwnerId(ownerId);
  if (!Number.isFinite(id)) return null;

  if (driver.kind === "postgres") {
    const recipeRes = await driver.pool.query<{
      id: number;
      name: string;
      category: string | null;
      desired_margin: string;
      fixed_costs_percentage: string;
      updated_at: string | null;
    }>(
      `SELECT id, name, category, desired_margin::text, fixed_costs_percentage::text, updated_at::text FROM recipes WHERE id = $1 AND owner_id = $2 LIMIT 1`,
      [id, scopeId],
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
        AND i.owner_id = $2
      ORDER BY ri.id ASC
      `,
      [id, scopeId],
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
      category: normalizeOptionalText(recipe.category),
      desiredMargin: normalizeDesiredMargin(recipe.desired_margin),
      fixedCostsPercentage: normalizeFixedCostsPercentage(
        recipe.fixed_costs_percentage,
      ),
      updatedAt: recipe.updated_at
        ? new Date(recipe.updated_at).toISOString()
        : undefined,
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
        salePrice:
          row.sale_price !== null ? toNumber(row.sale_price) : undefined,
      })),
    };
  }

  const recipe = driver.db
    .prepare(
      `SELECT id, name, category, desired_margin, fixed_costs_percentage, updated_at FROM recipes WHERE id = ? AND owner_id = ? LIMIT 1`,
    )
    .get(id, scopeId) as
    | {
        id: number;
        name: string;
        category: string | null;
        desired_margin: number;
        fixed_costs_percentage: number;
        updated_at: string | null;
      }
    | undefined;

  if (!recipe) return null;

  const ingredientRows = driver.db
    .prepare(
      `
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
        AND i.owner_id = ?
      ORDER BY ri.id ASC
    `,
    )
    .all(id, scopeId) as Array<{
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
    .prepare(
      `SELECT id, name, units_per_batch, sale_price FROM recipe_presentations WHERE recipe_id = ? ORDER BY id ASC`,
    )
    .all(id) as Array<{
    id: number;
    name: string;
    units_per_batch: number;
    sale_price: number | null;
  }>;

  return {
    id: recipe.id,
    name: recipe.name,
    category: normalizeOptionalText(recipe.category),
    desiredMargin: normalizeDesiredMargin(recipe.desired_margin),
    fixedCostsPercentage: normalizeFixedCostsPercentage(
      recipe.fixed_costs_percentage,
    ),
    updatedAt: recipe.updated_at
      ? new Date(recipe.updated_at).toISOString()
      : undefined,
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

/**
 * Crea una nueva receta con nombre y márgenes.
 *
 * Si no se especifica nombre, usa "Nueva Receta". En Postgres
 * bloquea la tabla para calcular el siguiente ID secuencialmente.
 */
export async function createRecipe(
  input: CreateRecipeInput = {},
  ownerId = STATIC_OWNER_SCOPE,
): Promise<{ id: number; name: string }> {
  await ensureInitialized();
  const driver = await getDriver();
  const scopeId = requireOwnerId(ownerId);

  const name = normalizeOptionalText(input.name) ?? "Nueva Receta";
  const category = normalizeCategory(input.category);
  const desiredMargin = normalizeDesiredMargin(input.desiredMargin ?? 0);
  const fixedCostsPercentage = normalizeFixedCostsPercentage(
    input.fixedCostsPercentage ?? 0,
  );
  const now = new Date().toISOString();

  if (driver.kind === "postgres") {
    const client = await driver.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("LOCK TABLE recipes IN EXCLUSIVE MODE");

      const nextIdRes = await client.query<{ next_id: string }>(
        "SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM recipes",
      );
      const recipeId = Number(nextIdRes.rows[0]?.next_id ?? 1);

      const insertRes = await client.query<{ id: number; name: string }>(
        `
        INSERT INTO recipes (id, owner_id, name, desired_margin, fixed_costs_percentage, updated_at, category)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, name
        `,
        [recipeId, scopeId, name, desiredMargin, fixedCostsPercentage, now, category],
      );

      await client.query("COMMIT");

      const row = insertRes.rows[0];
      return {
        id: Number(row.id),
        name: row.name,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  const result = driver.db
    .prepare(
      `
      INSERT INTO recipes (owner_id, name, desired_margin, fixed_costs_percentage, updated_at, category)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
    )
    .run(scopeId, name, desiredMargin, fixedCostsPercentage, now, category) as {
    lastInsertRowid?: number | bigint;
  };

  return {
    id: Number(result.lastInsertRowid ?? 0),
    name,
  };
}

/**
 * Elimina una receta por ID. No tiene restricciones de foreign key
 * que bloqueen la eliminación (los ingredientes relacionados se
 * eliminan en cascada).
 */
export async function deleteRecipe(
  recipeId: number,
  ownerId = STATIC_OWNER_SCOPE,
): Promise<DeleteRecipeResult> {
  await ensureInitialized();
  const driver = await getDriver();
  const scopeId = requireOwnerId(ownerId);

  if (!Number.isFinite(recipeId)) {
    return { status: "not-found" };
  }

  if (driver.kind === "postgres") {
    const deleteRes = await driver.pool.query(
      "DELETE FROM recipes WHERE id = $1 AND owner_id = $2",
      [recipeId, scopeId],
    );

    return Number(deleteRes.rowCount ?? 0) > 0
      ? { status: "deleted" }
      : { status: "not-found" };
  }

  const result = driver.db
    .prepare("DELETE FROM recipes WHERE id = ? AND owner_id = ?")
    .run(recipeId, scopeId) as { changes?: number | bigint };

  return Number(result.changes ?? 0) > 0
    ? { status: "deleted" }
    : { status: "not-found" };
}

/**
 * Actualiza una receta completa.
 *
 * Reemplaza nombre, márgenes y la lista de ingredientes en una
 * sola transacción. Primero elimina todos los `recipe_ingredients`
 * existentes y luego inserta los nuevos. Verifica que todos los
 * ingredientes pertenezcan al mismo owner.
 */
export async function updateRecipe(
  recipeId: number,
  input: UpdateRecipeInput,
  ownerId = STATIC_OWNER_SCOPE,
): Promise<void> {
  await ensureInitialized();
  const driver = await getDriver();
  const scopeId = requireOwnerId(ownerId);

  const desiredMargin = normalizeDesiredMargin(input.desiredMargin);
  const fixedCostsPercentage = normalizeFixedCostsPercentage(
    input.fixedCostsPercentage,
  );
  const category = normalizeCategory(input.category);
  const now = new Date().toISOString();
  const ingredientIds = input.ingredients.map(
    (ingredient) => ingredient.ingredientId,
  );

  if (!(await recipeBelongsToOwner(driver, recipeId, scopeId))) {
    return;
  }

  if (!(await ingredientsBelongToOwner(driver, ingredientIds, scopeId))) {
    throw new Error("Invalid recipe ingredient selection");
  }

  if (driver.kind === "postgres") {
    const client = await driver.pool.connect();
    try {
      await client.query("BEGIN");

      await client.query(
        "UPDATE recipes SET name = $1, desired_margin = $2, fixed_costs_percentage = $3, category = $4, updated_at = NOW() WHERE id = $5 AND owner_id = $6",
        [input.name, desiredMargin, fixedCostsPercentage, category, recipeId, scopeId],
      );

      await client.query(
        "DELETE FROM recipe_ingredients WHERE recipe_id = $1",
        [recipeId],
      );

      for (const ing of input.ingredients) {
        await client.query(
          `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, comment)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            recipeId,
            ing.ingredientId,
            ing.quantity,
            ing.unit,
            normalizeRecipeComment(ing.comment),
          ],
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
    driver.db
      .prepare(
        "UPDATE recipes SET name = ?, desired_margin = ?, fixed_costs_percentage = ?, category = ?, updated_at = ? WHERE id = ? AND owner_id = ?",
      )
      .run(
        input.name,
        desiredMargin,
        fixedCostsPercentage,
        category,
        now,
        recipeId,
        scopeId,
      );
    driver.db
      .prepare("DELETE FROM recipe_ingredients WHERE recipe_id = ?")
      .run(recipeId);

    const insertStmt = driver.db.prepare(
      `INSERT INTO recipe_ingredients (recipe_id, ingredient_id, quantity, unit, comment)
       VALUES (?, ?, ?, ?, ?)`,
    );

    for (const ing of input.ingredients) {
      insertStmt.run(
        recipeId,
        ing.ingredientId,
        ing.quantity,
        ing.unit,
        normalizeRecipeComment(ing.comment),
      );
    }
    driver.db.exec("COMMIT");
  } catch (error) {
    driver.db.exec("ROLLBACK");
    throw error;
  }
}
