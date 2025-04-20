import { NextResponse } from "next/server";
import { executionService } from "@/lib/services/execution-service";
import { addExecutionJob } from "@/lib/queue/executionQueue";

export async function POST(request: Request) {
  try {
    const { workflowId } = await request.json();
    const executionId = await executionService.startExecution(workflowId);
    // Enqueue the job for background processing
    await addExecutionJob(executionId, workflowId);
    return NextResponse.json({ executionId });
  } catch (error) {
    console.error("Error enqueuing execution:", error);
    return NextResponse.error();
  }
}
