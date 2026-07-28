import type { Handler } from "hono";
import { auth } from "@recetario/auth/server";
import { listIngredients } from "@recetario/db";
import { ApiError } from "../errors.js";

export function ingredientsListHandler(): Handler {
  return async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      throw new ApiError("UNAUTHENTICATED", "Authentication required");
    }

    const ingredients = await listIngredients(session.user.id);
    return c.json(
      ingredients.map((i) => ({ id: i.id, name: i.name, unit: i.unit })),
    );
  };
}
