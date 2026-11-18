import { prisma } from './prisma';
import type {
  RecipeFixedCostUncheckedCreateInput,
  RecipeFixedCostUncheckedUpdateInput,
  PresentationFixedCostUncheckedCreateInput,
  PresentationFixedCostUncheckedUpdateInput,
} from '../prisma/generated/models';

export async function getRecipeFixedCost(recipeId: number, fixedCostId: number, ownerId: string) {
  const row = await prisma.recipeFixedCost.findFirst({
    where: { id: fixedCostId, recipeId, recipe: { ownerId } },
  });
  return row;
}

export async function createRecipeFixedCost(
  recipeId: number,
  ownerId: string,
  input: Omit<RecipeFixedCostUncheckedCreateInput, 'recipeId'>
) {
  const recipe = await prisma.recipe.findFirst({
    where: { id: recipeId, ownerId },
    select: { id: true },
  });
  if (!recipe) return null;

  const row = await prisma.recipeFixedCost.create({
    data: { recipeId, ...input },
  });
  await prisma.recipe.update({
    where: { id: recipeId, ownerId },
    data: { updatedAt: new Date() },
  });
  return row;
}

export async function updateRecipeFixedCost(
  recipeId: number,
  fixedCostId: number,
  ownerId: string,
  input: Omit<RecipeFixedCostUncheckedUpdateInput, 'id' | 'recipeId'>
) {
  const existing = await prisma.recipeFixedCost.findFirst({
    where: { id: fixedCostId, recipeId, recipe: { ownerId } },
  });
  if (!existing) return null;

  const row = await prisma.recipeFixedCost.update({
    where: { id: fixedCostId },
    data: input,
  });
  await prisma.recipe.update({
    where: { id: recipeId, ownerId },
    data: { updatedAt: new Date() },
  });
  return row;
}

export async function deleteRecipeFixedCost(
  recipeId: number,
  fixedCostId: number,
  ownerId: string
) {
  const existing = await prisma.recipeFixedCost.findFirst({
    where: { id: fixedCostId, recipeId, recipe: { ownerId } },
  });
  if (!existing) return { status: 'not-found' };

  await prisma.recipeFixedCost.delete({ where: { id: fixedCostId } });
  await prisma.recipe.update({
    where: { id: recipeId, ownerId },
    data: { updatedAt: new Date() },
  });
  return { status: 'deleted' };
}

export async function getPresentationFixedCost(
  presentationId: number,
  fixedCostId: number,
  ownerId: string
) {
  const row = await prisma.presentationFixedCost.findFirst({
    where: {
      id: fixedCostId,
      presentationId,
      presentation: { recipe: { ownerId } },
    },
  });
  return row;
}

export async function createPresentationFixedCost(
  presentationId: number,
  ownerId: string,
  input: Omit<PresentationFixedCostUncheckedCreateInput, 'presentationId'>
) {
  const presentation = await prisma.recipePresentation.findFirst({
    where: { id: presentationId, recipe: { ownerId } },
    select: { id: true, recipeId: true },
  });
  if (!presentation) return null;

  const row = await prisma.presentationFixedCost.create({
    data: { presentationId, ...input },
  });
  await prisma.recipe.update({
    where: { id: presentation.recipeId, ownerId },
    data: { updatedAt: new Date() },
  });
  return row;
}

export async function updatePresentationFixedCost(
  presentationId: number,
  fixedCostId: number,
  ownerId: string,
  input: Omit<PresentationFixedCostUncheckedUpdateInput, 'id' | 'presentationId'>
) {
  const existing = await prisma.presentationFixedCost.findFirst({
    where: {
      id: fixedCostId,
      presentationId,
      presentation: { recipe: { ownerId } },
    },
  });
  if (!existing) return null;

  const row = await prisma.presentationFixedCost.update({
    where: { id: fixedCostId },
    data: input,
  });
  return row;
}

export async function deletePresentationFixedCost(
  presentationId: number,
  fixedCostId: number,
  ownerId: string
) {
  const existing = await prisma.presentationFixedCost.findFirst({
    where: {
      id: fixedCostId,
      presentationId,
      presentation: { recipe: { ownerId } },
    },
  });
  if (!existing) return { status: 'not-found' };

  await prisma.presentationFixedCost.delete({ where: { id: fixedCostId } });
  return { status: 'deleted' };
}
