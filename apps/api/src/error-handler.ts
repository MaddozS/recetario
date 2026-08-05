import type { ErrorHandler } from "hono";
import type { ApiErrorResponse } from "@recetario/types";
import { ApiError } from "./errors";

export function errorHandler(): ErrorHandler {
  return (err, c) => {
    if (err instanceof ApiError) {
      return c.json(err.toResponse(), err.statusCode as never);
    }
    console.error("[ENVELOPE]", err);
    return c.json(
      { error: { code: "INTERNAL", message: "Internal server error" } } satisfies ApiErrorResponse,
      500 as never,
    );
  };
}
