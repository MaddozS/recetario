import type { Handler } from "hono";
import { auth } from "@recetario/auth/server";
import { prisma, cacheDelete } from "@recetario/db";
import { ApiError } from "../errors.js";

export function ingredientsDeleteHandler(): Handler {
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

    const usage = await prisma.recipeIngredient.findMany({
      where: { ingredientId: id, recipe: { ownerId } },
      select: { recipe: { select: { id: true, name: true, salePrice: true } } },
    });

    if (usage.length > 0) {
      const recipes = usage
        .map((u) => u.recipe)
        .filter((r): r is NonNullable<typeof r> => r !== null);
      return c.json(
        {
          error: {
            code: "DOMAIN_ERROR",
            message: "Ingredient is in use by existing recipes",
            reason: "ingredient_in_use",
          },
          recipes,
        },
        409 as never,
      );
    }

    try {
      await prisma.ingredient.delete({ where: { id, ownerId } });
    } catch (err) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code?: string }).code === "P2025"
      ) {
        throw new ApiError("NOT_FOUND", "Ingredient not found");
      }
      throw err;
    }

    await cacheDelete(`ingredients:${ownerId}`);
    await cacheDelete(`ingredient_usage:${ownerId}`);

    return c.body(null, 204 as never);
  };
}
