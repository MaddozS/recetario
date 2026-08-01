import type { Handler } from "hono";
import { createRecipe } from "@recetario/db";
import { auth } from "@recetario/auth/server";
import { recipeCreateSchema, recipeWithIngredientsSchema } from "@recetario/types";
import { ApiError } from "../errors";

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
    return c.json(recipeWithIngredientsSchema.parse(shapeRecipeDetail(created)), 201);
  };
}

function shapeRecipeDetail(recipe: {
  id: number;
  name: string;
  category: string | null;
  instructions: string | null;
  desiredMargin: number;
  fixedCostsPercentage: number;
  updatedAt: Date | null;
  recipeIngredients: Array<{
    ingredientId: number;
    quantity: number;
    unit: string;
    comment: string | null;
    ingredient: {
      id: number;
      name: string;
      unit: string;
      price: number;
      purchaseQuantity: number;
      brand: string | null;
      supplier: string | null;
    };
  }>;
  presentations: Array<{
    id: number;
    name: string;
    unitsPerBatch: number;
    salePrice: number | null;
    fixedCosts: Array<{
      id: number;
      presentationId: number;
      name: string;
      type: string;
      base: string;
      value: number;
    }>;
  }>;
  recipeFixedCosts: Array<{
    id: number;
    recipeId: number;
    name: string;
    type: string;
    base: string;
    value: number;
    hours: number | null;
  }>;
}) {
  return recipeWithIngredientsSchema.parse({
    id: recipe.id,
    name: recipe.name,
    category: recipe.category ?? undefined,
    instructions: recipe.instructions ?? undefined,
    desiredMargin: recipe.desiredMargin,
    fixedCostsPercentage: recipe.fixedCostsPercentage,
    updatedAt: recipe.updatedAt?.toISOString(),
    ingredients: recipe.recipeIngredients.map((i) => ({
      ingredientId: i.ingredientId,
      quantity: i.quantity,
      unit: i.unit,
      comment: i.comment ?? undefined,
      ingredient: {
        id: i.ingredient.id,
        name: i.ingredient.name,
        unit: i.ingredient.unit,
        price: Number(i.ingredient.price),
        purchaseQuantity: Number(i.ingredient.purchaseQuantity),
        brand: i.ingredient.brand ?? undefined,
        supplier: i.ingredient.supplier ?? undefined,
      },
    })),
    presentations: recipe.presentations.map((p) => ({
      id: p.id,
      name: p.name,
      unitsPerBatch: Number(p.unitsPerBatch),
      salePrice: p.salePrice === null ? undefined : Number(p.salePrice),
      fixedCosts: p.fixedCosts.map((fc) => ({
        id: fc.id,
        presentationId: fc.presentationId,
        name: fc.name,
        type: fc.type,
        base: fc.base,
        value: Number(fc.value),
      })),
    })),
    recipeFixedCosts: recipe.recipeFixedCosts.map((fc) => ({
      id: fc.id,
      recipeId: fc.recipeId,
      name: fc.name,
      type: fc.type,
      base: fc.base,
      value: Number(fc.value),
      hours: fc.hours ?? undefined,
    })),
  });
}
