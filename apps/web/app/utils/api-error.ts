import type { ZodIssue } from "zod";
import type { ApiErrorCode } from "@recetario/types";

export type ApiErrorExtras = {
  issues?: ZodIssue[];
  reason?: string;
  traceId?: string;
};

/**
 * Error de API en el cliente: conserva el código del envelope de Hono
 * (`@recetario/types`) para que la UI decida si corresponde un CTA de upgrade
 * (`PLAN_LIMIT` / `FEATURE_REQUIRED`) o un error genérico.
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly issues?: ZodIssue[];
  readonly reason?: string;
  readonly traceId?: string;

  constructor(
    code: ApiErrorCode,
    message: string,
    extras: ApiErrorExtras = {},
    status = 500,
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.issues = extras.issues;
    this.reason = extras.reason;
    this.traceId = extras.traceId;
  }
}
