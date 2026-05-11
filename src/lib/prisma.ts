import "dotenv/config";
import { PrismaClient } from "../../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const isSQLite = url.startsWith("file:");

const adapter = isSQLite
  ? new PrismaBetterSqlite3({ url })
  : new PrismaPg(
      new pg.Pool({
        connectionString: url,
        max: 3,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      }),
    );

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
