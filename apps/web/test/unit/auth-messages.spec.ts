import { describe, expect, it } from "vitest";
import {
  resolveAuthErrorMessage,
  resolveAuthReasonMessage,
} from "../../app/features/auth/auth-messages";

describe("resolveAuthErrorMessage", () => {
  it("traduce los códigos que devuelve Better Auth", () => {
    expect(resolveAuthErrorMessage("account_not_linked")).toBe(
      "No se pudo iniciar sesión con Google. La cuenta no está vinculada.",
    );
    expect(resolveAuthErrorMessage("state_mismatch")).toBe(
      "Error de seguridad. Intenta de nuevo.",
    );
    expect(resolveAuthErrorMessage("unable_to_create_session")).toBe(
      "Error al crear sesión. Intenta de nuevo.",
    );
    expect(resolveAuthErrorMessage("email_not_found")).toBe(
      "Error de autenticación. Intenta de nuevo.",
    );
  });

  it("sin código no hay alerta y con código desconocido hay genérico", () => {
    expect(resolveAuthErrorMessage(null)).toBeNull();
    expect(resolveAuthErrorMessage("")).toBeNull();
    expect(resolveAuthErrorMessage(undefined)).toBeNull();
    expect(resolveAuthErrorMessage("code_de_otra_version")).toBe(
      "Error de autenticación. Intenta de nuevo.",
    );
  });
});

describe("resolveAuthReasonMessage", () => {
  it("explica por qué el shell pide iniciar sesión", () => {
    expect(resolveAuthReasonMessage("auth_required")).toBe(
      "Inicia sesión para continuar.",
    );
    expect(resolveAuthReasonMessage("session_expired")).toBe(
      "Tu sesión expiró. Vuelve a iniciar sesión.",
    );
  });

  it("ignora motivos desconocidos o ausentes", () => {
    expect(resolveAuthReasonMessage(null)).toBeNull();
    expect(resolveAuthReasonMessage("otro")).toBeNull();
  });
});
