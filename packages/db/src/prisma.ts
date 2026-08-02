import { PrismaClient } from '../prisma/generated/client'
import { withAccelerate } from '@prisma/extension-accelerate'

// Learn more about instantiating PrismaClient in Next.js here: https://www.prisma.io/docs/data-platform/accelerate/getting-started

export const prisma = new PrismaClient({
  accelerateUrl: process.env.DATABASE_URL ?? '',
}).$extends(withAccelerate())
