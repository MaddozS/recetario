import { z } from "zod";
import { DOMAIN_ERROR_REASONS } from "./reasons";
import type { ApiErrorParsed } from "./errors";

export const ApiErrorCodeSchema = z.enum([
  "UNAUTHENTICATED",
  "FORBIDDEN",
  "NOT_FOUND",
  "VALIDATION_ERROR",
  "INTERNAL",
  "DOMAIN_ERROR",
  "PLAN_LIMIT",
  "FEATURE_REQUIRED",
]);

export const DomainErrorReasonSchema = z.enum(DOMAIN_ERROR_REASONS);

export const ApiErrorResponseSchema = z.object({
  error: z.object({
    code: ApiErrorCodeSchema,
    message: z.string(),
    issues: z.array(z.any()).optional(),
    reason: z.string().optional(),
    traceId: z.string().optional(),
  }),
});

export async function parseApiError(res: Response): Promise<ApiErrorParsed> {
  const body = await res.json();
  const parsed = ApiErrorResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error(`Malformed error envelope: ${JSON.stringify(body)}`);
  }
  return { ...parsed.data.error, raw: parsed.data };
}
