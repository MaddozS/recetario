import { describe, it, expect } from "vitest";
import { ApiError, codeToStatus, statusToCode } from "./errors";

describe("ApiError", () => {
  it("creates error with code and message", () => {
    const err = new ApiError("NOT_FOUND", "Recipe not found");
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("Recipe not found");
    expect(err.statusCode).toBe(404);
    expect(err.retryAfterMs).toBeUndefined();
  });

  it("accepts optional retryAfterMs", () => {
    const err = new ApiError("RATE_LIMITED", "Too fast", 60_000);
    expect(err.retryAfterMs).toBe(60_000);
  });

  it("toResponse returns correct shape", () => {
    const err = new ApiError("FORBIDDEN", "Not allowed");
    expect(err.toResponse()).toEqual({
      error: { code: "FORBIDDEN", message: "Not allowed" },
    });
  });

  it("toResponse includes retryAfterMs when set", () => {
    const err = new ApiError("RATE_LIMITED", "Too fast", 60_000);
    expect(err.toResponse()).toEqual({
      error: { code: "RATE_LIMITED", message: "Too fast", retryAfterMs: 60_000 },
    });
  });
});

describe("codeToStatus", () => {
  it("maps codes to HTTP status", () => {
    expect(codeToStatus("VALIDATION_ERROR")).toBe(400);
    expect(codeToStatus("UNAUTHENTICATED")).toBe(401);
    expect(codeToStatus("FORBIDDEN")).toBe(403);
    expect(codeToStatus("NOT_FOUND")).toBe(404);
    expect(codeToStatus("RATE_LIMITED")).toBe(429);
  expect(codeToStatus("INTERNAL")).toBe(500);
  expect(codeToStatus("DOMAIN_ERROR")).toBe(409);
});
});

describe("statusToCode", () => {
  it("maps 400 to VALIDATION_ERROR", () => expect(statusToCode(400)).toBe("VALIDATION_ERROR"));
  it("maps 401 to UNAUTHENTICATED", () => expect(statusToCode(401)).toBe("UNAUTHENTICATED"));
  it("maps 403 to FORBIDDEN", () => expect(statusToCode(403)).toBe("FORBIDDEN"));
  it("maps 404 to NOT_FOUND", () => expect(statusToCode(404)).toBe("NOT_FOUND"));
  it("maps 429 to RATE_LIMITED", () => expect(statusToCode(429)).toBe("RATE_LIMITED"));
  it("maps 409 to DOMAIN_ERROR", () => expect(statusToCode(409)).toBe("DOMAIN_ERROR"));
  it("maps any other to INTERNAL", () => {
    expect(statusToCode(500)).toBe("INTERNAL");
    expect(statusToCode(502)).toBe("INTERNAL");
    expect(statusToCode(418)).toBe("INTERNAL");
  });
});
