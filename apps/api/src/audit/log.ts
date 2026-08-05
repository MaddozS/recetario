import type { Handler } from "hono";
import { logAuditEvent } from "@recetario/db";
import { auth } from "@recetario/auth/server";
import { auditLogCreateSchema } from "@recetario/types";
import { ApiError } from "../errors";

export function auditLogHandler(): Handler {
  return async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      throw new ApiError("UNAUTHENTICATED", "Authentication required");
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      throw new ApiError("VALIDATION_ERROR", "Invalid JSON body");
    }
    const parsed = auditLogCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Invalid audit log payload");
    }

    try {
      await logAuditEvent({
        userId: session.user.id,
        action: parsed.data.action,
        ipAddress: parsed.data.ipAddress ?? null,
        userAgent: parsed.data.userAgent ?? null,
      });
    } catch {
      // ponytail: audit log is best-effort, never fail the request
    }
    return c.json({ ok: true });
  };
}
