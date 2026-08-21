import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getAppOrigin, safeRedirectUrl } from "./url-utils";

describe("url-utils", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.PUBLIC_APP_URL;
    delete process.env.WEB_ORIGIN;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getAppOrigin", () => {
    it("uses PUBLIC_APP_URL from c.env if present and strips trailing slash", () => {
      const c = {
        req: { header: () => undefined, url: "http://localhost:4321/api/test" },
        env: { PUBLIC_APP_URL: "https://app.recetario.io/" },
      };
      expect(getAppOrigin(c)).toBe("https://app.recetario.io");
    });

    it("uses WEB_ORIGIN from c.env if PUBLIC_APP_URL is absent", () => {
      const c = {
        req: { header: () => undefined, url: "http://localhost:4321/api/test" },
        env: { WEB_ORIGIN: "https://recetario.io/" },
      };
      expect(getAppOrigin(c)).toBe("https://recetario.io");
    });

    it("falls back to process.env.PUBLIC_APP_URL if c.env is empty", () => {
      process.env.PUBLIC_APP_URL = "https://env.recetario.app/";
      const c = {
        req: { header: () => undefined, url: "http://localhost:4321/api/test" },
      };
      expect(getAppOrigin(c)).toBe("https://env.recetario.app");
    });

    it("uses origin header if no environment variables are set", () => {
      const c = {
        req: {
          header: (name: string) =>
            name === "origin" ? "https://client.recetario.dev" : undefined,
          url: "http://localhost:4321/api/test",
        },
      };
      expect(getAppOrigin(c)).toBe("https://client.recetario.dev");
    });

    it("uses referer header if origin header is absent", () => {
      const c = {
        req: {
          header: (name: string) =>
            name === "referer"
              ? "https://referer.recetario.dev/page"
              : undefined,
          url: "http://localhost:4321/api/test",
        },
      };
      expect(getAppOrigin(c)).toBe("https://referer.recetario.dev");
    });

    it("falls back to request URL origin if no headers or env vars match", () => {
      const c = {
        req: {
          header: () => undefined,
          url: "https://api.internal.local:8080/api/checkout",
        },
      };
      expect(getAppOrigin(c)).toBe("https://api.internal.local:8080");
    });
  });

  describe("safeRedirectUrl", () => {
    const appOrigin = "https://app.recetario.io";
    const fallback = `${appOrigin}/settings?tab=billing`;

    it("returns fallback if input is undefined", () => {
      expect(safeRedirectUrl(undefined, fallback, appOrigin)).toBe(fallback);
    });

    it("returns relative path prepended with app origin", () => {
      expect(safeRedirectUrl("/pricing?success=1", fallback, appOrigin)).toBe(
        "https://app.recetario.io/pricing?success=1",
      );
    });

    it("rejects protocol-relative URL starting with // and returns fallback", () => {
      expect(safeRedirectUrl("//evil.com/path", fallback, appOrigin)).toBe(
        fallback,
      );
    });

    it("accepts full URL matching app origin", () => {
      const valid = "https://app.recetario.io/settings?tab=billing&success=1";
      expect(safeRedirectUrl(valid, fallback, appOrigin)).toBe(valid);
    });

    it("rejects cross-origin URL and returns fallback", () => {
      expect(
        safeRedirectUrl("https://phishing.com/login", fallback, appOrigin),
      ).toBe(fallback);
    });

    it("returns fallback on malformed input string", () => {
      expect(safeRedirectUrl("ht::invalid-url", fallback, appOrigin)).toBe(
        fallback,
      );
    });
  });
});
