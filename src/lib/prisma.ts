/**
 * Astro 数据库客户端单例
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: import.meta.env.PROD ? ['error'] : ['query', 'error', 'warn'],
  });

if (import.meta.env.PROD === false) {
  globalForPrisma.prisma = prisma;
}

export default prisma;
