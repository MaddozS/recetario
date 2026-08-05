import { z } from "zod";
import { preferencesResponseSchema } from "./preferences";
import { subscriptionResponseSchema } from "./billing";

export const credentialStatusResponseSchema = z.object({
  hasPasswordAuth: z.boolean(),
});

export const sessionUserSchema = z.object({
  id: z.string(),
  email: z.string().nullable().optional(),
  name: z.string().nullable().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  image: z.string().nullable().optional(),
  role: z.string().optional(),
});

export const sessionResponseSchema = z
  .object({
    user: sessionUserSchema,
    session: z.object({ id: z.string() }).passthrough(),
    preferences: preferencesResponseSchema.optional(),
    subscription: subscriptionResponseSchema,
    hasPasswordAuth: z.boolean().optional(),
  })
  .nullable();

export type SessionUser = z.infer<typeof sessionUserSchema>;
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
