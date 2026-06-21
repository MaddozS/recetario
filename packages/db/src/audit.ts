import { prisma } from "./prisma.js";
import type { AuditAction } from "../generated/prisma/client.js";

export async function logAuditEvent(params: {
  userId: string;
  action: AuditAction;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
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
  return prisma.auditLog.findMany({
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
