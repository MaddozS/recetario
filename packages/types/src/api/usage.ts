import { z } from 'zod';

export const usageCountsResponseSchema = z.object({
  recipes: z.number().int().nonnegative(),
  ingredients: z.number().int().nonnegative(),
});
