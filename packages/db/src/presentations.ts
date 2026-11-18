import { prisma } from './prisma';
import type {
  RecipePresentationUncheckedUpdateInput,
  RecipePresentationUncheckedCreateInput,
  RecipeFixedCostUncheckedCreateInput,
} from '../prisma/generated/models';

async function touchRecipeUpdatedAt(recipeId: number, ownerId: string) {
  await prisma.recipe.update({
    where: { id: recipeId, ownerId },
    data: { updatedAt: new Date() },
  });
}

export async function getPresentation(id: number, ownerId: string) {
  const data = await prisma.recipePresentation.findFirst({
    where: { id, recipe: { ownerId } },
    include: {
      fixedCosts: true,
    },
  });

  if (!data) return null;

  return data;
}

export async function getPresentationsByRecipeId(recipeId: number, ownerId: string) {
  const data = await prisma.recipePresentation.findMany({
    where: { recipeId, recipe: { ownerId } },
    include: {
      fixedCosts: true,
    },
  });

  if (!data) return null;

  return data;
}

export async function createPresentation(
  recipeId: number,
  ownerId: string,
  input: Omit<RecipePresentationUncheckedCreateInput, 'recipeId'>,
  fixedCosts?: Omit<RecipeFixedCostUncheckedCreateInput, 'recipeId'>
) {
  const ownerRecipe = await prisma.recipe.findFirst({
    where: { id: recipeId, ownerId },
    select: { id: true },
  });
  if (!ownerRecipe) {
    throw new Error('Recipe not found');
  }

  const data = await prisma.$transaction(async (tx) => {
    const presentationCreate = await tx.recipePresentation.create({
      data: {
        recipeId,
        name: input.name,
        unitsPerBatch: input.unitsPerBatch,
        salePrice: input.salePrice ?? null,
      },
    });

    if (fixedCosts) {
      await tx.recipeFixedCost.create({
        data: {
          recipeId,
          ...fixedCosts,
        },
      });
    }

    // get the presentation with fixed costs
    const presentation = await tx.recipePresentation.findUnique({
      where: { id: presentationCreate.id },
      include: { fixedCosts: true },
    });

    return presentation;
  });

  await touchRecipeUpdatedAt(recipeId, ownerId);

  return data;
}

export async function updatePresentation(
  id: number,
  recipeId: number,
  ownerId: string,
  data: Omit<RecipePresentationUncheckedUpdateInput, 'id' | 'recipeId'>,
  fixedCosts?: Omit<RecipeFixedCostUncheckedCreateInput, 'recipeId'>
) {
  const ownerRecipe = await prisma.recipe.findFirst({
    where: { id: recipeId, ownerId },
    select: { id: true },
  });
  if (!ownerRecipe) {
    throw new Error('Recipe not found');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const presentationUpdated = await tx.recipePresentation.update({
      where: { id, recipeId },
      data,
    });

    if (fixedCosts) {
      await tx.recipeFixedCost.create({
        data: {
          recipeId,
          ...fixedCosts,
        },
      });
    }

    // get the presentation with fixed costs
    const presentation = await tx.recipePresentation.findUnique({
      where: { id: presentationUpdated.id },
      include: { fixedCosts: true },
    });

    return presentation;
  });

  await touchRecipeUpdatedAt(recipeId, ownerId);

  return updated;
}

export async function deletePresentation(
  recipeId: number,
  presentationId: number,
  ownerId: string
) {
  if (!Number.isFinite(recipeId) || !Number.isFinite(presentationId)) {
    return { status: 'not-found' };
  }

  const ownerRecipe = await prisma.recipe.findFirst({
    where: { id: recipeId, ownerId },
    select: { id: true },
  });
  if (!ownerRecipe) return { status: 'not-found' };

  try {
    await prisma.recipePresentation.delete({
      where: { id: presentationId, recipeId },
    });
  } catch {
    return { status: 'not-found' };
  }

  await touchRecipeUpdatedAt(recipeId, ownerId);

  return { status: 'deleted' };
}
