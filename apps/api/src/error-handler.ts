import type { ErrorHandler } from "hono";
import type { ApiErrorResponse } from "@recetario/types";
import { ApiError } from "./errors.js";

export function errorHandler(): ErrorHandler {
  return (err, c) => {
    if (err instanceof ApiError) {
      const res = c.json(err.toResponse(), err.statusCode as never);
      if (err.retryAfterMs !== undefined) {
        res.headers.set("Retry-After", String(Math.ceil(err.retryAfterMs / 1000)));
      }
      return res;
    }
    console.error("[ENVELOPE]", err);
    return c.json(
      { error: { code: "INTERNAL", message: "Internal server error" } } satisfies ApiErrorResponse,
      500 as never,
    );
  };
}
