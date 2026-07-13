import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

// ponytail: lazy init — avoids crashing at import time when DATABASE_URL
// isn't in process.env yet (Vite SSR doesn't load .env into process.env).
// The error still surfaces on first actual prisma usage, which is fine
// because by then the runtime env should be set (Vercel) or dotenv has
// been loaded by another entry point.
let _prisma: PrismaClient | undefined;

function initPrisma(): PrismaClient {
  if (_prisma) return _prisma;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const pool = new pg.Pool({
    connectionString,
    max: 3,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  const adapter = new PrismaPg(pool);
  _prisma = new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== "production") {
    const g = globalThis as unknown as { prisma: PrismaClient | undefined };
    g.prisma = _prisma;
  }

  return _prisma;
}

// Proxy defers init until first property access.
// prisma.$connect, prisma.recipe.findMany, etc. all route through getPrisma().
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, key) {
    const client = initPrisma();
    const value = (client as unknown as Record<string | symbol, unknown>)[key];
    return typeof value === "function" ? (value as Function).bind(client) : value;
  },
});
