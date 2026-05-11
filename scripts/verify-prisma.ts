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

async function verify() {
  await prisma.ingredient.count();
  console.log("Connected");
  await prisma.$disconnect();
}

verify().catch((e) => {
  console.error("Connection failed:", e.message);
  process.exit(1);
});
