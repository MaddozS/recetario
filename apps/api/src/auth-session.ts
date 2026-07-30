import type { Handler } from "hono";
import { auth } from "@recetario/auth/server";

export function authSessionHandler(): Handler {
  return async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    return c.json(session ?? null);
  };
}
