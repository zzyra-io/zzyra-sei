import { NextRequest, NextResponse } from "next/server";
import { ExecutionRepository } from "@zyra/database";
import { WorkflowRepository } from "@zyra/database";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// Initialize repositories
const executionRepository = new ExecutionRepository();
const workflowRepository = new WorkflowRepository();

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // Get session using Next Auth
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { workflowId } = await request.json();

    // Verify that the workflow exists and user has access
    const workflow = await workflowRepository.findById(workflowId, userId);
    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Create workflow execution using the execution repository
    const execution = await executionRepository.createExecution(
      workflowId,
      userId,
      {}, // No input data for now
      "manual" // Trigger type
    );

    if (!execution) {
      console.error("Error starting execution");
      return NextResponse.json(
        { error: "Failed to start workflow execution" },
        { status: 500 }
      );
    }

    const executionId = execution.id;

    // Queue the execution job
    const { addExecutionJob } = await import(
      "@/lib/queue/executionQueue.server"
    );
    await addExecutionJob(executionId, workflowId, userId);

    return NextResponse.json({ executionId });
  } catch (error) {
    console.error("Unexpected error in execute-workflow route:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
