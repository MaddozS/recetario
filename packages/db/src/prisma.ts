import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { lazyInit } from "@recetario/config/lazy";

// ponytail: lazy init — avoids crashing at import time when DATABASE_URL
// isn't in process.env yet (Vite SSR doesn't load .env into process.env).
// The error still surfaces on first actual prisma usage, which is fine
// because by then the runtime env should be set (Vercel) or dotenv has
// been loaded by another entry point.
function initPrisma(): PrismaClient {
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
  const client = new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== "production") {
    (globalThis as unknown as { prisma: PrismaClient }).prisma = client;
  }

  return client;
}

export const prisma = lazyInit("prisma", initPrisma);
