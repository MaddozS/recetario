import type { Handler } from "hono";
import { auth } from "@recetario/auth/server";

// Pass-through to `auth.api.getSession()`. Response shape is whatever
// Better Auth returns (`{ user, session }` on hit, `null` on miss).
// No caching; infrastructure errors (DB down, etc.) bubble up to the
// global `errorHandler()` as a 500.
export function authSessionHandler(): Handler {
  return async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    return c.json(session ?? null);
  };
}
