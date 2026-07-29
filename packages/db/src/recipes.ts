import { prisma } from "./prisma.js";
import type { PrismaClient } from "./prisma.js";
import type { Prisma } from "../generated/prisma/client.js";
import type {
  RecipeSummary,
  RecipeWithIngredients,
  CreateRecipeInput,
  DeleteRecipeResult,
  UpdateRecipeInput,
} from "@recetario/types";
import { createPresentation } from "./presentations.js";
import {
  normalizeOptionalText,
  toNumber,
  normalizeDesiredMargin,
  normalizeFixedCostsPercentage,
  normalizeRecipeComment,
  normalizeCategory,
  normalizeFixedCostType,
  normalizeFixedCostBase,
  normalizeFixedCostValue,
  normalizeFixedCostHours,
} from "./helpers.js";
import { cacheGet, cacheSet, cacheDelete } from "./cache.js";

// ponytail: every helper takes an optional `db` so the API worker
// can pass a per-request client (see apps/api/src/fresh-db.ts and
// memory #63). Web keeps using the singleton.

async function invalidateRecipeCache(
  ownerId: string,
  recipeId: number | undefined,
  db: PrismaClient,
) {
  await cacheDelete(`recipes:${ownerId}`, db);
  if (recipeId !== undefined) await cacheDelete(`recipe:${recipeId}`, db);
}

export async function listRecipeSummaries(
  ownerId: string,
  db: PrismaClient = prisma,
): Promise<RecipeSummary[]> {
  const cacheKey = `recipes:${ownerId}`;
  const cached = await cacheGet<RecipeSummary[]>(cacheKey, db);
  if (cached) return cached;

  const rows = await db.recipe.findMany({
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

  await cacheSet(cacheKey, result, 60, db);
  return result;
}

export async function getRecipeById(
  recipeId: string | number,
  ownerId: string,
  db: PrismaClient = prisma,
): Promise<RecipeWithIngredients | null> {
  const id = Number(recipeId);
  if (!Number.isFinite(id)) return null;

  const cacheKey = `recipe:${id}`;
  const cached = await cacheGet<RecipeWithIngredients | null>(cacheKey, db);
  if (cached !== undefined) return cached;

  const recipe = await db.recipe.findFirst({
    where: { id, ownerId },
    include: {
      recipeIngredients: {
        include: {
          ingredient: true,
        },
      },
      presentations: {
        include: {
          fixedCosts: true,
        },
      },
      recipeFixedCosts: true,
    },
  });

  if (!recipe) {
    await cacheSet(cacheKey, null, 60, db);
    return null;
  }

  const result: RecipeWithIngredients = normalizeRecipeRow(recipe);
  await cacheSet(cacheKey, result, 60, db);
  return result;
}

export async function getRecipesByIds(
  ids: number[],
  ownerId: string,
  db: PrismaClient = prisma,
): Promise<RecipeWithIngredients[]> {
  if (ids.length === 0) return [];

  const rows = await db.recipe.findMany({
    where: { id: { in: ids }, ownerId },
    include: {
      recipeIngredients: {
        include: {
          ingredient: true,
        },
      },
      presentations: {
        include: {
          fixedCosts: true,
        },
      },
      recipeFixedCosts: true,
    },
  });

  const results = rows.map(normalizeRecipeRow);

  for (const r of results) {
    await cacheSet(`recipe:${r.id}`, r, 60, db);
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
    presentations: {
      include: {
        fixedCosts: true;
      };
    };
    recipeFixedCosts: true;
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
      fixedCosts: row.fixedCosts.map((fc) => ({
        id: fc.id,
        presentationId: fc.presentationId,
        name: fc.name,
        type: fc.type as "PERCENTAGE" | "AMOUNT",
        base: fc.base as "PER_BATCH" | "PER_UNIT" | "PER_HOUR",
        value: toNumber(fc.value),
      })),
    })),
    recipeFixedCosts: recipe.recipeFixedCosts.map((fc) => ({
      id: fc.id,
      recipeId: fc.recipeId,
      name: fc.name,
      type: fc.type as "PERCENTAGE" | "AMOUNT",
      base: fc.base as "PER_BATCH" | "PER_UNIT" | "PER_HOUR",
      value: toNumber(fc.value),
      hours: fc.hours !== null ? toNumber(fc.hours) : undefined,
    })),
  };
}

export async function createRecipe(
  ownerId: string,
  input: CreateRecipeInput = {},
  db: PrismaClient = prisma,
): Promise<{ id: number; name: string }> {
  const name = normalizeOptionalText(input.name) ?? "Nueva Receta";
  const category = normalizeCategory(input.category);
  const desiredMargin = normalizeDesiredMargin(input.desiredMargin ?? 0);
  const fixedCostsPercentage = normalizeFixedCostsPercentage(
    input.fixedCostsPercentage ?? 0,
  );

  const data = await db.$transaction(async (tx) => {
    const recipe = await tx.recipe.create({
      data: {
        ownerId,
        name,
        desiredMargin,
        fixedCostsPercentage,
        updatedAt: new Date(),
        category,
      },
    });

    if (input.recipeFixedCosts && input.recipeFixedCosts.length > 0) {
      for (const fc of input.recipeFixedCosts) {
        await tx.recipeFixedCost.create({
          data: {
            recipeId: recipe.id,
            name: normalizeOptionalText(fc.name) ?? "Costo Fijo",
            type: normalizeFixedCostType(fc.type),
            base: normalizeFixedCostBase(fc.base),
            value: normalizeFixedCostValue(fc.value),
            hours: normalizeFixedCostHours(fc.hours),
          },
        });
      }
    }

    return recipe;
  });

  await invalidateRecipeCache(ownerId, undefined, db);
  return { id: data.id, name: data.name };
}

export async function deleteRecipe(
  recipeId: number,
  ownerId: string,
  db: PrismaClient = prisma,
): Promise<DeleteRecipeResult> {
  if (!Number.isFinite(recipeId)) {
    return { status: "not-found" };
  }

  try {
    await db.recipe.delete({
      where: { id: recipeId, ownerId },
    });
    await invalidateRecipeCache(ownerId, recipeId, db);
    return { status: "deleted" };
  } catch {
    return { status: "not-found" };
  }
}

export async function updateRecipe(
  recipeId: number,
  input: UpdateRecipeInput,
  ownerId: string,
  db: PrismaClient = prisma,
): Promise<void> {
  const desiredMargin = normalizeDesiredMargin(input.desiredMargin);
  const fixedCostsPercentage = normalizeFixedCostsPercentage(
    input.fixedCostsPercentage,
  );
  const category = normalizeCategory(input.category);
  const instructions = normalizeOptionalText(input.instructions) ?? null;

  await db.$transaction(async (tx) => {
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

    // Replace ingredients
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

    // Replace recipe fixed costs (only if explicitly provided)
    if (input.recipeFixedCosts !== undefined) {
      await tx.recipeFixedCost.deleteMany({
        where: { recipeId },
      });

      for (const fc of input.recipeFixedCosts) {
        await tx.recipeFixedCost.create({
          data: {
            recipeId,
            name: normalizeOptionalText(fc.name) ?? "Costo Fijo",
            type: normalizeFixedCostType(fc.type),
            base: normalizeFixedCostBase(fc.base),
            value: normalizeFixedCostValue(fc.value),
            hours: normalizeFixedCostHours(fc.hours),
          },
        });
      }
    }
  });
  await invalidateRecipeCache(ownerId, recipeId, db);
}

export async function duplicateRecipe(
  sourceRecipeId: number,
  ownerId: string,
  db: PrismaClient = prisma,
): Promise<{ id: number; name: string }> {
  const source = await getRecipeById(sourceRecipeId, ownerId, db);
  if (!source) {
    throw new Error("Recipe not found");
  }

  const maxNameLength = 120;
  const prefix = "Copia de ";
  let newName = prefix + source.name;
  if (newName.length > maxNameLength) {
    newName = newName.slice(0, maxNameLength - 1) + "\u2026";
  }

  const newRecipe = await createRecipe(
    ownerId,
    {
      name: newName,
      category: source.category,
      desiredMargin: source.desiredMargin,
      fixedCostsPercentage: source.fixedCostsPercentage,
      recipeFixedCosts: source.recipeFixedCosts.map((fc) => ({
        name: fc.name,
        type: fc.type,
        base: fc.base,
        value: fc.value,
        hours: fc.hours,
      })),
    },
    db,
  );

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
      db,
    );
  }

  for (const p of source.presentations) {
    await createPresentation(
      newRecipe.id,
      {
        name: p.name,
        unitsPerBatch: p.unitsPerBatch,
        salePrice: p.salePrice,
        // ponytail: pre-existing — PresentationFixedCost has no `hours`
        // (only RecipeFixedCost does). The original copy-paste from
        // the recipe-level block was type-erroring at build; dropped.
        fixedCosts: p.fixedCosts?.map((fc) => ({
          name: fc.name,
          type: fc.type,
          base: fc.base,
          value: fc.value,
        })),
      },
      ownerId,
      db,
    );
  }

  return { id: newRecipe.id, name: newName };
}
