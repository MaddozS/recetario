import type { MiddlewareHandler } from "hono";
import { ApiError } from "./errors";

export function hostAllowlist(): MiddlewareHandler {
  return async (c, next) => {
    const host = c.req.header("host");
    const allowedHost = (c.env as Record<string, string | undefined>).INTERNAL_API_HOST;

    if (allowedHost && host && host !== allowedHost) {
      throw new ApiError("FORBIDDEN", `Host not allowed: ${host}`);
    }

    await next();
  };
}
