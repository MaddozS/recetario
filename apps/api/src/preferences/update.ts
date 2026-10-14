import type { Handler } from 'hono';
import { auth } from '@recetario/auth/server';
import { getUserPreferences, upsertUserPreferences } from '@recetario/db';
import { preferencesResponseSchema, preferencesUpdateSchema } from '@recetario/types';
import { ApiError } from '../errors';

export function preferencesUpdateHandler(): Handler {
  return async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      throw new ApiError('UNAUTHENTICATED', 'Authentication required');
    }
    const userId = session.user.id;

    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request body must be valid JSON',
          },
        },
        400
      );
    }

    const parsed = preferencesUpdateSchema.safeParse(raw);
    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid preferences payload',
            issues: parsed.error.issues,
          },
        },
        400
      );
    }

    const data = await upsertUserPreferences(userId, {
      theme: parsed.data.theme,
      accentColor: parsed.data.accentColor,
    });

    const validated = preferencesResponseSchema.parse({
      userId: data.userId,
      theme: data.theme,
      accentColor: data.accentColor,
    });

    return c.json(validated);
  };
}
