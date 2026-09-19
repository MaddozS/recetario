import type { Handler } from "hono";
import { getRecipe, updateRecipe } from "@recetario/db";
import { auth } from "@recetario/auth/server";
import { recipeUpdateSchema } from "@recetario/types";
import { ApiError } from "../errors";
import { shapeRecipeDetail } from "./shape";

export function recipesUpdateHandler(): Handler {
  return async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      throw new ApiError("UNAUTHENTICATED", "Authentication required");
    }

    const idParam = c.req.param("id");
    const id = Number(idParam);
    if (!Number.isFinite(id)) {
      throw new ApiError("NOT_FOUND", "Recipe not found");
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      throw new ApiError("VALIDATION_ERROR", "Invalid JSON body");
    }

    const parsed = recipeUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Invalid recipe input");
    }

    const existing = await getRecipe(id, session.user.id);
    if (!existing) {
      throw new ApiError("NOT_FOUND", "Recipe not found");
    }

    const updateInput = {
      name: parsed.data.name,
      category: parsed.data.category ?? null,
      instructions: parsed.data.instructions ?? null,
      desiredMargin: parsed.data.desiredMargin,
      fixedCostsPercentage: parsed.data.fixedCostsPercentage,
    };

    const ingredients = parsed.data.ingredients.map((ing) => ({
      ingredientId: ing.ingredientId,
      quantity: ing.quantity,
      unit: ing.unit,
      comment: ing.comment ?? null,
    }));

    const recipeFixedCosts = parsed.data.recipeFixedCosts?.map((fc) => ({
      name: fc.name ?? "Costo Fijo",
      type: fc.type,
      base: fc.base,
      value: fc.value,
      hours: fc.hours ?? null,
    }));

    await updateRecipe(
      id,
      updateInput,
      session.user.id,
      ingredients,
      recipeFixedCosts,
    );

    const updated = await getRecipe(id, session.user.id);
    if (!updated) {
      throw new ApiError("NOT_FOUND", "Recipe not found");
    }

    return c.json(shapeRecipeDetail(updated));
  };
}
