import { PrismaClient } from "../prisma/generated/client";
import { withAccelerate } from "@prisma/extension-accelerate";

let prismaInstance: ReturnType<typeof createPrismaClientInternal> | null = null;

function createPrismaClientInternal() {
  const accelerateUrl = process.env.DATABASE_URL;
  if (!accelerateUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  return new PrismaClient({
    accelerateUrl,
    log: [{ emit: "event", level: "query" }],
  }).$extends(withAccelerate());
}

export function createPrismaClient() {
  return createPrismaClientInternal();
}

export function getPrisma() {
  if (!prismaInstance) {
    prismaInstance = createPrismaClientInternal();
  }
  return prismaInstance;
}

export const prisma = new Proxy({} as ReturnType<typeof createPrismaClientInternal>, {
  get(_target, prop) {
    const instance = getPrisma();
    const value = Reflect.get(instance, prop);
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});

/**
 * Build an Accelerate cache tag for a user. Accelerate only allows
 * alphanumeric characters and underscores in tag values — user ids are
 * UUIDs with hyphens, so they must be normalized.
 */
export function userCacheTag(userId: string): string {
  return `user_${userId.replace(/[^a-zA-Z0-9_]/g, "_")}`;
}

/**
 * Invalidate Accelerate's edge cache for the given tags. Best-effort: a
 * failure to reach the Accelerate API is swallowed so writes never fail
 * because of cache bookkeeping.
 */
export async function invalidateAccelerateCache(tags: string[]): Promise<void> {
  try {
    await getPrisma().$accelerate.invalidate({ tags });
  } catch {
    // best-effort invalidation; stale entries expire via ttl/swr
  }
}

