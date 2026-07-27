import { z } from "zod";

export const ErrorCodeSchema = z.enum([
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "RATE_LIMITED",
  "VALIDATION_ERROR",
  "INTERNAL",
  "DOMAIN_ERROR",
]);

export const ApiErrorSchema = z.object({
  error: z.string(),
  code: ErrorCodeSchema,
  details: z.record(z.unknown()).optional(),
});

export const ApiSuccessSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
  });

export const ApiFailureSchema = z.object({
  success: z.literal(false),
  error: ApiErrorSchema,
});

export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.union([ApiSuccessSchema(dataSchema), ApiFailureSchema]);
