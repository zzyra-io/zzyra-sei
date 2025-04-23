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
    // Get execution counts grouped by date and status
    const { data: executions, error } = await supabase
      .from("workflow_executions")
      .select(
        "id, status, started_at, completed_at, error, node_executions(status)"
      )
      .eq("workflow_id", workflowId)
      .gte("started_at", since)
      .order("started_at", { ascending: true });

    if (error) throw error;

    // Group by date and calculate metrics
    const dailyStats: Record<string, any> = {};
    executions?.forEach((exec) => {
      const date = new Date(exec.started_at).toISOString().split("T")[0];
      if (!dailyStats[date]) {
        dailyStats[date] = {
          date,
          total: 0,
          success: 0,
          failed: 0,
          avgDuration: 0,
          totalDuration: 0,
        };
      }

      dailyStats[date].total++;
      if (exec.status === "completed") {
        dailyStats[date].success++;
      } else if (exec.status === "failed") {
        dailyStats[date].failed++;
      }

      // Calculate duration if completed
      if (exec.completed_at) {
        const duration =
          new Date(exec.completed_at).getTime() -
          new Date(exec.started_at).getTime();
        dailyStats[date].totalDuration += duration;
      }
    });

    // Calculate averages and format response
    const result = Object.values(dailyStats).map((day) => ({
      ...day,
      successRate: day.total > 0 ? (day.success / day.total) * 100 : 0,
      failureRate: day.total > 0 ? (day.failed / day.total) * 100 : 0,
      avgDuration: day.total > 0 ? day.totalDuration / day.total : 0,
    }));

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Error fetching execution trends:", error);
    return NextResponse.json(
      { error: "Failed to fetch execution trends" },
      { status: 500 }
    );
  }
}
