import "dotenv/config";
import type { PrismaClient } from "../../generated/prisma/client.js";

const url = process.env.DATABASE_URL ?? "";
const isSQLite = url.startsWith("file:");

let Pc: typeof import("../../generated/prisma/client.js").PrismaClient;
let adapter: InstanceType<typeof import("@prisma/adapter-better-sqlite3").PrismaBetterSqlite3> | InstanceType<typeof import("@prisma/adapter-pg").PrismaPg>;

if (isSQLite) {
  const [{ PrismaClient: C }, { PrismaBetterSqlite3 }] = await Promise.all([
    import("../../generated/prisma-sqlite/client.js"),
    import("@prisma/adapter-better-sqlite3"),
  ]);
  Pc = C as typeof import("../../generated/prisma/client.js").PrismaClient;
  adapter = new PrismaBetterSqlite3({ url });
} else {
  const [{ PrismaClient: C }, { PrismaPg }, { default: pg }] =
    await Promise.all([
      import("../../generated/prisma/client.js"),
      import("@prisma/adapter-pg"),
      import("pg"),
    ]);
  Pc = C;
  const pool = new pg.Pool({
    connectionString: url,
    max: 3,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
  adapter = new PrismaPg(pool);
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new Pc({ adapter }) as PrismaClient;

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
