import type { Handler } from "hono";
import { prisma } from "@recetario/db";
import { auth } from "@recetario/auth/server";
import {
  fixedCostCreateSchema,
  fixedCostUpdateSchema,
} from "@recetario/types";
import { ApiError } from "../errors.js";

export function fixedCostsCreateHandler(): Handler {
  return async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      throw new ApiError("UNAUTHENTICATED", "Authentication required");
    }

    const idParam = c.req.param("id");
    const recipeId = Number(idParam);
    if (!Number.isFinite(recipeId)) {
      throw new ApiError("NOT_FOUND", "Recipe not found");
    }

    const ownerRecipe = await prisma.recipe.findFirst({
      where: { id: recipeId, ownerId: session.user.id },
      select: { id: true },
    });
    if (!ownerRecipe) {
      throw new ApiError("NOT_FOUND", "Recipe not found");
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      throw new ApiError("VALIDATION_ERROR", "Invalid JSON body");
    }

    const parsed = fixedCostCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Invalid fixed cost input");
    }

    const created = await prisma.recipeFixedCost.create({
      data: {
        recipeId,
        name: parsed.data.name ?? "Costo Fijo",
        type: parsed.data.type,
        base: parsed.data.base,
        value: parsed.data.value,
        hours: parsed.data.hours ?? null,
      },
    });

    return c.json(
      {
        id: created.id,
        recipeId: created.recipeId,
        name: created.name,
        type: created.type,
        base: created.base,
        value: created.value,
        hours: created.hours,
      },
      201,
    );
  };
}

export function fixedCostsUpdateHandler(): Handler {
  return async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      throw new ApiError("UNAUTHENTICATED", "Authentication required");
    }

    const recipeId = Number(c.req.param("id"));
    const fid = Number(c.req.param("fid"));
    if (!Number.isFinite(recipeId) || !Number.isFinite(fid)) {
      throw new ApiError("NOT_FOUND", "Fixed cost not found");
    }

    const fc = await prisma.recipeFixedCost.findFirst({
      where: { id: fid, recipeId },
      include: { recipe: { select: { ownerId: true } } },
    });
    if (!fc || fc.recipe.ownerId !== session.user.id) {
      throw new ApiError("NOT_FOUND", "Fixed cost not found");
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      throw new ApiError("VALIDATION_ERROR", "Invalid JSON body");
    }

    const parsed = fixedCostUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Invalid fixed cost input");
    }

    const updated = await prisma.recipeFixedCost.update({
      where: { id: fid },
      data: {
        ...(parsed.data.name !== undefined && { name: parsed.data.name }),
        ...(parsed.data.type !== undefined && { type: parsed.data.type }),
        ...(parsed.data.base !== undefined && { base: parsed.data.base }),
        ...(parsed.data.value !== undefined && { value: parsed.data.value }),
        ...(parsed.data.hours !== undefined && { hours: parsed.data.hours }),
      },
    });

    return c.json({
      id: updated.id,
      recipeId: updated.recipeId,
      name: updated.name,
      type: updated.type,
      base: updated.base,
      value: updated.value,
      hours: updated.hours,
    });
  };
}

export function fixedCostsDeleteHandler(): Handler {
  return async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      throw new ApiError("UNAUTHENTICATED", "Authentication required");
    }

    const recipeId = Number(c.req.param("id"));
    const fid = Number(c.req.param("fid"));
    if (!Number.isFinite(recipeId) || !Number.isFinite(fid)) {
      throw new ApiError("NOT_FOUND", "Fixed cost not found");
    }

    const fc = await prisma.recipeFixedCost.findFirst({
      where: { id: fid, recipeId },
      include: { recipe: { select: { ownerId: true } } },
    });
    if (!fc || fc.recipe.ownerId !== session.user.id) {
      throw new ApiError("NOT_FOUND", "Fixed cost not found");
    }

    await prisma.recipeFixedCost.delete({ where: { id: fid } });
    return c.body(null, 204);
  };
}
