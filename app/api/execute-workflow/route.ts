import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
// Default edge runtime; queue logic is dynamically loaded

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workflowId } = await request.json();

    const { data, error: insertError } = await supabase
      .from("workflow_executions")
      .insert({
        workflow_id: workflowId,
        status: "pending",
        triggered_by: user.id,
      })
      .select("id")
      .single();

    if (insertError || !data) {
      console.error("Error starting execution:", insertError);
      return NextResponse.json(
        { error: "Failed to start workflow execution" },
        { status: 500 }
      );
    }

    const executionId = data.id;

    const { addExecutionJob } = await import(
      "@/lib/queue/executionQueue.server"
    );
    await addExecutionJob(executionId, workflowId, user.id);

    return NextResponse.json({ executionId });
  } catch (error) {
    console.error("Unexpected error in execute-workflow route:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
