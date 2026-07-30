import type { Handler } from "hono";
import { prisma } from "@recetario/db";
import { auth } from "@recetario/auth/server";
import { ApiError } from "../errors.js";
import { ingredientUsageResponseSchema } from "@recetario/types";

export function ingredientsUsageHandler(): Handler {
  return async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      throw new ApiError("UNAUTHENTICATED", "Authentication required");
    }

    const id = Number(c.req.param("id"));
    if (!Number.isFinite(id)) {
      throw new ApiError("NOT_FOUND", "Ingredient not found");
    }

    const ownerId = session.user.id;

    const ingredient = await prisma.ingredient.findFirst({
      where: { id, ownerId },
      select: { id: true },
    });
    if (!ingredient) {
      throw new ApiError("NOT_FOUND", "Ingredient not found");
    }

    const usage = await prisma.recipeIngredient.findMany({
      where: { ingredientId: id, recipe: { ownerId } },
      select: { recipe: { select: { id: true, name: true, salePrice: true } } },
      orderBy: { recipe: { id: "asc" } },
    });

    const recipes = usage
      .map((u) => u.recipe)
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .map((r) => ({
        id: r.id,
        name: r.name,
        salePrice: r.salePrice === null ? null : Number(r.salePrice),
      }));

    return c.json(ingredientUsageResponseSchema.parse({ recipes }));
  };
}
