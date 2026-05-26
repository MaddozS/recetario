import { prisma } from "@/lib/prisma";

export async function cacheGet<T>(key: string): Promise<T | undefined> {
  try {
    const entry = await prisma.cacheEntry.findUnique({ where: { key } });
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
): Promise<void> {
  try {
    await prisma.cacheEntry.upsert({
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
  } catch {
    // Non-critical
  }
}

export async function cacheDelete(key: string): Promise<void> {
  try {
    await prisma.cacheEntry.delete({ where: { key } });
  } catch {
    // Non-critical
  }
}
