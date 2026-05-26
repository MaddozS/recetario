import { prisma } from "@/lib/prisma";
import type { Prisma } from "../../../generated/prisma/client.js";
import type {
  RecipeSummary,
  RecipeWithIngredients,
  CreateRecipeInput,
  DeleteRecipeResult,
  UpdateRecipeInput,
} from "@/lib/db/types";
import { createPresentation } from "@/lib/db/presentations";
import {
  normalizeOptionalText,
  toNumber,
  normalizeDesiredMargin,
  normalizeFixedCostsPercentage,
  normalizeRecipeComment,
  normalizeCategory,
} from "@/lib/db/helpers";
import { cacheGet, cacheSet, cacheDelete } from "@/lib/cache";

function invalidateRecipeCache(ownerId: string, recipeId?: number) {
  cacheDelete(`recipes:${ownerId}`);
  if (recipeId) cacheDelete(`recipe:${recipeId}`);
}

export async function listRecipeSummaries(
  ownerId: string,
): Promise<RecipeSummary[]> {
  const cacheKey = `recipes:${ownerId}`;
  const cached = await cacheGet<RecipeSummary[]>(cacheKey);
  if (cached) return cached;

  const rows = await prisma.recipe.findMany({
    where: { ownerId },
    select: {
      id: true,
      name: true,
      category: true,
      updatedAt: true,
      _count: { select: { recipeIngredients: true } },
    },
    orderBy: { id: "asc" },
  });

  const result = rows.map((row) => ({
    id: row.id,
    name: row.name,
    category: normalizeOptionalText(row.category),
    ingredientCount: row._count.recipeIngredients,
    updatedAt: row.updatedAt?.toISOString(),
  }));

  await cacheSet(cacheKey, result, 60);
  return result;
}

export async function getRecipeById(
  recipeId: string | number,
  ownerId: string,
): Promise<RecipeWithIngredients | null> {
  const id = Number(recipeId);
  if (!Number.isFinite(id)) return null;

  const cacheKey = `recipe:${id}`;
  const cached = await cacheGet<RecipeWithIngredients | null>(cacheKey);
  if (cached !== undefined) return cached;

  const recipe = await prisma.recipe.findFirst({
    where: { id, ownerId },
    include: {
      recipeIngredients: {
        include: {
          ingredient: true,
        },
      },
      presentations: true,
    },
  });

  if (!recipe) {
    await cacheSet(cacheKey, null, 60);
    return null;
  }

  const result: RecipeWithIngredients = normalizeRecipeRow(recipe);
  await cacheSet(cacheKey, result, 60);
  return result;
}

export async function getRecipesByIds(
  ids: number[],
  ownerId: string,
): Promise<RecipeWithIngredients[]> {
  if (ids.length === 0) return [];

  const rows = await prisma.recipe.findMany({
    where: { id: { in: ids }, ownerId },
    include: {
      recipeIngredients: {
        include: {
          ingredient: true,
        },
      },
      presentations: true,
    },
  });

  const results = rows.map(normalizeRecipeRow);

  for (const r of results) {
    await cacheSet(`recipe:${r.id}`, r, 60);
  }

  return results;
}

type RecipeWithIncludes = Prisma.RecipeGetPayload<{
  include: {
    recipeIngredients: {
      include: {
        ingredient: true;
      };
    };
    presentations: true;
  };
}>;

function normalizeRecipeRow(recipe: RecipeWithIncludes): RecipeWithIngredients {
  return {
    id: recipe.id,
    name: recipe.name,
    category: normalizeOptionalText(recipe.category),
    instructions: normalizeOptionalText(recipe.instructions),
    desiredMargin: normalizeDesiredMargin(recipe.desiredMargin),
    fixedCostsPercentage: normalizeFixedCostsPercentage(
      recipe.fixedCostsPercentage,
    ),
    updatedAt: recipe.updatedAt ? recipe.updatedAt.toISOString() : undefined,
    ingredients: recipe.recipeIngredients.map((row) => ({
      ingredientId: row.ingredientId,
      quantity: toNumber(row.quantity),
      unit: row.unit,
      comment: normalizeOptionalText(row.comment),
      ingredient: {
        id: row.ingredient.id,
        name: row.ingredient.name,
        unit: row.ingredient.unit,
        price: toNumber(row.ingredient.price),
        purchaseQuantity: toNumber(row.ingredient.purchaseQuantity),
        brand: normalizeOptionalText(row.ingredient.brand),
        supplier: normalizeOptionalText(row.ingredient.supplier),
      },
    })),
    presentations: recipe.presentations.map((row) => ({
      id: row.id,
      name: row.name,
      unitsPerBatch: toNumber(row.unitsPerBatch),
      salePrice: row.salePrice !== null ? toNumber(row.salePrice) : undefined,
    })),
  };
}

export async function createRecipe(
  ownerId: string,
  input: CreateRecipeInput = {},
): Promise<{ id: number; name: string }> {
  const name = normalizeOptionalText(input.name) ?? "Nueva Receta";
  const category = normalizeCategory(input.category);
  const desiredMargin = normalizeDesiredMargin(input.desiredMargin ?? 0);
  const fixedCostsPercentage = normalizeFixedCostsPercentage(
    input.fixedCostsPercentage ?? 0,
  );

  const data = await prisma.recipe.create({
    data: {
      ownerId,
      name,
      desiredMargin,
      fixedCostsPercentage,
      updatedAt: new Date(),
      category,
    },
  });

  invalidateRecipeCache(ownerId);
  return { id: data.id, name: data.name };
}

export async function deleteRecipe(
  recipeId: number,
  ownerId: string,
): Promise<DeleteRecipeResult> {
  if (!Number.isFinite(recipeId)) {
    return { status: "not-found" };
  }

  try {
    await prisma.recipe.delete({
      where: { id: recipeId, ownerId },
    });
    invalidateRecipeCache(ownerId, recipeId);
    return { status: "deleted" };
  } catch {
    return { status: "not-found" };
  }
}

export async function updateRecipe(
  recipeId: number,
  input: UpdateRecipeInput,
  ownerId: string,
): Promise<void> {
  const desiredMargin = normalizeDesiredMargin(input.desiredMargin);
  const fixedCostsPercentage = normalizeFixedCostsPercentage(
    input.fixedCostsPercentage,
  );
  const category = normalizeCategory(input.category);
  const instructions = normalizeOptionalText(input.instructions) ?? null;

  await prisma.$transaction(async (tx) => {
    await tx.recipe.update({
      where: { id: recipeId, ownerId },
      data: {
        name: input.name,
        desiredMargin,
        fixedCostsPercentage,
        category,
        instructions,
        updatedAt: new Date(),
      },
    });

    await tx.recipeIngredient.deleteMany({
      where: { recipeId },
    });

    for (const ing of input.ingredients) {
      await tx.recipeIngredient.create({
        data: {
          recipeId,
          ingredientId: ing.ingredientId,
          quantity: ing.quantity,
          unit: ing.unit,
          comment: normalizeRecipeComment(ing.comment),
        },
      });
    }
  });
  invalidateRecipeCache(ownerId, recipeId);
}

export async function duplicateRecipe(
  sourceRecipeId: number,
  ownerId: string,
): Promise<{ id: number; name: string }> {
  const source = await getRecipeById(sourceRecipeId, ownerId);
  if (!source) {
    throw new Error("Recipe not found");
  }

  const maxNameLength = 120;
  const prefix = "Copia de ";
  let newName = prefix + source.name;
  if (newName.length > maxNameLength) {
    newName = newName.slice(0, maxNameLength - 1) + "\u2026";
  }

  const newRecipe = await createRecipe(ownerId, {
    name: newName,
    category: source.category,
    desiredMargin: source.desiredMargin,
    fixedCostsPercentage: source.fixedCostsPercentage,
  });

  if (source.ingredients.length > 0) {
    await updateRecipe(
      newRecipe.id,
      {
        name: newName,
        category: source.category ?? null,
        instructions: source.instructions,
        desiredMargin: source.desiredMargin,
        fixedCostsPercentage: source.fixedCostsPercentage,
        ingredients: source.ingredients.map((i) => ({
          ingredientId: i.ingredientId,
          quantity: i.quantity,
          unit: i.unit,
          comment: i.comment ?? null,
        })),
      },
      ownerId,
    );
  }

  for (const p of source.presentations) {
    await createPresentation(
      newRecipe.id,
      {
        name: p.name,
        unitsPerBatch: p.unitsPerBatch,
        salePrice: p.salePrice,
      },
      ownerId,
    );
  }

  return { id: newRecipe.id, name: newName };
}
