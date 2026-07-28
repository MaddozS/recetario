import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { lazyInit } from "@recetario/config/lazy";

export type { PrismaClient };

// ponytail: lazy init — avoids crashing at import time when DATABASE_URL
// isn't in process.env yet (Vite SSR doesn't load .env into process.env).
// pg.Pool works on Cloudflare Pages because wrangler.jsonc enables
// nodejs_compat (which provides net, tls, dns — what pg needs).
function initPrisma(): PrismaClient {
  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    (globalThis as unknown as { prisma: PrismaClient }).prisma = client;
  }
  return client;
}

export function createPrismaClient(): PrismaClient {
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
  return new PrismaClient({ adapter });
}

export const prisma = lazyInit("prisma", initPrisma);
