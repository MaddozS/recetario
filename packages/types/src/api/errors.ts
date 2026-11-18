import type { ZodIssue } from 'zod';

export type ApiErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'INTERNAL'
  | 'DOMAIN_ERROR'
  | 'PLAN_LIMIT'
  | 'FEATURE_REQUIRED';

export type ApiErrorResponse = {
  error: {
    code: ApiErrorCode;
    message: string;
    issues?: ZodIssue[];
    reason?: string;
    traceId?: string;
  };
};

export type ApiErrorParsed = {
  code: ApiErrorCode;
  message: string;
  issues?: ZodIssue[];
  reason?: string;
  traceId?: string;
  raw: ApiErrorResponse;
};
