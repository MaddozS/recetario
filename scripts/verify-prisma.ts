import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const adapter = new PrismaPg(connectionString);
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
