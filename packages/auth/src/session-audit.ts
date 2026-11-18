import { logAuditEvent } from '@recetario/db';
import { clientIp } from '@recetario/config/request';

type SessionLike = { userId: string };
type SessionContextLike = { request?: Request } | null;

/**
 * Records a successful sign-in from Better Auth's `session.create.after` hook.
 * Every new session (email/password or Google OAuth) is authenticated at this
 * boundary, with no web-side path inspection. Best-effort: `logAuditEvent`
 * already swallows persistence failures.
 */
export async function recordSignInAudit(
  session: SessionLike,
  context: SessionContextLike
): Promise<void> {
  const request = context?.request;

  await logAuditEvent({
    userId: session.userId,
    action: 'sign_in',
    ipAddress: request ? clientIp(request) : null,
    userAgent: request?.headers.get('user-agent') ?? null,
  });
}
