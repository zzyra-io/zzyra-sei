import type { Database } from "@/types/supabase";
import { createBrowserClient } from "@supabase/ssr";
import { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient<Database> | null = null;

export function createClient(): SupabaseClient<Database> {
  if (client) return client;

  // Determine URL and key: prefer service role for server, anon for client
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing Supabase environment variables: SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL and corresponding key"
    );
  }
  client = createBrowserClient<Database>(url, key);

  return client;
}
