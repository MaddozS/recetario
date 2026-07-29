import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const adapter = new PrismaPg(connectionString);
const prisma = new PrismaClient({ adapter });

async function migrateFixedCosts() {
  // Find all recipes with fixedCostsPercentage > 0
  const recipes = await prisma.recipe.findMany({
    where: {
      fixedCostsPercentage: { gt: 0 },
    },
    include: {
      recipeIngredients: {
        include: {
          ingredient: {
            select: { price: true, purchaseQuantity: true },
          },
        },
      },
    },
  });

  console.log(`Found ${recipes.length} recipes with fixedCostsPercentage > 0`);

  if (recipes.length === 0) {
    console.log("No recipes to migrate. Done.");
    await prisma.$disconnect();
    return;
  }

  let migratedCount = 0;

  for (const recipe of recipes) {
    // Calculate ingredient cost: sum of (quantity * price / purchaseQuantity)
    let ingredientCost = 0;
    for (const ri of recipe.recipeIngredients) {
      const unitCost = ri.ingredient.price / ri.ingredient.purchaseQuantity;
      ingredientCost += ri.quantity * unitCost;
    }

    // Calculate fixed cost value: ingredientCost * percentage / 100
    const percentage = recipe.fixedCostsPercentage;
    const fixedCostValue = ingredientCost * (percentage / 100);

    // Round to 2 decimal places
    const roundedValue = Math.round(fixedCostValue * 100) / 100;

    console.log(
      `  Recipe "${recipe.name}" (id=${recipe.id}): ` +
        `ingredientCost=${ingredientCost.toFixed(2)}, ` +
        `percentage=${percentage}%, ` +
        `fixedCost=${roundedValue.toFixed(2)}`
    );

    // Create RecipeFixedCost in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.recipeFixedCost.create({
        data: {
          recipeId: recipe.id,
          name: "Gastos Operativos",
          type: "AMOUNT",
          base: "PER_BATCH",
          value: roundedValue,
        },
      });
    });

    migratedCount++;
  }

  console.log(`\nMigrated ${migratedCount} recipes successfully.`);
  await prisma.$disconnect();
}

migrateFixedCosts().catch((e) => {
  console.error("Migration error:", e);
  process.exit(1);
});
