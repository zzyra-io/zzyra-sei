import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/serviceClient";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { id: executionId } = params;
  const { nodeId } = await request.json();
  const supabase = createServiceClient();
  // TODO: enqueue retry logic for specific node
  // For now, mark execution as running and let worker handle retry
  const { error } = await supabase
    .from("workflow_executions")
    .update({ status: "running" })
    .eq("id", executionId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
