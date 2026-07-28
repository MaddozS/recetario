import { describe, it, expect, beforeEach } from "vitest";
import { get, set, increment, peek } from "./cache.js";

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

  it("increment returns 1 for fresh key, n+1 on repeat", () => {
    const k = `inc-${Date.now()}`;
    expect(increment(k, 60_000)).toBe(1);
    expect(increment(k, 60_000)).toBe(2);
    expect(increment(k, 60_000)).toBe(3);
  });

  it("set respects lastGoodAt via peek", () => {
    const k = `peek-${Date.now()}`;
    const before = Date.now();
    set(k, { foo: 1 }, 60_000);
    const p = peek<{ foo: number }>(k);
    expect(p).toBeDefined();
    expect(p?.value.foo).toBe(1);
    expect(p?.lastGoodAt).toBeGreaterThanOrEqual(before);
  });
});
