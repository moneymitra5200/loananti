import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Prisma configuration for MySQL
// Ensure DATABASE_URL is properly set in .env file

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ['error'],
  })
}

// Use global singleton to prevent multiple Prisma instances
// This is crucial for preventing connection pool exhaustion
export const db = globalForPrisma.prisma ?? prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
