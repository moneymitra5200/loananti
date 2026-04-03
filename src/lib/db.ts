import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Prisma configuration optimized for serverless (Vercel) and Hostinger MySQL
// Hostinger MySQL has connection limits, so we need careful management

const prismaClientSingleton = () => {
  // For serverless, use the pooled connection URL
  const databaseUrl = process.env.DATABASE_URL
  
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    // Add error handling for serverless
    __internal: {
      engine: {
        connectionTimeout: 30000, // 30 seconds timeout
        poolTimeout: 30,
      }
    }
  } as any)
}

// Use global singleton to prevent multiple Prisma instances
// This is crucial for preventing connection pool exhaustion in serverless
export const db = globalForPrisma.prisma || prismaClientSingleton()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

// No graceful shutdown needed in serverless - Vercel handles this
// MySQL connected to Hostinger database with connection pooling
