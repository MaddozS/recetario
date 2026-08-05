import { PrismaClient } from "../prisma/generated/client";
import { withAccelerate } from "@prisma/extension-accelerate";

let prismaInstance: ReturnType<typeof createPrismaClientInternal> | null = null;

function createPrismaClientInternal() {
  const accelerateUrl = process.env.DATABASE_URL;
  if (!accelerateUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  return new PrismaClient({
    accelerateUrl,
    log: [{ emit: "event", level: "query" }],
  }).$extends(withAccelerate());
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

