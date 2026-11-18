import type { AuditAction } from '../prisma/generated/enums';
import { prisma } from './prisma';

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
