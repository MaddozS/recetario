import { prisma } from "../prisma";
import type {
  RecipePresentation,
  CreatePresentationInput,
  DeletePresentationResult,
} from "./types";
import {
  normalizePresentationName,
  normalizePresentationUnits,
  normalizePresentationSalePrice,
} from "./helpers";

async function touchRecipeUpdatedAt(recipeId: number): Promise<void> {
  await prisma.recipe.update({
    where: { id: recipeId },
    data: { updatedAt: new Date() },
  });
}

export async function createPresentation(
  recipeId: number,
  input: CreatePresentationInput,
  ownerId: string,
): Promise<RecipePresentation> {
  const name = normalizePresentationName(input.name);
  const unitsPerBatch = normalizePresentationUnits(input.unitsPerBatch);
  const salePrice =
    input.salePrice !== undefined
      ? normalizePresentationSalePrice(input.salePrice)
      : undefined;

  const ownerRecipe = await prisma.recipe.findFirst({
    where: { id: recipeId, ownerId },
    select: { id: true },
  });
  if (!ownerRecipe) {
    throw new Error("Recipe not found");
  }

  const data = await prisma.recipePresentation.create({
    data: {
      recipeId,
      name,
      unitsPerBatch,
      salePrice: salePrice ?? null,
    },
  });

  await touchRecipeUpdatedAt(recipeId);

  return {
    id: data.id,
    name: data.name,
    unitsPerBatch: Number(data.unitsPerBatch),
    salePrice: data.salePrice !== null ? Number(data.salePrice) : undefined,
  };
}

export async function updatePresentation(
  recipeId: number,
  id: number,
  input: {
    name?: string;
    unitsPerBatch?: number;
    salePrice?: number | null;
  },
  ownerId: string,
): Promise<RecipePresentation | null> {
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

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (unitsPerBatch !== undefined) updates.unitsPerBatch = unitsPerBatch;
  if (salePrice !== undefined) updates.salePrice = salePrice;

  if (Object.keys(updates).length === 0) {
    return getPresentationById(recipeId, id);
  }

  const ownerRecipe = await prisma.recipe.findFirst({
    where: { id: recipeId, ownerId },
    select: { id: true },
  });
  if (!ownerRecipe) return null;

  try {
    const data = await prisma.recipePresentation.update({
      where: { id, recipeId },
      data: updates as any,
    });

    await touchRecipeUpdatedAt(recipeId);

    return {
      id: data.id,
      name: data.name,
      unitsPerBatch: Number(data.unitsPerBatch),
      salePrice: data.salePrice !== null ? Number(data.salePrice) : undefined,
    };
  } catch {
    return null;
  }
}

async function getPresentationById(
  recipeId: number,
  id: number,
): Promise<RecipePresentation | null> {
  const data = await prisma.recipePresentation.findFirst({
    where: { id, recipeId },
  });

  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    unitsPerBatch: Number(data.unitsPerBatch),
    salePrice: data.salePrice !== null ? Number(data.salePrice) : undefined,
  };
}

export async function deletePresentation(
  recipeId: number,
  presentationId: number,
  ownerId: string,
): Promise<DeletePresentationResult> {
  if (!Number.isFinite(recipeId) || !Number.isFinite(presentationId)) {
    return { status: "not-found" };
  }

  const ownerRecipe = await prisma.recipe.findFirst({
    where: { id: recipeId, ownerId },
    select: { id: true },
  });
  if (!ownerRecipe) return { status: "not-found" };

  try {
    await prisma.recipePresentation.delete({
      where: { id: presentationId, recipeId },
    });
  } catch {
    return { status: "not-found" };
  }

  await touchRecipeUpdatedAt(recipeId);

  return { status: "deleted" };
}
