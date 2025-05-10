import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    // Exchange the code for a session (sets cookies)
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) console.error("Auth exchange error:", error);
  }
  return NextResponse.redirect(new URL("/dashboard", url.origin));
}
