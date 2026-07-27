import type { ZodIssue } from "zod";

export type ApiErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "VALIDATION_ERROR"
  | "INTERNAL"
  | "DOMAIN_ERROR";

export type ApiErrorResponse = {
  error: {
    code: ApiErrorCode;
    message: string;
    issues?: ZodIssue[];
    reason?: string;
    traceId?: string;
    retryAfterMs?: number;
  };
};

export type ApiErrorParsed = {
  code: ApiErrorCode;
  message: string;
  issues?: ZodIssue[];
  reason?: string;
  traceId?: string;
  retryAfterMs?: number;
  raw: ApiErrorResponse;
};
