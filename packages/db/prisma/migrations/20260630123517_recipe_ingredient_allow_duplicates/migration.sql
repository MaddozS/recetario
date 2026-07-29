-- Drop the composite primary key constraint on (recipe_id, ingredient_id)
ALTER TABLE "recipe_ingredients" DROP CONSTRAINT "recipe_ingredients_pkey";

-- Add an auto-increment id column as the new primary key
ALTER TABLE "recipe_ingredients" ADD COLUMN "id" SERIAL PRIMARY KEY;

-- Create an index for efficient lookups by recipe+ingredient
CREATE INDEX "recipe_ingredients_recipe_id_ingredient_id_idx" ON "recipe_ingredients"("recipe_id", "ingredient_id");
