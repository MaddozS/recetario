import { prisma } from "./prisma.js";
import type { PrismaClient } from "./prisma.js";

// ponytail: every function takes an optional `db` so the API worker
// can pass a per-request client (see apps/api/src/fresh-db.ts and
// memory #63). Web still passes nothing and gets the singleton.
export async function cacheGet<T>(
  key: string,
  db: PrismaClient = prisma,
): Promise<T | undefined> {
  try {
    const entry = await db.cacheEntry.findUnique({ where: { key } });
    if (!entry || Number(entry.expiresAt) <= Date.now()) return undefined;
    return JSON.parse(entry.value) as T;
  } catch {
    return undefined;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds: number,
  db: PrismaClient = prisma,
): Promise<void> {
  try {
    await db.cacheEntry.upsert({
      where: { key },
      update: {
        value: JSON.stringify(value),
        expiresAt: BigInt(Date.now() + ttlSeconds * 1000),
      },
      create: {
        key,
        value: JSON.stringify(value),
        expiresAt: BigInt(Date.now() + ttlSeconds * 1000),
      },
    });
  } catch (err) {
    console.error(`[cacheSet] Failed to set key "${key}":`, err);
  }
}

export async function cacheDelete(
  key: string,
  db: PrismaClient = prisma,
): Promise<void> {
  try {
    await db.cacheEntry.delete({ where: { key } });
  } catch {
    // Non-critical (key may not exist)
  }
}
