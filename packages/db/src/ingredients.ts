import { prisma } from "./prisma.js";
import type { PrismaClient } from "./prisma.js";
import type { Prisma } from "../generated/prisma/client.js";
import type {
  Ingredient,
  CreateIngredientInput,
  UpdateIngredientInput,
  DeleteIngredientResult,
} from "@recetario/types";
import { normalizeOptionalText, toNumber } from "./helpers.js";
import { cacheGet, cacheSet } from "./cache.js";

// ponytail: every helper takes an optional `db` so the API worker
// can pass a per-request client (see apps/api/src/fresh-db.ts and
// memory #63). Web keeps using the singleton.
// Cache management is the caller's responsibility — the read-side
// helpers (listIngredients, listIngredientUsage) check + write the
// cacheEntry table via the passed `db`, but write-side helpers do
// NOT invalidate the cache; the API handler does that explicitly
// with its per-request prisma so the cache layer never touches the
// singleton.

export async function listIngredients(
  ownerId: string,
  db: PrismaClient = prisma,
): Promise<Ingredient[]> {
  const cacheKey = `ingredients:${ownerId}`;
  const cached = await cacheGet<Ingredient[]>(cacheKey, db);
  if (cached) return cached;

  const rows = await db.ingredient.findMany({
    where: { ownerId },
    orderBy: { id: "asc" },
  });

  const result = rows.map((row) => ({
    id: row.id,
    name: row.name,
    unit: row.unit,
    price: row.price,
    purchaseQuantity: row.purchaseQuantity,
    brand: normalizeOptionalText(row.brand),
    supplier: normalizeOptionalText(row.supplier),
  }));

  await cacheSet(cacheKey, result, 60, db);
  return result;
}

export async function listIngredientUsage(
  ownerId: string,
  db: PrismaClient = prisma,
): Promise<Record<number, string[]>> {
  const cacheKey = `ingredient_usage:${ownerId}`;
  const cached = await cacheGet<Record<number, string[]>>(cacheKey, db);
  if (cached) return cached;

  const rows = await db.recipeIngredient.findMany({
    where: { recipe: { ownerId } },
    select: {
      ingredientId: true,
      recipe: { select: { name: true } },
    },
    orderBy: { ingredientId: "asc" },
  });

  const usageByIngredient: Record<number, string[]> = {};
  for (const row of rows) {
    if (!usageByIngredient[row.ingredientId]) {
      usageByIngredient[row.ingredientId] = [];
    }
    usageByIngredient[row.ingredientId].push(row.recipe.name);
  }

  await cacheSet(cacheKey, usageByIngredient, 60, db);
  return usageByIngredient;
}

export async function createIngredient(
  input: CreateIngredientInput,
  ownerId: string,
  db: PrismaClient = prisma,
): Promise<Ingredient> {
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

  const data = await db.ingredient.create({
    data: {
      ownerId,
      name,
      unit,
      price,
      purchaseQuantity,
      brand: brand ?? null,
      supplier: supplier ?? null,
    },
  });

  return {
    id: data.id,
    name: data.name,
    unit: data.unit,
    price: toNumber(data.price),
    purchaseQuantity: toNumber(data.purchaseQuantity),
    brand: normalizeOptionalText(data.brand),
    supplier: normalizeOptionalText(data.supplier),
  };
}

export async function updateIngredient(
  ingredientId: number,
  input: UpdateIngredientInput,
  ownerId: string,
  db: PrismaClient = prisma,
): Promise<Ingredient | null> {
  if (!Number.isFinite(ingredientId)) return null;

  const updates: Record<string, unknown> = {};

  if (input.name !== undefined) {
    const name = normalizeOptionalText(input.name);
    if (!name) throw new Error("Invalid ingredient name");
    updates.name = name;
  }
  if (input.unit !== undefined) {
    const unit = normalizeOptionalText(input.unit);
    if (!unit) throw new Error("Invalid ingredient unit");
    updates.unit = unit;
  }
  if (input.price !== undefined) {
    const price = Number(input.price);
    if (!Number.isFinite(price) || price < 0)
      throw new Error("Invalid ingredient price");
    updates.price = price;
  }
  if (input.purchaseQuantity !== undefined) {
    const qty = Number(input.purchaseQuantity);
    if (!Number.isFinite(qty) || qty <= 0)
      throw new Error("Invalid ingredient purchase quantity");
    updates.purchaseQuantity = qty;
  }
  if (input.brand !== undefined)
    updates.brand = normalizeOptionalText(input.brand) ?? null;
  if (input.supplier !== undefined)
    updates.supplier = normalizeOptionalText(input.supplier) ?? null;

  if (Object.keys(updates).length === 0) {
    return getIngredientById(ingredientId, db);
  }

  try {
    const data = await db.ingredient.update({
      where: { id: ingredientId, ownerId },
      data: updates as Prisma.IngredientUncheckedUpdateInput,
    });

    return {
      id: data.id,
      name: data.name,
      unit: data.unit,
      price: toNumber(data.price),
      purchaseQuantity: toNumber(data.purchaseQuantity),
      brand: normalizeOptionalText(data.brand),
      supplier: normalizeOptionalText(data.supplier),
    };
  } catch {
    return null;
  }
}

async function getIngredientById(
  ingredientId: number,
  db: PrismaClient,
): Promise<Ingredient | null> {
  if (!Number.isFinite(ingredientId)) return null;

  const data = await db.ingredient.findUnique({
    where: { id: ingredientId },
  });

  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    unit: data.unit,
    price: toNumber(data.price),
    purchaseQuantity: toNumber(data.purchaseQuantity),
    brand: normalizeOptionalText(data.brand),
    supplier: normalizeOptionalText(data.supplier),
  };
}

export async function deleteIngredient(
  ingredientId: number,
  ownerId: string,
  db: PrismaClient = prisma,
): Promise<DeleteIngredientResult> {
  if (!Number.isFinite(ingredientId)) {
    return { status: "not-found" };
  }

  const usage = await db.recipeIngredient.findMany({
    where: { ingredientId, recipe: { ownerId } },
    select: {
      recipe: { select: { id: true, name: true, salePrice: true } },
    },
  });

  const recipes: Array<{
    id: number;
    name: string;
    salePrice: number | null;
  }> = [];
  for (const row of usage) {
    if (row.recipe) {
      recipes.push({
        id: row.recipe.id,
        name: row.recipe.name,
        salePrice:
          row.recipe.salePrice === null
            ? null
            : Number(row.recipe.salePrice),
      });
    }
  }

  if (recipes.length > 0) {
    return { status: "blocked", recipes };
  }

  await db.ingredient.delete({
    where: { id: ingredientId, ownerId },
  });

  return { status: "deleted" };
}
