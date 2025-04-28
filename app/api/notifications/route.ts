import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: authError?.message || "Not authenticated" },
      { status: 401 }
    );
  }
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .eq("read", false)
    .order("created_at", { ascending: false });
  if (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json([], { status: 200 });
  }
  return NextResponse.json(data || []);
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { id } = await req.json();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: authError?.message || "Not authenticated" },
      { status: 401 }
    );
  }
  const { error } = await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
