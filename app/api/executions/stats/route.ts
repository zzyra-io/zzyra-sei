import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/serviceClient";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workflowId = searchParams.get("workflowId");
  const days = parseInt(searchParams.get("days") || "30");

  if (!workflowId) {
    return NextResponse.json(
      { error: "Missing workflowId parameter" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Get execution counts by status
    const { data: statusCounts, error: statusError } = await supabase
      .from("workflow_executions")
      .select("status, count:count(*)")
      .eq("workflow_id", workflowId)
      .gte("started_at", since);

    if (statusError) {
      console.error("Status Error:", statusError);
      throw statusError;
    }

    // Get average duration
    const { data: durationStats, error: durationError } = await supabase.rpc(
      "get_execution_duration_stats",
      {
        workflow_id: workflowId,
        since_date: since,
      }
    );

    if (durationError) {
      console.error("Duration Error:", durationError.message);
      throw durationError;
    }

    // Get node execution stats
    const { data: nodeStats, error: nodeError } = await supabase.rpc(
      "get_node_execution_stats",
      {
        workflow_id: workflowId,
        since_date: since,
      }
    );

    if (nodeError) {
      console.error("Node Error:", nodeError.message);
      throw nodeError;
    }

    // Format response
    const result = {
      statusCounts: statusCounts || [],
      durationStats: durationStats || { avg: 0, min: 0, max: 0 },
      nodeStats: nodeStats || [],
      since,
      workflowId,
    };

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error fetching execution stats:", error.message);
    return NextResponse.json(
      { error: "Failed to fetch execution stats" },
      { status: 500 }
    );
  }
}
