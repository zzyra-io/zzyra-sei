import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const executionId = params.id;
    const body = await request.json();
    const resumeData = body.resumeData ?? {};

    // Fetch latest pause record for this execution
    const { data: pauseRec, error: pauseErr } = await supabase
      .from("workflow_pauses")
      .select("*")
      .eq("execution_id", executionId)
      .is("resumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (pauseErr || !pauseRec) {
      return NextResponse.json(
        { error: "No active pause found" },
        { status: 404 }
      );
    }
    const pauseId = pauseRec.id;

    // Update resume timestamp and data
    const { error: updateErr } = await supabase
      .from("workflow_pauses")
      .update({ resumed_at: new Date().toISOString(), resume_data: resumeData })
      .eq("id", pauseId);
    if (updateErr) {
      console.error("Error updating pause record:", updateErr);
      return NextResponse.json({ error: "Failed to resume" }, { status: 500 });
    }

    // Fetch workflowId for enqueue
    const { data: execRec, error: execErr } = await supabase
      .from("workflow_executions")
      .select("workflow_id")
      .eq("id", executionId)
      .single();
    if (execErr || !execRec) {
      return NextResponse.json(
        { error: "Execution not found" },
        { status: 404 }
      );
    }
    const workflowId = execRec.workflow_id;

    // Enqueue resume job
    const { addExecutionJob } = await import(
      "@/lib/queue/executionQueue.server"
    );
    await addExecutionJob(executionId, workflowId, user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unexpected error in resume route:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
