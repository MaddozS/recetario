import "dotenv/config";

const url = process.env.DATABASE_URL ?? "";
const isSQLite = url.startsWith("file:");

let PrismaClient: any;
let adapter: any;

if (isSQLite) {
  const [{ PrismaClient: Pc }, { PrismaBetterSqlite3 }] = await Promise.all([
    import("../generated/prisma-sqlite/client.js"),
    import("@prisma/adapter-better-sqlite3"),
  ]);
  PrismaClient = Pc;
  adapter = new PrismaBetterSqlite3({ url });
} else {
  const [{ PrismaClient: Pc }, { PrismaPg }] = await Promise.all([
    import("../generated/prisma/client.js"),
    import("@prisma/adapter-pg"),
  ]);
  PrismaClient = Pc;
  adapter = new PrismaPg(url);
}

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
