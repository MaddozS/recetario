import { prisma } from "./prisma";

import type {
  IngredientUncheckedUpdateInput,
  IngredientUncheckedCreateInput,
} from "../prisma/generated/models";

export async function getIngredient(ingredientId: number) {
  const data = await prisma.ingredient.findUnique({
    where: { id: ingredientId },
  });

  if (!data) return null;

  return data
}

export async function getIngredients(ownerId: string) {

  const rows = await prisma.ingredient.findMany({
    where: { ownerId },
    orderBy: { id: "asc" },
  });

  return rows;
}

export async function createIngredient(input: IngredientUncheckedCreateInput, ownerId: string) {

  const data = await prisma.ingredient.create({
    data: {
      ownerId,
      name: input.name ?? "",
      unit: input.unit ?? "",
      price: input.price ?? 0,
      purchaseQuantity: input.purchaseQuantity ?? 1,
      brand: input.brand ?? null,
      supplier: input.supplier ?? null,
    },
  });

  return data
}

export async function updateIngredient(ingredientId: number, input: IngredientUncheckedUpdateInput, ownerId: string) {
  try {
    const data = await prisma.ingredient.update({
      where: { id: ingredientId, ownerId },
      data: {
        name: input.name ?? undefined,
        unit: input.unit ?? undefined,
        price: input.price ?? undefined,
        purchaseQuantity: input.purchaseQuantity ?? undefined,
        brand: input.brand ?? undefined,
        supplier: input.supplier ?? undefined,
      },
    });

    return data;
  } catch {
    return null;
  }
}

export async function deleteIngredient(ingredientId: number, ownerId: string) {
  if (!Number.isFinite(ingredientId)) {
    return { status: "not-found" };
  }

  // Check if the ingredient is used in any recipes
  const usage = await prisma.recipeIngredient.findMany({
    where: { ingredientId, recipe: { ownerId } },
    select: {
      recipe: { select: { id: true, name: true, } },
    },
  });

  if (usage.length > 0) {

    // Define the recipes array to indicate which recipes uses the ingredient
    const recipes: Array<{id: number; name: string}> = [];

    for (const row of usage) {
      if (row.recipe) {
        recipes.push({
          id: row.recipe.id,
          name: row.recipe.name,
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



export async function listIngredientUsage(ownerId: string) {
  const rows = await prisma.recipeIngredient.findMany({
    where: { recipe: { ownerId } },
    select: {
      ingredientId: true,
      recipe: { select: { name: true } },
    },
    orderBy: { ingredientId: "asc" },
  });

  const usageByIngredient: Record<number, string[]> = {};
  for (const row of rows as unknown as Array<{ ingredientId: number; recipe: { name: string } }>) {
    if (!usageByIngredient[row.ingredientId]) {
      usageByIngredient[row.ingredientId] = [];
    }
    usageByIngredient[row.ingredientId].push(row.recipe.name);
  }

  return usageByIngredient;
}
