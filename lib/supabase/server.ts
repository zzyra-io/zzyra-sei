import { createServerClient } from "@supabase/ssr";

export async function createClient() {
  const cookieStore = await import("next/headers").then((m) => m.cookies());
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          console.log("Cookie get:", name);
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          console.log("Cookie set:", name, value, options);
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          console.log("Cookie remove:", name, options);
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );
}
