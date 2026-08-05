import type { Handler } from "hono";
import { getRecipesByIds } from "@recetario/db";
import { auth } from "@recetario/auth/server";
import { recipeWithIngredientsSchema } from "@recetario/types";
import { ApiError } from "../errors";

const MAX_IDS = 100;

function parseIds(raw: string | undefined): number[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
}

export function recipesByIdsHandler(): Handler {
  return async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      throw new ApiError("UNAUTHENTICATED", "Authentication required");
    }

    const ids = parseIds(c.req.query("ids"));
    if (ids.length === 0) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "ids query parameter must contain at least one positive integer",
      );
    }
    if (ids.length > MAX_IDS) {
      throw new ApiError(
        "VALIDATION_ERROR",
        `ids query parameter cannot contain more than ${MAX_IDS} ids`,
      );
    }

    const recipes = await getRecipesByIds(ids, session.user.id);
    const shaped = recipes.map((r) => recipeWithIngredientsSchema.parse(shapeRecipeDetail(r)));
    return c.json(shaped);
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
  return {
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
  };
}
