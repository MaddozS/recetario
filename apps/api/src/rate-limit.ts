import type { MiddlewareHandler } from "hono";
import { ApiError } from "./errors.js";
import { increment, peek } from "./cache.js";

function isReadMethod(method: string): boolean {
  return method === "GET" || method === "HEAD" || method === "OPTIONS";
}

export function rateLimit(): MiddlewareHandler {
  return async (c, next) => {
    const userId = c.req.header("x-user-id");
    const ip = c.req.header("cf-connecting-ip") ?? c.req.header("x-forwarded-for") ?? "unknown";
    const method = c.req.method;
    const isRead = isReadMethod(method);

    let key: string;
    let max: number;

    if (userId) {
      const scope = isRead ? "read" : "write";
      key = `ratelimit:user:${userId}:${scope}`;
      max = isRead ? 60 : 10;
    } else {
      key = `ratelimit:ip:${ip}`;
      max = 30;
    }

    const count = increment(key, 60_000);

    if (count > max) {
      if (isRead) {
        const stale = peek<unknown>(`stale:${key}`);
        if (stale !== undefined) {
          c.res = c.json(stale.value, 200 as never);
          c.res.headers.set("X-Served-Stale", "true");
          return;
        }
      }

      throw new ApiError("RATE_LIMITED", "Too many requests", 60_000);
    }

    await next();
  };
}
