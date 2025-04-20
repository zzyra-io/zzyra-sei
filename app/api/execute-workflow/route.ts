import { NextResponse } from "next/server";
import { addExecutionJob } from "@/lib/queue/executionQueue";
import { v4 as uuidv4 } from "uuid";
import { createServiceClient } from "@/lib/supabase/serviceClient";

export async function POST(request: Request) {
  try {
    const supabase = createServiceClient();
    const { workflowId } = await request.json();

    const executionId = uuidv4();
    const { error } = await supabase
      .from("workflow_executions")
      .insert({
        id: executionId,
        workflow_id: workflowId,
        status: "pending",
        triggered_by: null,
      });
    if (error) {
      console.error("Error creating execution:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    await addExecutionJob(executionId, workflowId);
    return NextResponse.json({ executionId });
  } catch (err: any) {
    console.error("Error enqueuing execution:", err);
    return NextResponse.json({ error: err.message || "Internal error" }, { status: 500 });
  }
}
