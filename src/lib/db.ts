let db: any = null;

try {
  const { PrismaClient } = require("@prisma/client");
  const globalForPrisma = globalThis as unknown as { prisma: any };
  db = globalForPrisma.prisma || new PrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = db;
  }
} catch {
  // PrismaClient not available — likely not generated yet or DB not configured
  db = null;
}

export { db };
