import { PrismaClient } from "../../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import { lazyInit } from "@recetario/config/lazy";

function initPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const pool = new pg.Pool({
    connectionString,
    max: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

export const prisma = lazyInit("api:prisma", initPrisma);
