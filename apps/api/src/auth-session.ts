import type { Handler } from "hono";
import { auth } from "@recetario/auth/server";

// Thin pass-through to `auth.api.getSession()`. No caching, no auth required
// — invalid/expired cookies resolve to `null`, never to a 401.
export function authSessionHandler(): Handler {
  return async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    return c.json(session ?? null);
  };
}
