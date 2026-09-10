import type { Handler } from "hono";
import { createRecipe } from "@recetario/db";
import { auth } from "@recetario/auth/server";
import { recipeCreateSchema } from "@recetario/types";
import { ApiError } from "../errors";
import { shapeRecipeDetail } from "./shape";

export function recipesCreateHandler(): Handler {
  return async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      throw new ApiError("UNAUTHENTICATED", "Authentication required");
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      body = {};
    }

    const parsed = recipeCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Invalid recipe input");
    }

    const created = await createRecipe(
      session.user.id,
      {
        name: parsed.data.name ?? "Nueva Receta",
        category: parsed.data.category ?? null,
        desiredMargin: parsed.data.desiredMargin ?? 0,
        fixedCostsPercentage: parsed.data.fixedCostsPercentage ?? 0,
      },
      undefined,
      parsed.data.recipeFixedCosts?.map((fc) => ({
        name: fc.name,
        type: fc.type,
        base: fc.base,
        value: fc.value,
        hours: fc.hours ?? null,
      })),
    );
    if (!created) {
      throw new ApiError("INTERNAL", "Failed to create recipe");
    }
    return c.json(shapeRecipeDetail(created), 201);
  };
}
