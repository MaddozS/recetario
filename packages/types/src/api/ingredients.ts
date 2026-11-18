import { z } from 'zod';

export const ingredientSummarySchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  unit: z.string(),
});

export type IngredientSummary = z.infer<typeof ingredientSummarySchema>;

const finiteNumber = (min: number) => z.number().finite().gte(min);

export const ingredientSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  unit: z.string().min(1),
  price: finiteNumber(0),
  purchaseQuantity: finiteNumber(0).refine((v) => v > 0, 'must be > 0'),
  brand: z.string().min(1).nullable().optional(),
  supplier: z.string().min(1).nullable().optional(),
});

export const ingredientCreateSchema = z.object({
  name: z.string().min(1),
  unit: z.string().min(1),
  price: finiteNumber(0),
  purchaseQuantity: finiteNumber(0).refine((v) => v > 0, 'must be > 0'),
  brand: z.string().min(1).optional(),
  supplier: z.string().min(1).optional(),
});

export const ingredientUpdateSchema = z
  .object({
    name: z.string().min(1).optional(),
    unit: z.string().min(1).optional(),
    price: finiteNumber(0).optional(),
    purchaseQuantity: finiteNumber(0)
      .refine((v) => v > 0, 'must be > 0')
      .optional(),
    brand: z.string().min(1).nullable().optional(),
    supplier: z.string().min(1).nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, 'no fields to update');

export const ingredientUsageRecipeSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  salePrice: z.number().finite().nullable().optional(),
});

export const ingredientUsageResponseSchema = z.object({
  recipes: z.array(ingredientUsageRecipeSchema),
});

export type IngredientUsageRecipe = z.infer<typeof ingredientUsageRecipeSchema>;
export type IngredientUsageResponse = z.infer<typeof ingredientUsageResponseSchema>;
