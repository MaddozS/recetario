import type { Handler } from "hono";
import { getIngredients } from "@recetario/db";
import { ingredientSchema } from "@recetario/types";
import { auth } from "@recetario/auth/server";
import { ApiError } from "../errors";

export function ingredientsListHandler(): Handler {
  return async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      throw new ApiError("UNAUTHENTICATED", "Authentication required");
    }

    const ingredients = await getIngredients(session.user.id);
    return c.json(
      ingredients.map((i) =>
        ingredientSchema.parse({
          id: i.id,
          name: i.name,
          unit: i.unit,
          price: Number(i.price),
          purchaseQuantity: Number(i.purchaseQuantity),
          brand: i.brand ?? undefined,
          supplier: i.supplier ?? undefined,
        }),
      ),
    );
  };
}
