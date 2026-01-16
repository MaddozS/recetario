import { defineCollection } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { z } from 'astro/zod';

const ingredient = z.object({
  id: z.number(),
  name: z.string(),
  unit: z.string(),
  price: z.number(),
  purchaseQuantity: z.number(),
  brand: z.string().optional(),
  supplier: z.string().optional(),
});

const ingredients = defineCollection({
  loader: file("data/ingredients.json"),
  schema: ingredient,
});

const recipe = z.object({
    id: z.number(),
    name: z.string(),
    desiredMargin: z.number().min(0).max(100),
    fixedCostsPercentage: z.number().min(0).max(100),
    ingredients: z.array(
      z.object({
        ingredientId: z.number(),
        quantity: z.number(),
        unit: z.string(),
      })
    ),
    presentations: z.array(
      z.object({
        id: z.number(),
        name: z.string(),
        unitsPerBatch: z.number(),
      })
    ),
  });

const recipes = defineCollection({
  loader: file("data/recipes.json"),
  schema: recipe,
});

type Recipe = z.infer<typeof recipe>;
type Ingredient = z.infer<typeof ingredient>;

// 6. Export your collection(s)
export const collections = { ingredients, recipes };
export type { Recipe, Ingredient };
  