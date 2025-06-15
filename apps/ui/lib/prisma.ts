// lib/prisma.ts
import { withAccelerate } from "@prisma/extension-accelerate";
import { PrismaClient } from "@zyra/database";

// Create Prisma client without extension first
const basePrisma = new PrismaClient({
  log: ["query", "error", "warn"],
});

// Add Prisma to the NodeJS global type
declare global {
  // eslint-disable-next-line no-var
  var cachedPrisma: typeof basePrisma | undefined;
}

// Prevent multiple instances in development
const globalPrisma = global.cachedPrisma || basePrisma;
if (process.env.NODE_ENV !== "production") global.cachedPrisma = globalPrisma;

// Export Prisma with Accelerate extension
export const prisma = globalPrisma.$extends(withAccelerate());
