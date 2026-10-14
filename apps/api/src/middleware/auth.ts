import type { MiddlewareHandler, Context } from 'hono';
import { auth } from '@recetario/auth/server';
import { ApiError } from '../errors';

export type SessionUser = {
  id: string;
  email?: string | null;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  image?: string | null;
  role?: string | null;
  [key: string]: unknown;
};

export type SessionData = {
  id: string;
  userId: string;
  [key: string]: unknown;
};

export type AuthVariables = {
  user: SessionUser;
  session: SessionData;
};

/**
 * Hono middleware that validates session authentication.
 * Populates `c.get("user")` and `c.get("session")` on success.
 * Throws ApiError("UNAUTHENTICATED", "Authentication required") [HTTP 401] if missing/invalid.
 */
export function requireAuth(): MiddlewareHandler<{ Variables: AuthVariables }> {
  return async (c, next) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      throw new ApiError('UNAUTHENTICATED', 'Authentication required');
    }

    c.set('user', session.user as SessionUser);
    c.set('session', (session.session ?? session) as SessionData);
    await next();
  };
}

/**
 * Helper to retrieve authenticated user from Hono context.
 * Uses cached context variable if `requireAuth()` ran, otherwise validates session directly.
 */
export async function getAuthUser(c: Context): Promise<SessionUser> {
  const existingUser = c.get('user') as SessionUser | undefined;
  if (existingUser) return existingUser;

  const session = await auth.api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) {
    throw new ApiError('UNAUTHENTICATED', 'Authentication required');
  }

  c.set('user', session.user as SessionUser);
  c.set('session', (session.session ?? session) as SessionData);
  return session.user as SessionUser;
}
