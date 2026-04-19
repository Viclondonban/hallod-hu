import { PrismaClient } from '@prisma/client';

// Single shared PrismaClient. Each per-module copy of the old
// `globalForPrisma` block was instantiating its own client in production
// (the NODE_ENV !== 'production' guard prevented global caching in prod),
// which is the main source of the month-long RAM drift on Railway.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}
