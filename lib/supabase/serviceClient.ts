import { createClient as createSupabaseClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Create a Supabase client with service_role key for server processes (e.g. workers)
 */
export function createServiceClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables");
  }
  return createSupabaseClient(url, key);
}
