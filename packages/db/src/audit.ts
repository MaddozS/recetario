import type { AuditAction, PrismaClient } from "../generated/prisma/client.js";

let _defaultPrisma: PrismaClient | undefined;

async function getDefaultPrisma(): Promise<PrismaClient> {
  if (!_defaultPrisma) {
    const { prisma } = await import("./prisma.js");
    _defaultPrisma = prisma as unknown as PrismaClient;
  }
  return _defaultPrisma;
}

export async function logAuditEvent(
  params: {
    userId: string;
    action: AuditAction;
    ipAddress?: string | null;
    userAgent?: string | null;
  },
  client?: PrismaClient,
): Promise<void> {
  const db = client ?? (await getDefaultPrisma());
  try {
    await db.auditLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
      },
    });
  } catch {
    // Non-critical, don't throw
  }
}

export async function getUserAuditLog(
  userId: string,
  limit = 50,
): Promise<
  {
    id: string;
    action: string;
    ipAddress: string | null;
    createdAt: Date;
  }[]
> {
  const { prisma: db } = await import("./prisma.js");
  return (db as unknown as PrismaClient).auditLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      action: true,
      ipAddress: true,
      createdAt: true,
    },
  });
}
