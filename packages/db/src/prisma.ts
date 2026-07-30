import { PrismaClient } from "@prisma/client/edge";
import { withAccelerate } from "@prisma/extension-accelerate";

const prismaClientSingleton = (nodeEnv: string) => {
  return nodeEnv === 'production'
    ? new PrismaClient({
        accelerateUrl: process.env.DATABASE_URL,
      }).$extends(withAccelerate())
    : new PrismaClient().$extends(withAccelerate())
}

export const prisma = prismaClientSingleton(process.env.NODE_ENV as string)
