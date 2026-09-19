import { describe, expect, it } from "vitest";
import {
  CHECKOUT_ERROR_MESSAGE,
  PLAN_PRICE_MISSING_MESSAGE,
  PORTAL_ERROR_MESSAGE,
  resolveCheckoutError,
  resolvePortalError,
} from "../../app/features/billing/billing-messages";

describe("copy de facturación", () => {
  it("conserva los textos del baseline", () => {
    expect(PORTAL_ERROR_MESSAGE).toBe("No se pudo abrir el portal.");
    expect(CHECKOUT_ERROR_MESSAGE).toBe(
      "No se pudo iniciar el cambio de plan.",
    );
    expect(PLAN_PRICE_MISSING_MESSAGE).toBe(
      "Precio no configurado para este plan.",
    );
  });
});

describe("resolvePortalError", () => {
  it("el 404 del API no se muestra al usuario", () => {
    expect(
      resolvePortalError({
        status: 404,
        code: "NOT_FOUND",
        message: "No subscription found",
      }),
    ).toBe(PORTAL_ERROR_MESSAGE);
  });

  it("usa el mensaje del envelope en otros 4xx", () => {
    expect(
      resolvePortalError({
        status: 403,
        code: "FORBIDDEN",
        message: "No tienes permiso.",
      }),
    ).toBe("No tienes permiso.");
  });

  it("no filtra un 5xx y distingue la red", () => {
    expect(
      resolvePortalError({
        status: 500,
        code: "INTERNAL",
        message: "Internal server error",
      }),
    ).toBe(PORTAL_ERROR_MESSAGE);
    expect(resolvePortalError(new Error("fetch failed"))).toBe(
      "Error de conexión al abrir el portal.",
    );
    expect(resolvePortalError(undefined)).toBe(PORTAL_ERROR_MESSAGE);
  });
});

describe("resolveCheckoutError", () => {
  it("usa el mensaje del envelope en 4xx", () => {
    expect(
      resolveCheckoutError({
        status: 400,
        code: "VALIDATION_ERROR",
        message: "priceId required",
      }),
    ).toBe("priceId required");
  });

  it("cae al copy de conexión o genérico", () => {
    expect(resolveCheckoutError(new Error("fetch failed"))).toBe(
      "Error de conexión al iniciar el cambio de plan.",
    );
    expect(resolveCheckoutError({ status: 500 })).toBe(CHECKOUT_ERROR_MESSAGE);
    expect(resolveCheckoutError("boom")).toBe(CHECKOUT_ERROR_MESSAGE);
  });
});
