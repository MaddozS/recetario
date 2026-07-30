import type { Handler } from "hono";
import { createRecipe } from "@recetario/db";
import { auth } from "@recetario/auth/server";
import { recipeCreateSchema } from "@recetario/types";
import { ApiError } from "../errors.js";

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

    const created = await createRecipe(session.user.id, parsed.data);
    return c.json(created, 201);
  };
}
