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

    // Fetch block executions (which store node execution data)
    console.log(`[DEBUG] Looking for block executions with executionId: ${executionId}`);
    
    // Query the blockExecution table instead of nodeExecution
    const blockExecutions = await prisma.blockExecution.findMany({
      where: {
        executionId: executionId,
      },
    });
    
    console.log(`[DEBUG] Found ${blockExecutions.length} block executions`);
    
    // Map the block executions to the expected node execution format
    const nodeExecutions = blockExecutions;
    
    // If we didn't find any, check if there are any block executions at all in the database
    if (blockExecutions.length === 0) {
      const recentBlockExecutions = await prisma.blockExecution.findMany({
        take: 5,
        orderBy: {
          startTime: 'desc'
        },
        select: {
          id: true,
          executionId: true,
          nodeId: true,
          status: true
        }
      });
      
      console.log(`[DEBUG] Recent block executions:`, JSON.stringify(recentBlockExecutions, null, 2));
    }

    // Format the response to match the expected structure
    const formattedNodeExecutions = nodeExecutions.map((node) => {
      // Get input data from inputs relation if needed
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
        // Map startTime to started_at and endTime to completed_at
        started_at: node.startTime?.toISOString() || null,
        completed_at: node.endTime?.toISOString() || null,
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
