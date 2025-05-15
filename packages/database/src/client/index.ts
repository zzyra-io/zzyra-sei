/**
 * Prisma Client Singleton
 *
 * This module exports a singleton instance of PrismaClient to be used
 * throughout the application. It ensures only one instance of PrismaClient
 * is created, even during development with hot reloading.
 */

import { PrismaClient } from "@prisma/client";

// Add prisma to the NodeJS global type
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// Prevent multiple instances of Prisma Client in development
const prisma =
  global.prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export default prisma;
