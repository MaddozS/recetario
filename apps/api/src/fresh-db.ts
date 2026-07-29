import type { Context } from "hono";
import { createPrismaClient, type PrismaClient } from "@recetario/db";
import { createAuth } from "@recetario/auth/server";

// ponytail: per-request prisma + auth to dodge the pg.Pool wedge
// documented in memory #63. Same pattern as the /api/auth/* catch-all
// in apps/api/src/index.ts (and the auth-session handler), but lifted
// into a higher-order helper so every API handler can opt in with
// one wrapper. We open a fresh pool, use it, and disconnect() before
// workerd tears down the request context, so the pool never sits idle
// long enough to wedge. Throws are rethrown after the disconnect so
// errorHandler() can produce the right 4xx/5xx envelope.
export async function withFreshDb<T>(
  _c: Context,
  fn: (prisma: PrismaClient, auth: ReturnType<typeof createAuth>) => Promise<T>,
): Promise<T> {
  const prisma = createPrismaClient();
  const auth = createAuth(prisma);
  try {
    return await fn(prisma, auth);
  } finally {
    // Tests mock createPrismaClient with a bare object; the real
    // PrismaClient exposes $disconnect to drain the pg.Pool. Guard
    // so the production disconnect path stays correct while tests
    // can pass any stand-in.
    prisma.$disconnect?.().catch(() => {});
  }
}
