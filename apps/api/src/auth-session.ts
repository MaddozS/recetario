import type { Handler } from "hono";
import { withFreshDb } from "./fresh-db.js";

// Pass-through to `auth.api.getSession()`. Response shape is whatever
// Better Auth returns (`{ user, session }` on hit, `null` on miss).
// No caching; infrastructure errors (DB down, etc.) bubble up to the
// global `errorHandler()` as a 500. Uses withFreshDb so the session
// lookup can't wedge the shared pg.Pool.
export function authSessionHandler(): Handler {
  return async (c) =>
    withFreshDb(c, async (_prisma, auth) => {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      return c.json(session ?? null);
    });
}
