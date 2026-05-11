import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const isSQLite = url.startsWith("file:");
const adapter = isSQLite
  ? new PrismaBetterSqlite3({ url })
  : new PrismaPg(url);

const prisma = new PrismaClient({ adapter });

async function seed() {
  const ingredient = await prisma.ingredient.create({
    data: {
      ownerId: "seed_user",
      name: "Harina de trigo",
      unit: "kg",
      price: 1.2,
      purchaseQuantity: 1,
      brand: "Pureza",
    },
  });

  const recipe = await prisma.recipe.create({
    data: {
      ownerId: "seed_user",
      name: "Pan casero",
      desiredMargin: 30,
      fixedCostsPercentage: 10,
      recipeIngredients: {
        create: {
          ingredientId: ingredient.id,
          quantity: 0.5,
          unit: "kg",
        },
      },
      presentations: {
        create: {
          name: "Pieza de 500g",
          unitsPerBatch: 2,
          salePrice: 2.5,
        },
      },
    },
  });

  console.log("Seeded ingredient:", ingredient.name);
  console.log("Seeded recipe:", recipe.name);

  await prisma.$disconnect();
}

seed().catch((e) => {
  console.error("Seed error:", e);
  process.exit(1);
});
