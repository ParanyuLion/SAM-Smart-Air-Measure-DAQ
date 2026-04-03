let db: any = null;
let dbInitError: string | null = null;

try {
  const { PrismaClient } = require("@prisma/client");
  const { PrismaMariaDb } = require("@prisma/adapter-mariadb");
  const { createPool } = require("mariadb");

  const globalForPrisma = globalThis as unknown as { prisma: any };
  
  if (!globalForPrisma.prisma) {
    const pool = createPool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || "3306", 10),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD, // Unescaped password works flawlessly here!
      database: process.env.DB_NAME,
      connectionLimit: 5
    });
    const adapter = new PrismaMariaDb(pool);
    globalForPrisma.prisma = new PrismaClient({ adapter });
  }
  
  db = globalForPrisma.prisma;

  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = db;
  }
} catch (err: any) {
  console.error("PrismaClient initialization failed:", err);
  dbInitError = err?.message || String(err);
  db = null;
}

export { db, dbInitError };
