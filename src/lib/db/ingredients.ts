/**
 * Operaciones CRUD para la entidad Ingredient.
 *
 * Todas las funciones requieren un `ownerId` para garantizar
 * el aislamiento de datos entre usuarios (multi-tenancy).
 * El owner se resuelve a través de `ensureInitialized` que
 * establece la conexión y el scope.
 */

import type {
  Ingredient,
  CreateIngredientInput,
  UpdateIngredientInput,
  DeleteIngredientResult,
} from "./types";
import { normalizeOptionalText, requireOwnerId, toNumber } from "./helpers";
import { getDriver, ensureInitialized, STATIC_OWNER_SCOPE } from "./connection";

/**
 * Obtiene un ingrediente por ID (uso interno, no exportado directamente).
 * Todas las funciones CRUD exportadas garantizan la inicialización previa.
 */
async function getIngredientById(
  driver: import("./types").Driver,
  ingredientId: number,
  ownerId: string,
): Promise<Ingredient | null> {
  if (!Number.isFinite(ingredientId)) {
    return null;
  }

  const scopeId = requireOwnerId(ownerId);

  if (driver.kind === "postgres") {
    const res = await driver.pool.query<{
      id: number;
      name: string;
      unit: string;
      price: string;
      purchase_quantity: string;
      brand: string | null;
      supplier: string | null;
    }>(
      `
      SELECT id, name, unit, price::text, purchase_quantity::text, brand, supplier
      FROM ingredients
      WHERE id = $1 AND owner_id = $2
      LIMIT 1
      `,
      [ingredientId, scopeId],
    );

    const row = res.rows[0];
    if (!row) return null;

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

  const row = driver.db
    .prepare(
      `
      SELECT id, name, unit, price, purchase_quantity, brand, supplier
      FROM ingredients
      WHERE id = ? AND owner_id = ?
      LIMIT 1
      `,
    )
    .get(ingredientId, scopeId) as
    | {
        id: number;
        name: string;
        unit: string;
        price: number;
        purchase_quantity: number;
        brand: string | null;
        supplier: string | null;
      }
    | undefined;

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    unit: row.unit,
    price: Number(row.price),
    purchaseQuantity: Number(row.purchase_quantity),
    brand: normalizeOptionalText(row.brand),
    supplier: normalizeOptionalText(row.supplier),
  };
}

/**
 * Lista todos los ingredientes del owner, ordenados por ID.
 */
export async function listIngredients(
  ownerId = STATIC_OWNER_SCOPE,
): Promise<Ingredient[]> {
  await ensureInitialized();
  const driver = await getDriver();
  const scopeId = requireOwnerId(ownerId);

  if (driver.kind === "postgres") {
    const res = await driver.pool.query<{
      id: number;
      name: string;
      unit: string;
      price: string;
      purchase_quantity: string;
      brand: string | null;
      supplier: string | null;
    }>(
      `
      SELECT id, name, unit, price::text, purchase_quantity::text, brand, supplier
      FROM ingredients
      WHERE owner_id = $1
      ORDER BY id ASC
    `,
      [scopeId],
    );

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
      `SELECT id, name, unit, price, purchase_quantity, brand, supplier FROM ingredients WHERE owner_id = ? ORDER BY id ASC`,
    )
    .all(scopeId) as Array<{
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

/**
 * Devuelve un mapa de `ingredientId -> nombres de recetas` que usan
 * cada ingrediente. Útil para saber si un ingrediente puede eliminarse.
 */
export async function listIngredientUsage(
  ownerId = STATIC_OWNER_SCOPE,
): Promise<Record<number, string[]>> {
  await ensureInitialized();
  const driver = await getDriver();
  const scopeId = requireOwnerId(ownerId);

  const usageByIngredient: Record<number, string[]> = {};

  if (driver.kind === "postgres") {
    const rows = await driver.pool.query<{
      ingredient_id: number;
      recipe_name: string;
    }>(
      `
      SELECT ri.ingredient_id, r.name AS recipe_name
      FROM recipe_ingredients ri
      INNER JOIN recipes r ON r.id = ri.recipe_id
      WHERE r.owner_id = $1
      ORDER BY ri.ingredient_id ASC, r.id ASC
    `,
      [scopeId],
    );

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
    .prepare(
      `
      SELECT ri.ingredient_id, r.name AS recipe_name
      FROM recipe_ingredients ri
      INNER JOIN recipes r ON r.id = ri.recipe_id
      WHERE r.owner_id = ?
      ORDER BY ri.ingredient_id ASC, r.id ASC
    `,
    )
    .all(scopeId) as Array<{ ingredient_id: number; recipe_name: string }>;

  for (const row of rows) {
    const ingredientId = Number(row.ingredient_id);
    if (!usageByIngredient[ingredientId]) {
      usageByIngredient[ingredientId] = [];
    }
    usageByIngredient[ingredientId].push(row.recipe_name);
  }

  return usageByIngredient;
}

/**
 * Crea un nuevo ingrediente. Lanza error si los campos obligatorios
 * (nombre, unidad, precio, cantidad) son inválidos.
 */
export async function createIngredient(
  input: CreateIngredientInput,
  ownerId = STATIC_OWNER_SCOPE,
): Promise<Ingredient> {
  await ensureInitialized();
  const driver = await getDriver();
  const scopeId = requireOwnerId(ownerId);

  const name = input.name.trim();
  const unit = input.unit.trim();
  const price = Number(input.price);
  const purchaseQuantity = Number(input.purchaseQuantity ?? 1);
  const brand = normalizeOptionalText(input.brand);
  const supplier = normalizeOptionalText(input.supplier);

  if (
    !name ||
    !unit ||
    !Number.isFinite(price) ||
    price < 0 ||
    !Number.isFinite(purchaseQuantity) ||
    purchaseQuantity <= 0
  ) {
    throw new Error("Invalid ingredient input");
  }

  if (driver.kind === "postgres") {
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
      INSERT INTO ingredients (owner_id, name, unit, price, purchase_quantity, brand, supplier)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, name, unit, price::text, purchase_quantity::text, brand, supplier
      `,
      [
        scopeId,
        name,
        unit,
        price,
        purchaseQuantity,
        brand ?? null,
        supplier ?? null,
      ],
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

  const result = driver.db
    .prepare(
      `
      INSERT INTO ingredients (owner_id, name, unit, price, purchase_quantity, brand, supplier)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .run(
      scopeId,
      name,
      unit,
      price,
      purchaseQuantity,
      brand ?? null,
      supplier ?? null,
    ) as { lastInsertRowid?: number | bigint };
  const id = Number(result.lastInsertRowid ?? 0);

  return {
    id,
    name,
    unit,
    price,
    purchaseQuantity,
    brand,
    supplier,
  };
}

/**
 * Actualiza parcialmente un ingrediente.
 *
 * Solo los campos presentes en `input` se modifican. Si ningún campo
 * cambia, retorna el ingrediente actual. Retorna `null` si el
 * ingrediente no existe bajo ese owner.
 */
export async function updateIngredient(
  ingredientId: number,
  input: UpdateIngredientInput,
  ownerId = STATIC_OWNER_SCOPE,
): Promise<Ingredient | null> {
  await ensureInitialized();
  const driver = await getDriver();
  const scopeId = requireOwnerId(ownerId);

  if (!Number.isFinite(ingredientId)) {
    return null;
  }

  const shouldUpdateName = input.name !== undefined;
  const shouldUpdateUnit = input.unit !== undefined;
  const shouldUpdatePrice = input.price !== undefined;
  const shouldUpdatePurchaseQuantity = input.purchaseQuantity !== undefined;
  const shouldUpdateBrand = input.brand !== undefined;
  const shouldUpdateSupplier = input.supplier !== undefined;

  const name = shouldUpdateName ? normalizeOptionalText(input.name) : undefined;
  const unit = shouldUpdateUnit ? normalizeOptionalText(input.unit) : undefined;
  const price = shouldUpdatePrice ? Number(input.price) : undefined;
  const purchaseQuantity = shouldUpdatePurchaseQuantity
    ? Number(input.purchaseQuantity)
    : undefined;
  const brand = shouldUpdateBrand
    ? normalizeOptionalText(input.brand)
    : undefined;
  const supplier = shouldUpdateSupplier
    ? normalizeOptionalText(input.supplier)
    : undefined;

  if (shouldUpdateName && !name) {
    throw new Error("Invalid ingredient name");
  }

  if (shouldUpdateUnit && !unit) {
    throw new Error("Invalid ingredient unit");
  }

  if (
    shouldUpdatePrice &&
    (!Number.isFinite(price ?? Number.NaN) || (price ?? 0) < 0)
  ) {
    throw new Error("Invalid ingredient price");
  }

  if (
    shouldUpdatePurchaseQuantity &&
    (!Number.isFinite(purchaseQuantity ?? Number.NaN) ||
      (purchaseQuantity ?? 0) <= 0)
  ) {
    throw new Error("Invalid ingredient purchase quantity");
  }

  if (
    !shouldUpdateName &&
    !shouldUpdateUnit &&
    !shouldUpdatePrice &&
    !shouldUpdatePurchaseQuantity &&
    !shouldUpdateBrand &&
    !shouldUpdateSupplier
  ) {
    return getIngredientById(driver, ingredientId, scopeId);
  }

  if (driver.kind === "postgres") {
    const updates = [];
    const values: Array<string | number | null> = [];
    let paramIndex = 1;

    if (shouldUpdateName) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name!);
    }

    if (shouldUpdateUnit) {
      updates.push(`unit = $${paramIndex++}`);
      values.push(unit!);
    }

    if (shouldUpdatePrice) {
      updates.push(`price = $${paramIndex++}`);
      values.push(price!);
    }

    if (shouldUpdatePurchaseQuantity) {
      updates.push(`purchase_quantity = $${paramIndex++}`);
      values.push(purchaseQuantity!);
    }

    if (shouldUpdateBrand) {
      updates.push(`brand = $${paramIndex++}`);
      values.push(brand ?? null);
    }

    if (shouldUpdateSupplier) {
      updates.push(`supplier = $${paramIndex++}`);
      values.push(supplier ?? null);
    }

    values.push(ingredientId, scopeId);

    const res = await driver.pool.query<{
      id: number;
      name: string;
      unit: string;
      price: string;
      purchase_quantity: string;
      brand: string | null;
      supplier: string | null;
    }>(
      `
      UPDATE ingredients
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex++} AND owner_id = $${paramIndex}
      RETURNING id, name, unit, price::text, purchase_quantity::text, brand, supplier
      `,
      values,
    );

    const row = res.rows[0];
    if (!row) return null;

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

  const updates = [];
  const values: Array<string | number | null> = [];

  if (shouldUpdateName) {
    updates.push(`name = ?`);
    values.push(name!);
  }

  if (shouldUpdateUnit) {
    updates.push(`unit = ?`);
    values.push(unit!);
  }

  if (shouldUpdatePrice) {
    updates.push(`price = ?`);
    values.push(price!);
  }

  if (shouldUpdatePurchaseQuantity) {
    updates.push(`purchase_quantity = ?`);
    values.push(purchaseQuantity!);
  }

  if (shouldUpdateBrand) {
    updates.push(`brand = ?`);
    values.push(brand ?? null);
  }

  if (shouldUpdateSupplier) {
    updates.push(`supplier = ?`);
    values.push(supplier ?? null);
  }

  values.push(ingredientId, scopeId);
  const result = driver.db
    .prepare(
      `
    UPDATE ingredients
    SET ${updates.join(", ")}
    WHERE id = ? AND owner_id = ?
    `,
    )
    .run(...values) as { changes?: number | bigint };

  if (Number(result.changes ?? 0) === 0) {
    return null;
  }

  return getIngredientById(driver, ingredientId, scopeId);
}

/**
 * Elimina un ingrediente.
 *
 * Si el ingrediente está siendo usado por alguna receta del mismo
 * owner, retorna `{ status: "blocked", recipes: [...] }` en lugar
 * de eliminarlo (protegido por foreign key RESTRICT).
 */
export async function deleteIngredient(
  ingredientId: number,
  ownerId = STATIC_OWNER_SCOPE,
): Promise<DeleteIngredientResult> {
  await ensureInitialized();
  const driver = await getDriver();
  const scopeId = requireOwnerId(ownerId);

  if (!Number.isFinite(ingredientId)) {
    return { status: "not-found" };
  }

  if (driver.kind === "postgres") {
    const existsRes = await driver.pool.query<{ id: number }>(
      `SELECT id FROM ingredients WHERE id = $1 AND owner_id = $2 LIMIT 1`,
      [ingredientId, scopeId],
    );
    if (!existsRes.rows[0]) return { status: "not-found" };

    const usageRes = await driver.pool.query<{ id: number; name: string }>(
      `
      SELECT DISTINCT r.id, r.name
      FROM recipe_ingredients ri
      INNER JOIN recipes r ON r.id = ri.recipe_id
      WHERE ri.ingredient_id = $1
        AND r.owner_id = $2
      ORDER BY r.id ASC
      `,
      [ingredientId, scopeId],
    );

    if (usageRes.rows.length > 0) {
      return {
        status: "blocked",
        recipes: usageRes.rows.map((row) => ({
          id: Number(row.id),
          name: row.name,
        })),
      };
    }

    await driver.pool.query(
      `DELETE FROM ingredients WHERE id = $1 AND owner_id = $2`,
      [ingredientId, scopeId],
    );
    return { status: "deleted" };
  }

  const exists = driver.db
    .prepare(`SELECT id FROM ingredients WHERE id = ? AND owner_id = ? LIMIT 1`)
    .get(ingredientId, scopeId) as { id: number } | undefined;
  if (!exists) return { status: "not-found" };

  const usageRows = driver.db
    .prepare(
      `
      SELECT DISTINCT r.id, r.name
      FROM recipe_ingredients ri
      INNER JOIN recipes r ON r.id = ri.recipe_id
      WHERE ri.ingredient_id = ?
        AND r.owner_id = ?
      ORDER BY r.id ASC
      `,
    )
    .all(ingredientId, scopeId) as Array<{ id: number; name: string }>;

  if (usageRows.length > 0) {
    return {
      status: "blocked",
      recipes: usageRows.map((row) => ({
        id: Number(row.id),
        name: row.name,
      })),
    };
  }

  driver.db
    .prepare(`DELETE FROM ingredients WHERE id = ? AND owner_id = ?`)
    .run(ingredientId, scopeId);
  return { status: "deleted" };
}
