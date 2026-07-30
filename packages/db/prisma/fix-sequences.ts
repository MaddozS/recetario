import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL not set");
}

const adapter = new PrismaPg(connectionString);
const prisma = new PrismaClient({ adapter });

async function fixSequences() {
  const queries = [
    `SELECT setval('ingredients_id_seq', COALESCE((SELECT MAX(id) FROM ingredients), 1))`,
    `SELECT setval('recipes_id_seq', COALESCE((SELECT MAX(id) FROM recipes), 1))`,
    `SELECT setval('recipe_presentations_id_seq', COALESCE((SELECT MAX(id) FROM recipe_presentations), 1))`,
  ];

  for (const query of queries) {
    await prisma.$executeRawUnsafe(query);
    console.log(`OK: ${query}`);
  }

  await prisma.$disconnect();
  console.log("Sequences fixed successfully.");
}

fixSequences().catch((e) => {
  console.error("Error fixing sequences:", e);
  process.exit(1);
});
