import type { Handler } from "hono";
import { auth } from "@recetario/auth/server";
import { prisma } from "@recetario/db";
import { ApiError } from "../errors.js";

export function presentationsListHandler(): Handler {
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

    const recipe = await prisma.recipe.findFirst({
      where: { id: recipeId, ownerId: session.user.id },
      select: { id: true },
    });
    if (!recipe) {
      throw new ApiError("NOT_FOUND", "Recipe not found");
    }

    const presentations = await prisma.recipePresentation.findMany({
      where: { recipeId },
      include: { fixedCosts: true },
      orderBy: { id: "asc" },
    });

    return c.json(
      presentations.map((p) => ({
        id: p.id,
        name: p.name,
        unitsPerBatch: p.unitsPerBatch,
        salePrice: p.salePrice,
        fixedCosts: p.fixedCosts.map((fc) => ({
          id: fc.id,
          presentationId: fc.presentationId,
          name: fc.name,
          type: fc.type,
          base: fc.base,
          value: fc.value,
        })),
      })),
    );
  };
}
