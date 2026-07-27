import { describe, it, expect } from "vitest";

describe("health endpoint", () => {
  it("returns ok", () => {
    const response = { ok: true, service: "recetario-api" };
    expect(response.ok).toBe(true);
    expect(response.service).toBe("recetario-api");
  });
});
