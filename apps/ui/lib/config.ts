/**
 * Environment Configuration
 *
 * This file provides a type-safe way to access environment variables.
 */

// Define required environment variables
interface EnvVars {
  // Magic Link
  magicPublishableKey: string;

  // Blockchain Network
  blockchainNetwork: string;

  // Worker URL for WebSocket connections
  workerUrl?: string;

  // Concurrency settings
  concurrency: {
    prefetch: number;
  };
}

// Get environment variables with validation
export const config: EnvVars = {
  // Magic Link
  magicPublishableKey: process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY || "",

  // Blockchain Network
  blockchainNetwork: process.env.NEXT_PUBLIC_BLOCKCHAIN_NETWORK || "84532",

  // Worker URL for WebSocket connections (optional in development)
  workerUrl:
    process.env.NEXT_PUBLIC_WORKER_URL ||
    (process.env.NODE_ENV === "development"
      ? "http://localhost:3009"
      : "http://localhost:3009"),

  // Concurrency settings
  concurrency: {
    prefetch: parseInt(process.env.QUEUE_PREFETCH || "1"),
  },
};

// Validate required environment variables
export function validateEnvVars(): string[] {
  const missingVars: string[] = [];

  if (!config.magicPublishableKey) {
    missingVars.push("NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY");
  }

  return missingVars;
}

// Validate env vars in development
if (process.env.NODE_ENV !== "production") {
  const missingVars = validateEnvVars();
  if (missingVars.length > 0) {
    console.warn(
      `⚠️ Missing environment variables: ${missingVars.join(", ")}\n` +
        "Please add them to your .env.local file."
    );
  }
}
