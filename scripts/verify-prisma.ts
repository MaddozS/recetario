import "dotenv/config";

const url = process.env.DATABASE_URL ?? "";
const isSQLite = url.startsWith("file:");

let PrismaClient: typeof import("../generated/prisma/client.js").PrismaClient;
let adapter: import("@prisma/adapter-pg").PrismaPg | import("@prisma/adapter-better-sqlite3").PrismaBetterSqlite3;

if (isSQLite) {
  const [{ PrismaClient: Pc }, { PrismaBetterSqlite3 }] = await Promise.all([
    import("../generated/prisma-sqlite/client.js"),
    import("@prisma/adapter-better-sqlite3"),
  ]);
  PrismaClient = Pc as typeof import("../generated/prisma/client.js").PrismaClient;
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

async function verify() {
  await prisma.ingredient.count();
  console.log("Connected");
  await prisma.$disconnect();
}

verify().catch((e: Error) => {
  console.error("Connection failed:", e.message);
  process.exit(1);
});
