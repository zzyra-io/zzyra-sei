import { PrismaClient } from "@prisma/client";

// Custom error class for database operations
export class DatabaseError extends Error {
  constructor(
    message: string,
    public code: string,
    public operation: string,
    public details?: any
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

// Database connection state
let connectionState = {
  isConnected: false,
  lastError: null as Error | null,
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,
};

let prisma: PrismaClient;

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log: [
      { emit: "event", level: "query" },
      { emit: "event", level: "error" },
      { emit: "event", level: "info" },
      { emit: "event", level: "warn" },
    ],
    errorFormat: "pretty",
  });

  // Add logging event listeners
  client.$on("query", (e) => {
    if (process.env.NODE_ENV === "development") {
      console.log(`[DATABASE] Query: ${e.query}`);
      console.log(`[DATABASE] Params: ${e.params}`);
      console.log(`[DATABASE] Duration: ${e.duration}ms`);
    }
  });

  client.$on("error", (e) => {
    console.error(`[DATABASE] Error:`, e);
    connectionState.lastError = new Error(e.message);
    connectionState.isConnected = false;
  });

  client.$on("info", (e) => {
    console.log(`[DATABASE] Info: ${e.message}`);
  });

  client.$on("warn", (e) => {
    console.warn(`[DATABASE] Warning: ${e.message}`);
  });

  // Add custom error handling middleware
  client.$use(async (params, next) => {
    const start = Date.now();

    try {
      const result = await next(params);
      const duration = Date.now() - start;

      // Mark connection as healthy on successful operations
      connectionState.isConnected = true;
      connectionState.lastError = null;
      connectionState.reconnectAttempts = 0;

      // Log slow queries
      if (duration > 1000) {
        console.warn(
          `[DATABASE] Slow query detected: ${params.model}.${params.action} took ${duration}ms`
        );
      }

      return result;
    } catch (error: any) {
      const duration = Date.now() - start;

      // Enhanced error handling with categorization
      let errorCode = "UNKNOWN_ERROR";
      let errorMessage = error.message || "Unknown database error";

      // Categorize Prisma errors
      if (error.code) {
        switch (error.code) {
          case "P1001":
            errorCode = "CONNECTION_ERROR";
            errorMessage = "Database server is unreachable";
            connectionState.isConnected = false;
            break;
          case "P1002":
            errorCode = "CONNECTION_TIMEOUT";
            errorMessage = "Database connection timed out";
            connectionState.isConnected = false;
            break;
          case "P1003":
            errorCode = "DATABASE_NOT_FOUND";
            errorMessage = "Database does not exist";
            break;
          case "P1008":
            errorCode = "OPERATION_TIMEOUT";
            errorMessage = "Database operation timed out";
            break;
          case "P1017":
            errorCode = "CONNECTION_CLOSED";
            errorMessage = "Database connection was closed";
            connectionState.isConnected = false;
            break;
          case "P2002":
            errorCode = "UNIQUE_CONSTRAINT_VIOLATION";
            errorMessage = "Unique constraint violation";
            break;
          case "P2003":
            errorCode = "FOREIGN_KEY_CONSTRAINT_VIOLATION";
            errorMessage = "Foreign key constraint violation";
            break;
          case "P2025":
            errorCode = "RECORD_NOT_FOUND";
            errorMessage = "Record not found";
            break;
          default:
            errorCode = `PRISMA_${error.code}`;
        }
      }

      // Log detailed error information
      console.error(`[DATABASE] Operation failed:`, {
        operation: `${params.model}.${params.action}`,
        duration: `${duration}ms`,
        errorCode,
        errorMessage,
        prismaCode: error.code,
        args: params.args,
        stack: error.stack,
      });

      // Update connection state
      connectionState.lastError = error;

      // Throw enhanced error
      throw new DatabaseError(
        errorMessage,
        errorCode,
        `${params.model}.${params.action}`,
        {
          prismaCode: error.code,
          duration,
          args: params.args,
          originalError: error,
        }
      );
    }
  });

  return client;
}

// Connection management functions
export async function connectDatabase(): Promise<void> {
  try {
    console.log("[DATABASE] Attempting to connect...");
    await prisma.$connect();
    connectionState.isConnected = true;
    connectionState.lastError = null;
    connectionState.reconnectAttempts = 0;
    console.log("[DATABASE] Successfully connected");
  } catch (error: any) {
    connectionState.isConnected = false;
    connectionState.lastError = error;
    connectionState.reconnectAttempts++;

    console.error(
      `[DATABASE] Connection failed (attempt ${connectionState.reconnectAttempts}):`,
      error
    );

    if (
      connectionState.reconnectAttempts < connectionState.maxReconnectAttempts
    ) {
      const delay = Math.min(
        1000 * Math.pow(2, connectionState.reconnectAttempts),
        30000
      );
      console.log(`[DATABASE] Retrying connection in ${delay}ms...`);
      setTimeout(() => connectDatabase(), delay);
    } else {
      console.error(
        "[DATABASE] Max reconnection attempts reached. Manual intervention required."
      );
      throw new DatabaseError(
        "Database connection failed after maximum retry attempts",
        "MAX_RETRIES_EXCEEDED",
        "connection",
        { attempts: connectionState.reconnectAttempts, lastError: error }
      );
    }
  }
}

export async function disconnectDatabase(): Promise<void> {
  try {
    await prisma.$disconnect();
    connectionState.isConnected = false;
    console.log("[DATABASE] Disconnected successfully");
  } catch (error: any) {
    console.error("[DATABASE] Error during disconnect:", error);
    throw error;
  }
}

export function getDatabaseConnectionState() {
  return { ...connectionState };
}

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    connectionState.isConnected = true;
    connectionState.lastError = null;
    return true;
  } catch (error: any) {
    connectionState.isConnected = false;
    connectionState.lastError = error;
    console.error("[DATABASE] Health check failed:", error);
    return false;
  }
}

if (process.env.NODE_ENV === "production") {
  prisma = createPrismaClient();
} else {
  // Ensure the prisma instance is re-used during hot-reloading in development
  // @ts-ignore
  if (!global.prisma) {
    // @ts-ignore
    global.prisma = createPrismaClient();
  }
  // @ts-ignore
  prisma = global.prisma;
}

// Initialize connection in Node.js environment only
if (
  typeof process !== "undefined" &&
  process.versions &&
  process.versions.node
) {
  connectDatabase().catch((error) => {
    console.error("[DATABASE] Failed to initialize connection:", error);
  });
}

export default prisma;
export * from "@prisma/client";
