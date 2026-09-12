import type { Handler } from "hono";
import { createIngredient } from "@recetario/db";
import { auth } from "@recetario/auth/server";
import { ApiError } from "../errors";
import { requireIngredientCapacity } from "../entitlements";
import { ingredientCreateSchema, ingredientSchema } from "@recetario/types";

function toResponse(row: {
  id: number;
  name: string;
  unit: string;
  price: number | string;
  purchaseQuantity: number | string;
  brand?: string | null;
  supplier?: string | null;
}) {
  return ingredientSchema.parse({
    id: row.id,
    name: row.name,
    unit: row.unit,
    price: Number(row.price),
    purchaseQuantity: Number(row.purchaseQuantity),
    brand: row.brand,
    supplier: row.supplier,
  });
}

export function ingredientsCreateHandler(): Handler {
  return async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) throw new ApiError("UNAUTHENTICATED", "Authentication required");

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      throw new ApiError("VALIDATION_ERROR", "Invalid JSON body");
    }

    const parsed = ingredientCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Invalid ingredient input");
    }

    await requireIngredientCapacity(session.user.id);

    const data = await createIngredient(parsed.data, session.user.id);

    return c.json(toResponse(data), 201 as never);
  };
}
