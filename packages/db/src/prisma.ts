import { PrismaClient } from "../prisma/generated/client";
import { withAccelerate } from "@prisma/extension-accelerate";

const accelerateUrl = process.env.DATABASE_URL;

export function createPrismaClient() {
  if (!accelerateUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  return new PrismaClient({
    accelerateUrl,
    log: [{ emit: "event", level: "query" }],
  }).$extends(withAccelerate());
}

export const prisma = createPrismaClient();
