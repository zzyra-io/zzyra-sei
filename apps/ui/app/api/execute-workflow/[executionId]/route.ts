import { NextRequest, NextResponse } from "next/server";
import { ExecutionRepository } from "@zyra/database";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

// Initialize repositories
const executionRepository = new ExecutionRepository();

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { executionId: string } }
) {
  try {
    // Get session using Next Auth
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const executionId = params.executionId;

    // Get the execution with nodes and logs using the repository
    const executionWithDetails = await executionRepository.findWithNodesAndLogs(
      executionId
    );

    if (!executionWithDetails) {
      return NextResponse.json(
        { error: "Execution not found" },
        { status: 404 }
      );
    }

    // Make sure the user has access to this execution
    if (executionWithDetails.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Process node executions to get nodes completed, failed, and pending
    const nodesCompleted: string[] = [];
    const nodesFailed: string[] = [];
    const nodesPending: string[] = [];
    const logs: string[] = [];

    // Find the current node being executed
    let currentNodeId: string | null = null;

    if (
      executionWithDetails.nodeExecutions &&
      executionWithDetails.nodeExecutions.length > 0
    ) {
      executionWithDetails.nodeExecutions.forEach((nodeExec) => {
        if (nodeExec.status === "completed") {
          nodesCompleted.push(nodeExec.nodeId);
        } else if (nodeExec.status === "failed") {
          nodesFailed.push(nodeExec.nodeId);
        } else if (nodeExec.status === "running") {
          currentNodeId = nodeExec.nodeId;
        } else if (nodeExec.status === "pending") {
          nodesPending.push(nodeExec.nodeId);
        }
      });
    }

    // Process execution logs
    if (
      executionWithDetails.executionLogs &&
      executionWithDetails.executionLogs.length > 0
    ) {
      executionWithDetails.executionLogs.forEach((log) => {
        if (log.message) {
          logs.push(`[${log.level}] ${log.message}`);
        }
      });
    }

    // Get the workflow to determine total nodes for progress calculation
    const workflow = await executionWithDetails.workflow;
    const workflowNodes = workflow ? workflow.nodes || [] : [];

    // Calculate progress percentage based on completed nodes
    const totalNodes = Array.isArray(workflowNodes) ? workflowNodes.length : 0;
    const executionProgress =
      totalNodes > 0
        ? Math.round((nodesCompleted.length / totalNodes) * 100)
        : 0;

    return NextResponse.json({
      id: executionWithDetails.id,
      status: executionWithDetails.status,
      current_node_id: currentNodeId,
      execution_progress: executionProgress,
      nodes_completed: nodesCompleted,
      nodes_failed: nodesFailed,
      nodes_pending: nodesPending,
      result: executionWithDetails.output || {},
      error: executionWithDetails.error,
      logs,
    });
  } catch (error: unknown) {
    console.error(
      "Unexpected error in execute-workflow/[executionId] route:",
      error
    );
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
