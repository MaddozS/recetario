import { describe, it, expect, beforeEach } from "vitest";
import { get, set } from "./cache";

describe("cache", () => {
  beforeEach(() => {
    // best-effort reset; the module keeps state across tests.
  });

  it("get returns undefined for missing key", () => {
    expect(get("missing-key-1")).toBeUndefined();
  });

  it("get returns the value after set within TTL", () => {
    set("ttl-1", "hello", 60_000);
    expect(get("ttl-1")).toBe("hello");
  });

  it("get returns undefined after TTL expires", async () => {
    set("ttl-2", "world", 5);
    await new Promise((r) => setTimeout(r, 20));
    expect(get("ttl-2")).toBeUndefined();
  });
});
