import type { AuditAction, PrismaClient } from "../generated/prisma/client.js";

export async function logAuditEvent(
  params: {
    userId: string;
    action: AuditAction;
    ipAddress?: string | null;
    userAgent?: string | null;
  },
  client: PrismaClient,
): Promise<void> {
  try {
    await client.auditLog.create({
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
