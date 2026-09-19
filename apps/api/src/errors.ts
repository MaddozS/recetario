import type { ApiErrorCode, ApiErrorResponse } from "@recetario/types";

export class ApiError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }

  get statusCode(): number {
    return codeToStatus(this.code);
  }

  toResponse(): ApiErrorResponse {
    return {
      error: {
        code: this.code,
        message: this.message,
      },
    };
  }
}

export function codeToStatus(code: ApiErrorCode): number {
  if (code === "VALIDATION_ERROR") return 400;
  if (code === "UNAUTHENTICATED") return 401;
  if (code === "FORBIDDEN") return 403;
  if (code === "PLAN_LIMIT") return 403;
  if (code === "FEATURE_REQUIRED") return 403;
  if (code === "NOT_FOUND") return 404;
  if (code === "DOMAIN_ERROR") return 409;
  return 500;
}

export function statusToCode(status: number): ApiErrorCode {
  if (status === 400) return "VALIDATION_ERROR";
  if (status === 401) return "UNAUTHENTICATED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "DOMAIN_ERROR";
  return "INTERNAL";
}
