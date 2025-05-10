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

  // Parse query parameters
  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50");
  const page = parseInt(searchParams.get("page") || "1");
  const offset = (page - 1) * limit;
  const type = searchParams.get("type");
  const channel = searchParams.get("channel");
  const status = searchParams.get("status");

  try {
    // Build query
    let query = supabase
      .from("notification_logs")
      .select("*", { count: "exact" })
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters if provided
    if (type) {
      query = query.eq("notification_type", type);
    }
    if (channel) {
      query = query.eq("channel", channel);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("Error fetching notification logs:", error);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data || [],
      pagination: {
        total: count || 0,
        page,
        limit,
        pages: count ? Math.ceil(count / limit) : 0,
      },
    });
  } catch (err) {
    console.error("Unexpected error fetching notification logs:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
