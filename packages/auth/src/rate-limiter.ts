import { prisma, type PrismaClient } from "@recetario/db";

export async function rateLimitCheck(
  key: string,
  maxAttempts: number,
  windowSeconds: number,
  client: PrismaClient = prisma,
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    const existing = await client.rateLimitEntry.findUnique({
      where: { key },
    });

    if (!existing || Number(existing.resetAt) <= now) {
      await client.rateLimitEntry.upsert({
        where: { key },
        update: {
          count: 1,
          resetAt: BigInt(now + windowMs),
        },
        create: {
          key,
          count: 1,
          resetAt: BigInt(now + windowMs),
        },
      });
      return { allowed: true, remaining: maxAttempts - 1 };
    }

    if (existing.count >= maxAttempts) {
      return { allowed: false, remaining: 0 };
    }

    await client.rateLimitEntry.update({
      where: { key },
      data: { count: existing.count + 1 },
    });

    return { allowed: true, remaining: maxAttempts - existing.count - 1 };
  } catch {
    // Fail open on DB errors
    return { allowed: true, remaining: maxAttempts - 1 };
  }
}
