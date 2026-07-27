import { prisma } from "./prisma.js";
import type { Prisma } from "../generated/prisma/client.js";
import type {
  RecipePresentation,
  CreatePresentationInput,
  DeletePresentationResult,
  PresentationFixedCost,
} from "@recetario/types";
import {
  normalizePresentationName,
  normalizePresentationUnits,
  normalizePresentationSalePrice,
  normalizeFixedCostType,
  normalizeFixedCostBase,
  normalizeFixedCostValue,
  normalizeOptionalText,
  toNumber,
} from "./helpers.js";
import { cacheDelete } from "./cache.js";

async function invalidateParentRecipeCache(ownerId: string, recipeId: number) {
  await cacheDelete(`recipes:${ownerId}`);
  await cacheDelete(`recipe:${recipeId}`);
}

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

  const data = await prisma.$transaction(async (tx) => {
    const presentation = await tx.recipePresentation.create({
      data: {
        recipeId,
        name,
        unitsPerBatch,
        salePrice: salePrice ?? null,
      },
    });

    if (input.fixedCosts && input.fixedCosts.length > 0) {
      for (const fc of input.fixedCosts) {
        await tx.presentationFixedCost.create({
          data: {
            presentationId: presentation.id,
            name: normalizeOptionalText(fc.name) ?? "Costo Fijo",
            type: normalizeFixedCostType(fc.type),
            base: normalizeFixedCostBase(fc.base),
            value: normalizeFixedCostValue(fc.value),
          },
        });
      }
    }

    return presentation;
  });

  await touchRecipeUpdatedAt(recipeId);
  await invalidateParentRecipeCache(ownerId, recipeId);

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
    fixedCosts?: Array<{
      name: string;
      type: "PERCENTAGE" | "AMOUNT";
      base: "PER_BATCH" | "PER_UNIT" | "PER_HOUR";
      value: number;
      hours?: number | null;
    }>;
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

  const hasFieldUpdates = name !== undefined || unitsPerBatch !== undefined || salePrice !== undefined;
  const hasFixedCostUpdates = input.fixedCosts !== undefined;

  if (!hasFieldUpdates && !hasFixedCostUpdates) {
    return getPresentationById(recipeId, id);
  }

  const ownerRecipe = await prisma.recipe.findFirst({
    where: { id: recipeId, ownerId },
    select: { id: true },
  });
  if (!ownerRecipe) return null;

  try {
    await prisma.$transaction(async (tx) => {
      if (hasFieldUpdates) {
        const updateData: Record<string, unknown> = {};
        if (name !== undefined) updateData.name = name;
        if (unitsPerBatch !== undefined) updateData.unitsPerBatch = unitsPerBatch;
        if (salePrice !== undefined) updateData.salePrice = salePrice;

        await tx.recipePresentation.update({
          where: { id, recipeId },
          data: updateData as Prisma.RecipePresentationUncheckedUpdateInput,
        });
      }

      if (hasFixedCostUpdates) {
        await tx.presentationFixedCost.deleteMany({
          where: { presentationId: id },
        });

        if (input.fixedCosts && input.fixedCosts.length > 0) {
          for (const fc of input.fixedCosts) {
            await tx.presentationFixedCost.create({
              data: {
                presentationId: id,
                name: normalizeOptionalText(fc.name) ?? "Costo Fijo",
                type: normalizeFixedCostType(fc.type),
                base: normalizeFixedCostBase(fc.base),
                value: normalizeFixedCostValue(fc.value),
              },
            });
          }
        }
      }
    });

    await touchRecipeUpdatedAt(recipeId);
    await invalidateParentRecipeCache(ownerId, recipeId);

    const fixedCosts = await getPresentationFixedCosts(id);

    const updated = await prisma.recipePresentation.findFirst({
      where: { id, recipeId },
    });

    if (!updated) return null;

    return {
      id: updated.id,
      name: updated.name,
      unitsPerBatch: Number(updated.unitsPerBatch),
      salePrice: updated.salePrice !== null ? Number(updated.salePrice) : undefined,
      fixedCosts,
    };
  } catch {
    return null;
  }
}

async function getPresentationFixedCosts(
  presentationId: number,
): Promise<PresentationFixedCost[]> {
  const rows = await prisma.presentationFixedCost.findMany({
    where: { presentationId },
  });

  return rows.map((fc) => ({
    id: fc.id,
    presentationId: fc.presentationId,
    name: fc.name,
    type: fc.type as "PERCENTAGE" | "AMOUNT",
    base: fc.base as "PER_BATCH" | "PER_UNIT" | "PER_HOUR",
    value: toNumber(fc.value),
  }));
}

export async function getPresentationById(
  recipeId: number,
  id: number,
): Promise<RecipePresentation | null> {
  const data = await prisma.recipePresentation.findFirst({
    where: { id, recipeId },
    include: {
      fixedCosts: true,
    },
  });

  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    unitsPerBatch: Number(data.unitsPerBatch),
    salePrice: data.salePrice !== null ? Number(data.salePrice) : undefined,
    fixedCosts: data.fixedCosts.map((fc) => ({
      id: fc.id,
      presentationId: fc.presentationId,
      name: fc.name,
      type: fc.type as "PERCENTAGE" | "AMOUNT",
      base: fc.base as "PER_BATCH" | "PER_UNIT" | "PER_HOUR",
      value: toNumber(fc.value),
    })),
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
  await invalidateParentRecipeCache(ownerId, recipeId);

  return { status: "deleted" };
}
