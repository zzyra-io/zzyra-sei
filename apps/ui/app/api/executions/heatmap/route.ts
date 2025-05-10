import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/serviceClient";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workflowId = searchParams.get("workflowId");
  if (!workflowId) {
    return NextResponse.json({ error: "Missing workflowId" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Fetch node execution durations and failure counts over last 30 days
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  
  // First get all executions for this workflow
  const { data: workflowExecutions, error: workflowError } = await supabase
    .from("workflow_executions")
    .select("id")
    .eq("workflow_id", workflowId)
    .gte("started_at", since);
    
  if (workflowError) {
    console.error("Workflow executions fetch error: ", workflowError);
    return NextResponse.json({ error: workflowError.message }, { status: 500 });
  }
  
  if (!workflowExecutions || workflowExecutions.length === 0) {
    // No executions found for this workflow in the time period
    return NextResponse.json([]);
  }
  
  // Get all execution IDs
  const executionIds = workflowExecutions.map(exec => exec.id);
  
  // Then get all node executions for these workflow executions
  const { data, error } = await supabase
    .from("node_executions")
    .select("node_id, started_at, completed_at, status")
    .in("execution_id", executionIds)
    .gte("started_at", since);

  if (error) {
    console.error("Heatmap fetch error: ", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Get node labels from workflow
  const { data: workflowData, error: workflowFetchError } = await supabase
    .from("workflows")
    .select("nodes")
    .eq("id", workflowId)
    .single();
  
  // Create a map of node IDs to labels
  const nodeLabels: Record<string, string> = {};
  if (workflowData?.nodes) {
    try {
      const nodes = Array.isArray(workflowData.nodes) ? workflowData.nodes : JSON.parse(workflowData.nodes as string);
      nodes.forEach((node: any) => {
        const label = node.data?.label || node.data?.name || node.type || node.id;
        nodeLabels[node.id] = label;
      });
    } catch (err) {
      console.error("Error parsing workflow nodes:", err);
    }
  }

  // Group by node_id and day buckets
  const buckets: Record<string, Record<string, { total: number; failures: number; totalDuration: number }>> = {};
  data?.forEach((row) => {
    // Format date as "Apr 23" for better readability
    const date = new Date(row.started_at);
    const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    if (!buckets[row.node_id]) buckets[row.node_id] = {};
    if (!buckets[row.node_id][formattedDate]) {
      buckets[row.node_id][formattedDate] = { total: 0, failures: 0, totalDuration: 0 };
    }
    
    buckets[row.node_id][formattedDate].total += 1;
    
    if (row.completed_at) {
      const dur = new Date(row.completed_at).getTime() - new Date(row.started_at).getTime();
      buckets[row.node_id][formattedDate].totalDuration += dur;
    }
    
    if (row.status === "failed") {
      buckets[row.node_id][formattedDate].failures += 1;
    }
  });

  const result: Array<{ nodeId: string; nodeLabel: string; date: string; avgDuration: number; failureRate: number; executionCount: number }> = [];
  
  // Sort dates for consistent display
  Object.entries(buckets).forEach(([nodeId, days]) => {
    const sortedDates = Object.keys(days).sort((a, b) => {
      // Convert "Apr 23" format back to Date objects for sorting
      const dateA = new Date(a + ", 2025"); // Adding year for proper parsing
      const dateB = new Date(b + ", 2025");
      return dateA.getTime() - dateB.getTime();
    });
    
    sortedDates.forEach(date => {
      const stats = days[date];
      result.push({
        nodeId,
        nodeLabel: nodeLabels[nodeId] || nodeId, // Use label if available, otherwise ID
        date,
        avgDuration: Math.round(stats.totalDuration / stats.total), // Round to whole number
        failureRate: Math.round((stats.failures / stats.total) * 100), // Round to whole number
        executionCount: stats.total
      });
    });
  });

  return NextResponse.json(result);
}
