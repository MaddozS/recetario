import { describe, expect, it } from "vitest";
import {
  AUTH_NETWORK_ERROR_MESSAGE,
  AuthApiError,
  toAuthApiError,
} from "../../app/features/auth/auth-error";

function fetchError(status: number, data: unknown) {
  return { status, data, response: { status } };
}

describe("toAuthApiError", () => {
  it("preserva el código de Better Auth", () => {
    const error = toAuthApiError(
      fetchError(403, {
        message: "Email not verified",
        code: "EMAIL_NOT_VERIFIED",
      }),
    );

    expect(error).toBeInstanceOf(AuthApiError);
    expect(error.code).toBe("EMAIL_NOT_VERIFIED");
    expect(error.message).toBe("Email not verified");
    expect(error.status).toBe(403);
  });

  it("lee las rutas custom del API (`{ error, code, errors }`)", () => {
    const expired = toAuthApiError(
      fetchError(400, { error: "El enlace ha expirado", code: "EXPIRED" }),
    );
    expect(expired.code).toBe("EXPIRED");
    expect(expired.message).toBe("El enlace ha expirado");

    const password = toAuthApiError(
      fetchError(400, {
        error: "La contraseña no cumple los requisitos",
        code: "INVALID_PASSWORD",
        errors: ["Un número", 7],
      }),
    );
    expect(password.code).toBe("INVALID_PASSWORD");
    expect(password.errors).toEqual(["Un número"]);
  });

  it("entiende el envelope de Hono", () => {
    const error = toAuthApiError(
      fetchError(500, {
        error: { code: "INTERNAL", message: "Internal server error" },
      }),
    );

    expect(error.code).toBe("INTERNAL");
    expect(error.message).toBe("Internal server error");
    expect(error.status).toBe(500);
  });

  it("sin respuesta HTTP devuelve un error de red reintentable", () => {
    for (const cause of [new Error("fetch failed"), undefined]) {
      const error = toAuthApiError(cause);
      expect(error.code).toBe("NETWORK_ERROR");
      expect(error.status).toBe(0);
      expect(error.message).toBe(AUTH_NETWORK_ERROR_MESSAGE);
    }
  });

  it("con un cuerpo inesperado mantiene el status y un mensaje genérico", () => {
    const error = toAuthApiError(fetchError(502, "bad gateway"));

    expect(error.code).toBe("INTERNAL");
    expect(error.status).toBe(502);
    expect(error.message).toBe("Ocurrió un error. Intenta de nuevo.");
  });
});
