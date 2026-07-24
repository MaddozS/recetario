import { PrismaClient } from "../../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

let _prisma: PrismaClient | undefined;

function initPrisma(): PrismaClient {
  if (_prisma) return _prisma;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const pool = new pg.Pool({
    connectionString,
    max: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  _prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  return _prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, key) {
    const client = initPrisma();
    const value = (client as Record<string | symbol, unknown>)[key];
    return typeof value === "function" ? (value as Function).bind(client) : value;
  },
});
