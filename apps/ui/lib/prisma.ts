// lib/prisma.ts
import { PrismaClient } from "@prisma/client";

// Prevent multiple instances in development
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = new PrismaClient({
  log: ["query", "error", "warn"],
  datasources: {
    db: {
      url: "postgresql://zzyra:zzyra@localhost:5433/zzyra?schema=public",
    },
  },
});

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
