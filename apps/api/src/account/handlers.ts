import type { Context, Handler } from 'hono';
import { auth, validatePassword } from '@recetario/auth/server';
import { logAuditEvent, updateUserName } from '@recetario/db';
import { clientIp } from '@recetario/config/request';
import {
  accountEmailChangeSchema,
  accountNameUpdateSchema,
  accountPasswordChangeSchema,
} from '@recetario/types';
import { ApiError } from '../errors';
import type { AuthVariables } from '../middleware/auth';

/**
 * Mutaciones de cuenta: JSON + envelope con la misma forma que el resto del API.
 *
 * El consumidor es el cliente Nuxt (`useApi`, CSRF por doble-submit). La política
 * de contraseña es la misma de sign-up/reset (`validatePassword`), no el
 * mínimo suelto de 6 que arrastraba el handler anterior.
 */

const PASSWORD_POLICY_MESSAGE =
  'La contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas, números y un carácter especial.';

type AccountContext = Context<{ Variables: AuthVariables }>;

async function readJsonBody(c: AccountContext): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    throw new ApiError('VALIDATION_ERROR', 'Request body must be valid JSON');
  }
}

async function recordAudit(
  c: AccountContext,
  userId: string,
  action: 'email_change' | 'password_change'
): Promise<void> {
  await logAuditEvent({
    userId,
    action,
    ipAddress: clientIp(c.req.raw),
    userAgent: c.req.header('user-agent') ?? null,
  });
}

export function accountUpdateNameHandler(): Handler<{ Variables: AuthVariables }> {
  return async (c) => {
    const user = c.get('user');
    const parsed = accountNameUpdateSchema.safeParse(await readJsonBody(c));
    if (!parsed.success) {
      throw new ApiError('VALIDATION_ERROR', 'Invalid account payload');
    }

    try {
      await updateUserName(user.id, {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
      });
    } catch (error) {
      console.error('[account] update-name failed:', error);
      throw new ApiError('INTERNAL', 'No se pudo actualizar el nombre.');
    }

    return c.json({
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
    });
  };
}

export function accountChangePasswordHandler(): Handler<{ Variables: AuthVariables }> {
  return async (c) => {
    const user = c.get('user');
    const parsed = accountPasswordChangeSchema.safeParse(await readJsonBody(c));
    if (!parsed.success) {
      throw new ApiError('VALIDATION_ERROR', 'Invalid account payload');
    }

    const { currentPassword, newPassword } = parsed.data;
    if (!validatePassword(newPassword).valid) {
      throw new ApiError('VALIDATION_ERROR', PASSWORD_POLICY_MESSAGE);
    }

    try {
      await auth.api.changePassword({
        headers: c.req.raw.headers,
        body: { currentPassword, newPassword, revokeOtherSessions: false },
      });
      await recordAudit(c, user.id, 'password_change');
    } catch (error) {
      const message = (error as { message?: string })?.message ?? '';
      if (/invalid password/i.test(message)) {
        throw new ApiError('VALIDATION_ERROR', 'La contraseña actual es incorrecta.');
      }
      console.error('[account] change-password failed:', error);
      throw new ApiError('VALIDATION_ERROR', 'No se pudo cambiar la contraseña.');
    }

    return c.json({ ok: true });
  };
}

export function accountChangeEmailHandler(): Handler<{ Variables: AuthVariables }> {
  return async (c) => {
    const user = c.get('user');
    const parsed = accountEmailChangeSchema.safeParse(await readJsonBody(c));
    if (!parsed.success) {
      throw new ApiError('VALIDATION_ERROR', 'Invalid account payload');
    }

    try {
      await auth.api.changeEmail({
        headers: c.req.raw.headers,
        body: { newEmail: parsed.data.newEmail },
      });
      await recordAudit(c, user.id, 'email_change');
    } catch (error) {
      console.error('[account] change-email failed:', error);
      throw new ApiError('VALIDATION_ERROR', 'No se pudo cambiar el email.');
    }

    return c.json({ ok: true });
  };
}
