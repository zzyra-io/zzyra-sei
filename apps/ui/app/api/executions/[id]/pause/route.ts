import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/serviceClient";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { id: executionId } = params;
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("workflow_executions")
    .update({ status: "paused" })
    .eq("id", executionId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
