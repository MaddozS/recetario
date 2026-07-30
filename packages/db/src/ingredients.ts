import { prisma } from "./prisma";
import type { Prisma } from "@prisma/client";

import type {
  Ingredient,
  CreateIngredientInput,
  UpdateIngredientInput,
  DeleteIngredientResult,
} from "@recetario/types";
import { normalizeOptionalText, toNumber } from "./helpers";

export async function listIngredients(ownerId: string): Promise<Ingredient[]> {

  const rows = await prisma.ingredient.findMany({
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

  return result;
}

export async function listIngredientUsage(ownerId: string): Promise<Record<number, string[]>> {
  const rows = await prisma.recipeIngredient.findMany({
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

  return usageByIngredient;
}

export async function createIngredient(input: CreateIngredientInput, ownerId: string): Promise<Ingredient> {
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

  const data = await prisma.ingredient.create({
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
    return getIngredientById(ingredientId);
  }

  try {
    const data = await prisma.ingredient.update({
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

async function getIngredientById(ingredientId: number): Promise<Ingredient | null> {
  if (!Number.isFinite(ingredientId)) return null;

  const data = await prisma.ingredient.findUnique({
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
  ownerId: string
): Promise<DeleteIngredientResult> {
  if (!Number.isFinite(ingredientId)) {
    return { status: "not-found" };
  }

  // Check if the ingredient is used in any recipes
  const usage = await prisma.recipeIngredient.findMany({
    where: { ingredientId, recipe: { ownerId } },
    select: {
      recipe: { select: { id: true, name: true, salePrice: true } },
    },
  });

  if (usage.length > 0) {

    // Define the recipes array to indicate which recipes uses the ingredient
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

    return { status: "blocked", recipes };
  }

  await prisma.ingredient.delete({
    where: { id: ingredientId, ownerId },
  });

  return { status: "deleted" };
}
