import type {
  RecipePresentation,
  CreatePresentationInput,
  DeletePresentationResult,
} from "./types";
import {
  requireOwnerId,
  toNumber,
  normalizePresentationName,
  normalizePresentationUnits,
  normalizePresentationSalePrice,
} from "./helpers";
import {
  getDriver,
  ensureInitialized,
  recipeBelongsToOwner,
  getPresentationById,
  STATIC_OWNER_SCOPE,
} from "./connection";

export async function createPresentation(
  recipeId: number,
  input: CreatePresentationInput,
  ownerId = STATIC_OWNER_SCOPE,
): Promise<RecipePresentation> {
  await ensureInitialized();
  const driver = await getDriver();
  const scopeId = requireOwnerId(ownerId);
  const name = normalizePresentationName(input.name);
  const unitsPerBatch = normalizePresentationUnits(input.unitsPerBatch);
  const salePrice =
    input.salePrice !== undefined
      ? normalizePresentationSalePrice(input.salePrice)
      : undefined;
  const now = new Date().toISOString();

  if (!(await recipeBelongsToOwner(driver, recipeId, scopeId))) {
    throw new Error("Recipe not found");
  }

  if (driver.kind === "postgres") {
    const client = await driver.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("LOCK TABLE recipe_presentations IN EXCLUSIVE MODE");

      const nextIdRes = await client.query<{ next_id: string }>(
        "SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM recipe_presentations",
      );
      const presentationId = Number(nextIdRes.rows[0]?.next_id ?? 1);

      await client.query(
        `
        INSERT INTO recipe_presentations (id, recipe_id, name, units_per_batch, sale_price)
        VALUES ($1, $2, $3, $4, $5)
        `,
        [presentationId, recipeId, name, unitsPerBatch, salePrice ?? null],
      );

      await client.query(
        "UPDATE recipes SET updated_at = NOW() WHERE id = $1 AND owner_id = $2",
        [recipeId, scopeId],
      );

      await client.query("COMMIT");

      return {
        id: presentationId,
        name,
        unitsPerBatch,
        salePrice,
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  driver.db.exec("BEGIN");
  try {
    const result = driver.db
      .prepare(
        `
      INSERT INTO recipe_presentations (recipe_id, name, units_per_batch, sale_price)
      VALUES (?, ?, ?, ?)
      `,
      )
      .run(recipeId, name, unitsPerBatch, salePrice ?? null) as {
      lastInsertRowid?: number | bigint;
    };

    driver.db
      .prepare(
        "UPDATE recipes SET updated_at = ? WHERE id = ? AND owner_id = ?",
      )
      .run(now, recipeId, scopeId);

    driver.db.exec("COMMIT");

    return {
      id: Number(result.lastInsertRowid ?? 0),
      name,
      unitsPerBatch,
      salePrice,
    };
  } catch (error) {
    driver.db.exec("ROLLBACK");
    throw error;
  }
}

export async function updatePresentation(
  recipeId: number,
  id: number,
  input: {
    name?: string;
    unitsPerBatch?: number;
    salePrice?: number | null;
  },
  ownerId = STATIC_OWNER_SCOPE,
): Promise<RecipePresentation | null> {
  await ensureInitialized();
  const driver = await getDriver();
  const scopeId = requireOwnerId(ownerId);
  const name =
    input.name !== undefined
      ? normalizePresentationName(input.name)
      : undefined;
  const unitsPerBatch =
    input.unitsPerBatch !== undefined
      ? normalizePresentationUnits(input.unitsPerBatch)
      : undefined;
  const salePrice =
    input.salePrice === null
      ? null
      : input.salePrice !== undefined
        ? normalizePresentationSalePrice(input.salePrice)
        : undefined;

  if (!(await recipeBelongsToOwner(driver, recipeId, scopeId))) {
    return null;
  }

  if (driver.kind === "postgres") {
    const updates = [];
    const values = [];
    let paramIndex = 1;
    let updated = false;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }

    if (unitsPerBatch !== undefined) {
      updates.push(`units_per_batch = $${paramIndex++}`);
      values.push(unitsPerBatch);
    }
    if (salePrice !== undefined) {
      updates.push(`sale_price = $${paramIndex++}`);
      values.push(salePrice);
    }

    if (updates.length === 0)
      return getPresentationById(driver, recipeId, id);

    const client = await driver.pool.connect();
    try {
      await client.query("BEGIN");

      values.push(id, recipeId);
      const updateRes = await client.query(
        `UPDATE recipe_presentations SET ${updates.join(", ")} WHERE id = $${paramIndex++} AND recipe_id = $${paramIndex}`,
        values,
      );

      updated = Number(updateRes.rowCount ?? 0) > 0;

      if (updated) {
        await client.query(
          "UPDATE recipes SET updated_at = NOW() WHERE id = $1 AND owner_id = $2",
          [recipeId, scopeId],
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return updated ? getPresentationById(driver, recipeId, id) : null;
  }

  const updates = [];
  const values = [];
  const now = new Date().toISOString();
  let updated = false;

  if (name !== undefined) {
    updates.push(`name = ?`);
    values.push(name);
  }
  if (unitsPerBatch !== undefined) {
    updates.push(`units_per_batch = ?`);
    values.push(unitsPerBatch);
  }
  if (salePrice !== undefined) {
    updates.push(`sale_price = ?`);
    values.push(salePrice);
  }

  if (updates.length === 0)
    return getPresentationById(driver, recipeId, id);

  driver.db.exec("BEGIN");
  try {
    values.push(id, recipeId);
    const updateResult = driver.db
      .prepare(
        `UPDATE recipe_presentations SET ${updates.join(", ")} WHERE id = ? AND recipe_id = ?`,
      )
      .run(...values) as { changes?: number | bigint };

    updated = Number(updateResult.changes ?? 0) > 0;

    if (updated) {
      driver.db
        .prepare(
          "UPDATE recipes SET updated_at = ? WHERE id = ? AND owner_id = ?",
        )
        .run(now, recipeId, scopeId);
    }

    driver.db.exec("COMMIT");
  } catch (error) {
    driver.db.exec("ROLLBACK");
    throw error;
  }

  return updated ? getPresentationById(driver, recipeId, id) : null;
}

export async function deletePresentation(
  recipeId: number,
  presentationId: number,
  ownerId = STATIC_OWNER_SCOPE,
): Promise<DeletePresentationResult> {
  await ensureInitialized();
  const driver = await getDriver();
  const scopeId = requireOwnerId(ownerId);
  const now = new Date().toISOString();

  if (!Number.isFinite(recipeId) || !Number.isFinite(presentationId)) {
    return { status: "not-found" };
  }

  if (!(await recipeBelongsToOwner(driver, recipeId, scopeId))) {
    return { status: "not-found" };
  }

  if (driver.kind === "postgres") {
    const client = await driver.pool.connect();
    try {
      await client.query("BEGIN");

      const deleteRes = await client.query(
        "DELETE FROM recipe_presentations WHERE id = $1 AND recipe_id = $2",
        [presentationId, recipeId],
      );

      if (Number(deleteRes.rowCount ?? 0) === 0) {
        await client.query("ROLLBACK");
        return { status: "not-found" };
      }

      await client.query(
        "UPDATE recipes SET updated_at = NOW() WHERE id = $1 AND owner_id = $2",
        [recipeId, scopeId],
      );

      await client.query("COMMIT");
      return { status: "deleted" };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  driver.db.exec("BEGIN");
  try {
    const result = driver.db
      .prepare(
        "DELETE FROM recipe_presentations WHERE id = ? AND recipe_id = ?",
      )
      .run(presentationId, recipeId) as { changes?: number | bigint };

    if (Number(result.changes ?? 0) === 0) {
      driver.db.exec("ROLLBACK");
      return { status: "not-found" };
    }

    driver.db
      .prepare(
        "UPDATE recipes SET updated_at = ? WHERE id = ? AND owner_id = ?",
      )
      .run(now, recipeId, scopeId);

    driver.db.exec("COMMIT");
    return { status: "deleted" };
  } catch (error) {
    driver.db.exec("ROLLBACK");
    throw error;
  }
}
