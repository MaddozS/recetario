import { z } from "zod";

export const fixedCostTypeSchema = z.enum(["PERCENTAGE", "AMOUNT"]);
export const fixedCostBaseSchema = z.enum(["PER_BATCH", "PER_UNIT", "PER_HOUR"]);

export const fixedCostInputSchema = z.object({
  name: z.string().min(1).max(120),
  type: fixedCostTypeSchema,
  base: fixedCostBaseSchema,
  value: z.coerce.number().positive(),
  hours: z.coerce.number().positive().nullable().optional(),
});

export const recipeIngredientInputSchema = z.object({
  ingredientId: z.coerce.number().int().positive(),
  quantity: z.coerce.number().positive(),
  unit: z.string().min(1).max(40),
  comment: z.string().optional(),
});

export const recipeSummarySchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  category: z.string().optional(),
  ingredientCount: z.number().int().nonnegative(),
  updatedAt: z.string().optional(),
});

export const recipeFixedCostSchema = z.object({
  id: z.number().int().positive(),
  recipeId: z.number().int().positive(),
  name: z.string(),
  type: fixedCostTypeSchema,
  base: fixedCostBaseSchema,
  value: z.number(),
  hours: z.number().optional(),
});

export const presentationFixedCostSchema = z.object({
  id: z.number().int().positive(),
  presentationId: z.number().int().positive(),
  name: z.string(),
  type: fixedCostTypeSchema,
  base: fixedCostBaseSchema,
  value: z.number(),
});

export const presentationSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  unitsPerBatch: z.number().positive(),
  salePrice: z.number().nonnegative().optional(),
  fixedCosts: z.array(presentationFixedCostSchema).optional(),
});

export const recipeIngredientDetailSchema = recipeIngredientInputSchema.extend({
  ingredient: z.object({
    id: z.number().int().positive(),
    name: z.string(),
    unit: z.string(),
    price: z.number().nonnegative(),
    purchaseQuantity: z.number().positive(),
    brand: z.string().optional(),
    supplier: z.string().optional(),
  }),
});

export const recipeWithIngredientsSchema = z.object({
  id: z.number().int().positive(),
  name: z.string(),
  category: z.string().optional(),
  instructions: z.string().optional(),
  desiredMargin: z.number(),
  fixedCostsPercentage: z.number().nonnegative(),
  updatedAt: z.string().optional(),
  ingredients: z.array(recipeIngredientDetailSchema),
  presentations: z.array(presentationSchema),
  recipeFixedCosts: z.array(recipeFixedCostSchema),
});

export const recipeCreateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  category: z.string().nullable().optional(),
  desiredMargin: z.coerce.number().min(0).max(99.99).optional(),
  fixedCostsPercentage: z.coerce.number().min(0).optional(),
  recipeFixedCosts: z.array(fixedCostInputSchema).optional(),
});

export const recipeUpdateSchema = z.object({
  name: z.string().min(1).max(120),
  category: z.string().nullable().optional(),
  instructions: z.string().optional(),
  desiredMargin: z.coerce.number().min(0).max(99.99),
  fixedCostsPercentage: z.coerce.number().min(0),
  ingredients: z.array(recipeIngredientInputSchema).default([]),
  recipeFixedCosts: z.array(fixedCostInputSchema).optional(),
});

export const fixedCostCreateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  type: fixedCostTypeSchema,
  base: fixedCostBaseSchema,
  value: z.coerce.number().positive(),
  hours: z.coerce.number().positive().nullable().optional(),
});

export const fixedCostUpdateSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    type: fixedCostTypeSchema.optional(),
    base: fixedCostBaseSchema.optional(),
    value: z.coerce.number().positive().optional(),
    hours: z.coerce.number().positive().nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: "At least one field must be provided",
  });
