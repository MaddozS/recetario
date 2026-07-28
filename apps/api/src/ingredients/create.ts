import type { Handler } from "hono";
import { createIngredient, cacheDelete } from "@recetario/db";
import { ApiError } from "../errors.js";
import { ingredientCreateSchema, ingredientSchema } from "@recetario/types";
import { withFreshDb } from "../fresh-db.js";

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
  return async (c) =>
    withFreshDb(c, async (prisma, auth) => {
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

      const data = await createIngredient(parsed.data, session.user.id, prisma);

      const ownerId = session.user.id;
      await cacheDelete(`ingredients:${ownerId}`, prisma);
      await cacheDelete(`ingredient_usage:${ownerId}`, prisma);

      return c.json(toResponse(data), 201 as never);
    });
}
