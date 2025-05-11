import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: { executionId: string } }
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

    // Properly await params before destructuring
    const executionId = params.executionId;

    // Get the execution record
    const { data: execution, error: execError } = await supabase
      .from("workflow_executions")
      .select("*")
      .eq("id", executionId)
      .single();

    if (execError || !execution) {
      return NextResponse.json(
        { error: "Execution not found" },
        { status: 404 }
      );
    }

    // Get the node execution logs
    const { data: nodeLogs, error: nodeLogError } = await supabase
      .from("node_logs")
      .select("*")
      .eq("execution_id", executionId)
      .order("ts", { ascending: true });

    if (nodeLogError) {
      console.error("Error fetching node logs:", nodeLogError);
    }

    // Process node logs to get nodes completed, failed, and pending
    const nodesCompleted: string[] = [];
    const nodesFailed: string[] = [];
    const nodesPending: string[] = [];
    const logs: string[] = [];

    // Find the current node being executed
    let currentNodeId = null;

    if (nodeLogs) {
      nodeLogs.forEach((log) => {
        if (log.status === "completed") {
          nodesCompleted.push(log.node_id);
        } else if (log.status === "failed") {
          nodesFailed.push(log.node_id);
        } else if (log.status === "running") {
          currentNodeId = log.node_id;
        } else if (log.status === "pending") {
          nodesPending.push(log.node_id);
        }

        if (log.message) {
          logs.push(`[${log.node_id}] ${log.status}: ${log.message}`);
        }
      });
    }

    // Calculate progress percentage
    const totalNodes = execution.nodes ? execution.nodes.length : 0;
    const executionProgress = totalNodes > 0 
      ? Math.round((nodesCompleted.length / totalNodes) * 100) 
      : 0;

    return NextResponse.json({
      id: execution.id,
      status: execution.status,
      current_node_id: currentNodeId,
      execution_progress: executionProgress,
      nodes_completed: nodesCompleted,
      nodes_failed: nodesFailed,
      nodes_pending: nodesPending,
      result: execution.result || {},
      error: execution.error,
      logs,
    });
  } catch (error: unknown) {
    console.error("Unexpected error in execute-workflow/[executionId] route:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
