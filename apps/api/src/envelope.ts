import type { MiddlewareHandler } from "hono";
import type { ApiErrorResponse } from "@recetario/types";
import { statusToCode } from "./errors";

const STATUS_MESSAGES: Record<number, string> = {
  400: "Bad request",
  401: "Authentication required",
  403: "Forbidden",
  404: "Not found",
  500: "Internal server error",
};

export function envelope(): MiddlewareHandler {
  return async (c, next) => {
    await next();

    if (c.res.status >= 200 && c.res.status < 400) return;

    const contentType = c.res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) return;

    c.res = c.json(
      { error: { code: statusToCode(c.res.status), message: STATUS_MESSAGES[c.res.status] ?? "Error" } } satisfies ApiErrorResponse,
      c.res.status as never,
    );
  };
}
