import type { APIRoute } from "astro";
import {
  validatePasswordResetToken,
  markTokenAsUsed,
  getRemainingSeconds,
  formatTime,
} from "@/lib/password-reset";
import { validatePassword } from "@/lib/password-validation";
import { auth } from "@/lib/auth";
import { logAuditEvent } from "@/lib/db/audit";

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const token = body?.token as string | undefined;
    const password = body?.password as string | undefined;

    if (!token || !password) {
      return new Response(
        JSON.stringify({
          error: "Token y contraseña son requeridos",
          code: "INVALID_DATA",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const validation = await validatePasswordResetToken(token);

    if (!validation.valid) {
      const errorMessages = {
        not_found: "Enlace inválido o inexistente",
        expired: "El enlace ha expirado",
        used: "Este enlace ya fue utilizado",
      };

      return new Response(
        JSON.stringify({
          error: errorMessages[validation.error || "not_found"],
          code: validation.error?.toUpperCase() || "INVALID_TOKEN",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return new Response(
        JSON.stringify({
          error: "La contraseña no cumple los requisitos",
          code: "INVALID_PASSWORD",
          errors: passwordValidation.errors,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    await auth.api.changePassword({
      headers: request.headers,
      body: {
        currentPassword: "",
        newPassword: password,
        revokeOtherSessions: false,
      },
    });

    await markTokenAsUsed(token);

    await logAuditEvent({
      userId: validation.userId!,
      action: "password_reset",
      ipAddress: clientIp(request),
      userAgent: request.headers.get("user-agent") ?? null,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Contraseña actualizada correctamente",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[AUTH] reset-password error:", error);
    return new Response(
      JSON.stringify({
        error: "Error al restablecer la contraseña",
        code: "INTERNAL_ERROR",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return new Response(
      JSON.stringify({
        error: "Token requerido",
        code: "TOKEN_REQUIRED",
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    const validation = await validatePasswordResetToken(token);

    if (!validation.valid) {
      const errorMessages = {
        not_found: "Enlace inválido o inexistente",
        expired: "El enlace ha expirado",
        used: "Este enlace ya fue utilizado",
      };

      return new Response(
        JSON.stringify({
          valid: false,
          error: errorMessages[validation.error || "not_found"],
          code: validation.error?.toUpperCase() || "INVALID_TOKEN",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const remainingSeconds = await getRemainingSeconds(validation.expiresAt!);

    return new Response(
      JSON.stringify({
        valid: true,
        expiresAt: validation.expiresAt?.toISOString(),
        remainingSeconds,
        formattedTime: formatTime(remainingSeconds),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[AUTH] validate-token error:", error);
    return new Response(
      JSON.stringify({
        error: "Error al validar el enlace",
        code: "INTERNAL_ERROR",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};