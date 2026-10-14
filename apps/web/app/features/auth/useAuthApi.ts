import type { ZodType } from 'zod';
import type { ResetTokenValidation } from './auth-contracts';
import {
  forgotPasswordResponseSchema,
  oauthStartSchema,
  resetPasswordResponseSchema,
  resetTokenValidationSchema,
  verifyEmailResponseSchema,
} from './auth-contracts';
import { AuthApiError, toAuthApiError } from './auth-error';

type AuthMethod = 'GET' | 'POST';

interface AuthRequest<T> {
  method?: AuthMethod;
  body?: Record<string, unknown>;
  schema?: ZodType<T>;
}

/**
 * Cliente de las rutas de auth (`/api/auth/**`) para los flujos portados.
 *
 * Mismo transporte que `useApi()` (`useRequestFetch`: cookies del request en
 * SSR y same-origin en cliente) pero con el normalizador de errores de esta
 * feature, porque el envelope de Hono no aplica a Better Auth.
 *
 * No se importa `@recetario/auth/client` a propósito: su barrel ejecuta
 * `createAuthClient` al importarse y arrastraría `better-auth` al bundle.
 */
export function useAuthApi() {
  const requestFetch = useRequestFetch();

  async function call<T>(
    path: string,
    { method = 'GET', body, schema }: AuthRequest<T> = {}
  ): Promise<T> {
    try {
      const data = await requestFetch(path, {
        method,
        ...(body === undefined ? {} : { headers: { 'content-type': 'application/json' }, body }),
      });
      return schema ? schema.parse(data) : (data as T);
    } catch (cause) {
      throw toAuthApiError(cause);
    }
  }

  async function signInWithEmail(email: string, password: string): Promise<void> {
    await call('/api/auth/sign-in/email', {
      method: 'POST',
      body: { email, password },
    });
  }

  /**
   * Inicio de OAuth: el API devuelve la URL de autorización y la navegación la
   * hacemos aquí (el `redirectPlugin` de better-auth no viaja al bundle).
   */
  async function startGoogleSignIn(callbackURL: string): Promise<void> {
    const { url } = await call('/api/auth/sign-in/social', {
      method: 'POST',
      body: { provider: 'google', callbackURL },
      schema: oauthStartSchema,
    });

    if (!url) {
      throw new AuthApiError('PROVIDER_NOT_FOUND', 'No se pudo iniciar sesión con Google.', 500);
    }

    window.location.href = url;
  }

  /** Sin `callbackURL`: paridad con el original (el enlace lleva `callbackURL=/`). */
  async function signUpWithEmail(input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }): Promise<void> {
    await call('/api/auth/sign-up/email', {
      method: 'POST',
      body: {
        email: input.email,
        password: input.password,
        name: `${input.firstName} ${input.lastName}`,
        firstName: input.firstName,
        lastName: input.lastName,
      },
    });
  }

  async function resendVerificationEmail(email: string): Promise<void> {
    await call('/api/auth/send-verification-email', {
      method: 'POST',
      body: { email, callbackURL: `${window.location.origin}/sign-in` },
    });
  }

  async function verifyEmailToken(token: string): Promise<void> {
    await call(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
      schema: verifyEmailResponseSchema,
    });
  }

  /** Devuelve el mensaje del API (idéntico exista o no el email). */
  async function requestPasswordReset(email: string): Promise<string> {
    const { message } = await call('/api/auth/forgot-password', {
      method: 'POST',
      body: { email },
      schema: forgotPasswordResponseSchema,
    });

    return message ?? 'Si el email existe, recibirás un enlace para restablecer tu contraseña.';
  }

  async function validateResetToken(token: string): Promise<ResetTokenValidation> {
    return await call(`/api/auth/reset-password?token=${encodeURIComponent(token)}`, {
      schema: resetTokenValidationSchema,
    });
  }

  async function submitPasswordReset(token: string, password: string): Promise<string> {
    const { message } = await call('/api/auth/reset-password', {
      method: 'POST',
      body: { token, password },
      schema: resetPasswordResponseSchema,
    });

    return message ?? 'Contraseña actualizada correctamente';
  }

  return {
    signInWithEmail,
    startGoogleSignIn,
    signUpWithEmail,
    resendVerificationEmail,
    verifyEmailToken,
    requestPasswordReset,
    validateResetToken,
    submitPasswordReset,
  };
}
