import { PrismaClient } from "../prisma/generated/client";
import { PrismaPostgresAdapter } from "@prisma/adapter-ppg";

let prismaInstance: ReturnType<typeof createPrismaClientInternal> | null = null;

function createPrismaClientInternal() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  return new PrismaClient({
    adapter: new PrismaPostgresAdapter({ connectionString }),
  });
}

export function createPrismaClient() {
  return createPrismaClientInternal();
}

export function getPrisma() {
  if (!prismaInstance) {
    prismaInstance = createPrismaClientInternal();
  }
  return prismaInstance;
}

export const prisma = new Proxy({} as ReturnType<typeof createPrismaClientInternal>, {
  get(_target, prop) {
    const instance = getPrisma();
    const value = Reflect.get(instance, prop);
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});

