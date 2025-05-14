/**
 * Environment Configuration
 *
 * This file provides a type-safe way to access environment variables.
 */

// Define required environment variables
interface EnvVars {
  // Supabase
  supabaseUrl: string;
  supabaseAnonKey: string;

  // Magic Link
  magicPublishableKey: string;
}

// Get environment variables with validation
export const config: EnvVars = {
  // Supabase
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",

  // Magic Link
  magicPublishableKey: process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY || "",
};

// Validate required environment variables
export function validateEnvVars(): string[] {
  const missingVars: string[] = [];

  if (!config.supabaseUrl) {
    missingVars.push("NEXT_PUBLIC_SUPABASE_URL");
  }

  if (!config.supabaseAnonKey) {
    missingVars.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

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
