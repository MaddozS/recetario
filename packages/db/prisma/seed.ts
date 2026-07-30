import { PrismaClient } from "../generated/client/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const adapter = new PrismaPg(connectionString);
const prisma = new PrismaClient({ adapter });

const ownerId = process.env.RECIPES_STATIC_OWNER_ID || "static_seed_user";

interface IngredientInput {
  id: number;
  name: string;
  unit: string;
  price: number;
  purchaseQuantity: number;
  brand: string;
  supplier: string;
}

interface RecipeInput {
  id: number;
  name: string;
  category?: string;
  instructions?: string;
  desiredMargin: number;
  fixedCostsPercentage: number;
  ingredients: {
    ingredientId: number;
    quantity: number;
    unit: string;
    comment?: string;
  }[];
  presentations: { id: number; name: string; unitsPerBatch: number }[];
}

async function seed() {
  const ingredients: IngredientInput[] = JSON.parse(
    readFileSync(resolve(__dirname, "../data/ingredients.json"), "utf-8"),
  );
  const recipes: RecipeInput[] = JSON.parse(
    readFileSync(resolve(__dirname, "../data/recipes.json"), "utf-8"),
  );

  let ingredientCount = 0;
  for (const ing of ingredients) {
    await prisma.ingredient.upsert({
      where: { id: ing.id },
      update: {
        ownerId,
        name: ing.name,
        unit: ing.unit,
        price: ing.price,
        purchaseQuantity: ing.purchaseQuantity,
        brand: ing.brand || null,
        supplier: ing.supplier || null,
      },
      create: {
        id: ing.id,
        ownerId,
        name: ing.name,
        unit: ing.unit,
        price: ing.price,
        purchaseQuantity: ing.purchaseQuantity,
        brand: ing.brand || null,
        supplier: ing.supplier || null,
      },
    });
    ingredientCount++;
  }
  console.log(`Seeded ${ingredientCount} ingredients`);

  // Reset sequence after explicit-ID inserts
  const maxIngredientId = await prisma.ingredient.aggregate({
    _max: { id: true },
  });
  if (maxIngredientId._max.id) {
    await prisma.$executeRawUnsafe(
      `SELECT setval('ingredients_id_seq', $1, true)`,
      maxIngredientId._max.id,
    );
  }

  let recipeCount = 0;
  for (const rec of recipes) {
    await prisma.recipe.upsert({
      where: { id: rec.id },
      update: {
        ownerId,
        name: rec.name,
        category: rec.category ?? null,
        instructions: rec.instructions ?? null,
        desiredMargin: rec.desiredMargin,
        fixedCostsPercentage: rec.fixedCostsPercentage,
        updatedAt: new Date(),
      },
      create: {
        id: rec.id,
        ownerId,
        name: rec.name,
        category: rec.category ?? null,
        instructions: rec.instructions ?? null,
        desiredMargin: rec.desiredMargin,
        fixedCostsPercentage: rec.fixedCostsPercentage,
        updatedAt: new Date(),
      },
    });

    await prisma.recipeIngredient.deleteMany({ where: { recipeId: rec.id } });
    const mergedIngredients = new Map<
      number,
      {
        ingredientId: number;
        quantity: number;
        unit: string;
        comment: string | null;
      }
    >();
    for (const ri of rec.ingredients) {
      const existing = mergedIngredients.get(ri.ingredientId);
      if (existing) {
        existing.quantity += ri.quantity;
        if (ri.comment && !existing.comment) existing.comment = ri.comment;
        else if (ri.comment && existing.comment)
          existing.comment += "; " + ri.comment;
      } else {
        mergedIngredients.set(ri.ingredientId, {
          ingredientId: ri.ingredientId,
          quantity: ri.quantity,
          unit: ri.unit,
          comment: ri.comment ?? null,
        });
      }
    }

    for (const mi of mergedIngredients.values()) {
      await prisma.recipeIngredient.create({
        data: {
          recipeId: rec.id,
          ingredientId: mi.ingredientId,
          quantity: mi.quantity,
          unit: mi.unit,
          comment: mi.comment,
        },
      });
    }

    for (const p of rec.presentations) {
      await prisma.recipePresentation.upsert({
        where: { id: p.id },
        update: {
          recipeId: rec.id,
          name: p.name,
          unitsPerBatch: p.unitsPerBatch,
        },
        create: {
          id: p.id,
          recipeId: rec.id,
          name: p.name,
          unitsPerBatch: p.unitsPerBatch,
        },
      });
    }

    recipeCount++;
    console.log(`  ${rec.name}`);
  }
  console.log(`Seeded ${recipeCount} recipes`);

  // Reset sequences after explicit-ID recipe inserts
  const maxRecipeId = await prisma.recipe.aggregate({
    _max: { id: true },
  });
  if (maxRecipeId._max.id) {
    await prisma.$executeRawUnsafe(
      `SELECT setval('recipes_id_seq', $1, true)`,
      maxRecipeId._max.id,
    );
  }

  const maxPresId = await prisma.recipePresentation.aggregate({
    _max: { id: true },
  });
  if (maxPresId._max.id) {
    await prisma.$executeRawUnsafe(
      `SELECT setval('recipe_presentations_id_seq', $1, true)`,
      maxPresId._max.id,
    );
  }

  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error("Seed error:", e);
  process.exit(1);
});
