import { prisma } from "./prisma";
import type {
  RecipeUncheckedCreateInput,
  RecipeUncheckedUpdateInput,
  RecipeIngredientUncheckedCreateInput,
  RecipeFixedCostUncheckedCreateInput,
  RecipePresentationUncheckedCreateInput,
} from "../prisma/generated/models";


export async function getRecipeSummaries(ownerId: string) {

  const rows = await prisma.recipe.findMany({
    where: { ownerId },
    include: { recipeIngredients: true },
  });

  return rows;
}

export async function getRecipe(recipeId: string | number, ownerId: string) {
  const id = Number(recipeId);
  if (!Number.isFinite(id)) return null;

  const recipe = await prisma.recipe.findFirst({
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
    return null;
  }

  return recipe;
}

export async function getRecipesByIds(ids: number[], ownerId: string) {
  if (ids.length === 0) return [];

  const rows = await prisma.recipe.findMany({
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

  return rows;
}

export async function createRecipe(
  ownerId: string,
  recipe: Omit<RecipeUncheckedCreateInput, "ownerId">,
  recipeIngredients?: Omit<RecipeIngredientUncheckedCreateInput, "recipeId">[],
  recipeFixedCosts?: Omit<RecipeFixedCostUncheckedCreateInput, "recipeId">[],
  presentations?: Omit<RecipePresentationUncheckedCreateInput, "recipeId">[],
) {

  const data = await prisma.$transaction(async (tx) => {
    const recipeCreate = await tx.recipe.create({
      data: {
        ownerId,
        category: recipe.category ?? null,
        name: recipe.name ?? "Nueva Receta",
        desiredMargin: recipe.desiredMargin,
        fixedCostsPercentage: recipe.fixedCostsPercentage ?? 0,
        updatedAt: new Date(),
      },
    });

    if (recipeIngredients) {
      for (const ingredient of recipeIngredients) {
        await tx.recipeIngredient.create({
          data: {
            recipeId: recipeCreate.id,
            ingredientId: ingredient.ingredientId,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            comment: ingredient.comment ?? null,
          },
        });
      }
    }

    if (recipeFixedCosts) {
      for (const fixedCost of recipeFixedCosts) {
        await tx.recipeFixedCost.create({
          data: {
            recipeId: recipeCreate.id,
            name: fixedCost.name,
            type: fixedCost.type,
            base: fixedCost.base,
            value: fixedCost.value,
            hours: fixedCost.hours ?? null,
          },
        });
      }
    }

    if (presentations) {
      for (const presentation of presentations) {
        await tx.recipePresentation.create({
          data: {
            recipeId: recipeCreate.id,
            name: presentation.name,
            unitsPerBatch: presentation.unitsPerBatch,
            salePrice: presentation.salePrice ?? null,
          },
        });
      }
    }

    // get again the recipe with the all the relations

    const recipeRecord = await tx.recipe.findUnique({
      where: { id: recipeCreate.id },
      include: {
        recipeIngredients: {
          include: {
            ingredient: true,
          },
        },
        recipeFixedCosts: true,
        presentations: {
          include: {
            fixedCosts: true,
          },
        },
      },
    });

    return recipeRecord;
  });

  return data;
}

export async function deleteRecipe(recipeId: number, ownerId: string) {
  if (!Number.isFinite(recipeId)) {
    return { status: "not-found" };
  }

  try {
    await prisma.recipe.delete({
      where: { id: recipeId, ownerId },
    });
    return { status: "deleted" };
  } catch {
    return { status: "not-found" };
  }
}

export async function updateRecipe(
  recipeId: number,
  input: RecipeUncheckedUpdateInput,
  ownerId: string,
  recipeIngredients: Omit<RecipeIngredientUncheckedCreateInput, "recipeId">[],
  recipeFixedCosts?: Omit<RecipeFixedCostUncheckedCreateInput, "recipeId">[],
  presentations?: Omit<RecipePresentationUncheckedCreateInput, "recipeId">[],
) {

  await prisma.$transaction(async (tx) => {
    await tx.recipe.update({
      where: { id: recipeId, ownerId },
      data: {
        name: input.name,
        desiredMargin: input.desiredMargin,
        fixedCostsPercentage: input.fixedCostsPercentage,
        category: input.category,
        instructions: input.instructions,
        updatedAt: new Date(),
      },
    });

    // Replace ingredients
    await tx.recipeIngredient.deleteMany({where: { recipeId }});

    for (const ing of recipeIngredients) {
      await tx.recipeIngredient.create({
        data: {
          recipeId,
          ingredientId: ing.ingredientId,
          quantity: ing.quantity,
          unit: ing.unit,
          comment: ing.comment,
        },
      });
    }

    // Replace recipe fixed costs (only if explicitly provided)
    if (recipeFixedCosts !== undefined) {
      await tx.recipeFixedCost.deleteMany({
        where: { recipeId },
      });

      for (const fc of recipeFixedCosts) {
        await tx.recipeFixedCost.create({
          data: {
            recipeId,
            name: fc.name?? "Costo Fijo",
            type: fc.type,
            base: fc.base,
            value: fc.value,
            hours: fc.hours,
          },
        });
      }
    }

    // Replace recipe presentations (only if explicitly provided)
    if (presentations !== undefined) {
      await tx.recipePresentation.deleteMany({
        where: { recipeId },
      });

      for (const p of presentations) {
        await tx.recipePresentation.create({
          data: {
            recipeId,
            name: p.name,
            unitsPerBatch: p.unitsPerBatch,
            salePrice: p.salePrice,
          },
        });
      }
    }
  });
}

export async function duplicateRecipe(sourceRecipeId: number, ownerId: string) {
  const source = await getRecipe(sourceRecipeId, ownerId);
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
    },
    source.recipeIngredients?.map((i) => ({
      ingredientId: i.ingredientId,
      quantity: i.quantity,
      unit: i.unit,
      comment: i.comment,
    })),
    source.recipeFixedCosts?.map((fc) => ({
      name: fc.name,
      type: fc.type,
      base: fc.base,
      value: fc.value,
      hours: fc.hours,
    })),
    source.presentations?.map((p) => ({
      name: p.name,
      unitsPerBatch: p.unitsPerBatch,
      salePrice: p.salePrice,
    })),
  );


  return newRecipe
}
