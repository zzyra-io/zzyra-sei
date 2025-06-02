import { NextResponse } from "next/server";
import prisma from "@zyra/database/src/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const executionId = searchParams.get("executionId");

  // Validate session
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!executionId) {
    return NextResponse.json({ error: "Missing executionId" }, { status: 400 });
  }

  try {
    // Verify user has access to this execution
    const execution = await prisma.workflowExecution.findFirst({
      where: {
        id: executionId,
        workflow: {
          userId: session.user.id,
        },
      },
      select: {
        id: true,
      },
    });

    if (!execution) {
      return NextResponse.json(
        { error: "Execution not found or access denied" },
        { status: 404 }
      );
    }

    // Fetch node executions
    const nodeExecutions = await prisma.nodeExecution.findMany({
      where: {
        executionId: executionId,
      },
    });

    // Format the response to match the expected structure
    const formattedNodeExecutions = nodeExecutions.map((node) => {
      // Get input data from nodeInputs relation if needed
      // For now, we'll use null as we need to fetch this separately
      const inputData = null;

      // Parse output if it exists
      let outputData = null;
      try {
        if (node.output) {
          outputData =
            typeof node.output === "string"
              ? JSON.parse(node.output)
              : node.output;
        }
      } catch (e) {
        console.error("Error parsing node output:", e);
      }

      return {
        id: node.id,
        execution_id: node.executionId,
        node_id: node.nodeId,
        status: node.status,
        started_at: node.startedAt.toISOString(),
        completed_at: node.finishedAt ? node.finishedAt.toISOString() : null,
        error: node.error || null,
        input_data: inputData,
        output_data: outputData,
      };
    });

    return NextResponse.json(formattedNodeExecutions);
  } catch (error) {
    console.error("Error fetching node executions:", error);
    return NextResponse.json(
      { error: "Failed to fetch node executions" },
      { status: 500 }
    );
  }
}
