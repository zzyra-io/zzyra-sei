import { NextResponse } from "next/server";
import prisma from "@zyra/database/src/client";

type NodeStats = {
  node_id: string;
  total_executions: number;
  completed_executions: number;
  failed_executions: number;
  avg_duration_ms: number;
  total_duration_ms: number;
};

type NodeExecution = {
  nodeId: string;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
};

type CompletedExecution = {
  startedAt: Date;
  finishedAt: Date;
};

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

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  try {
    // Get execution counts by status
    const totalCount = await prisma.workflowExecution.count({
      where: {
        workflowId: workflowId,
      },
    });

    // Get average, min, max duration for completed executions
    const completedExecutions = await prisma.workflowExecution.findMany({
      where: {
        workflowId: workflowId,
        startedAt: {
          gte: since,
        },
        finishedAt: {
          not: null,
        },
        status: "completed",
      },
      select: {
        startedAt: true,
        finishedAt: true,
      },
    }) as CompletedExecution[];

    // Calculate duration stats
    let durationStats = { avg: 0, min: 0, max: 0 };
    
    if (completedExecutions.length > 0) {
      const durations = completedExecutions.map((exec: CompletedExecution) => {
        // finishedAt is guaranteed to be non-null by the query filter
        const duration = exec.finishedAt.getTime() - exec.startedAt.getTime();
        return duration;
      });

      durationStats = {
        avg: Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length),
        min: Math.min(...durations),
        max: Math.max(...durations),
      };
    }

    // Get node execution stats
    const nodeExecutions = await prisma.nodeExecution.findMany({
      where: {
        execution: {
          workflowId: workflowId,
          startedAt: {
            gte: since,
          },
        },
      },
      select: {
        nodeId: true,
        status: true,
        startedAt: true,
        completedAt: true,
      },
    }) as NodeExecution[];

    // Group node executions by nodeId and calculate stats
    const nodeStatsMap = new Map<string, NodeStats>();
    
    nodeExecutions.forEach((node: NodeExecution) => {
      if (!nodeStatsMap.has(node.nodeId)) {
        nodeStatsMap.set(node.nodeId, {
          node_id: node.nodeId,
          total_executions: 0,
          completed_executions: 0,
          failed_executions: 0,
          avg_duration_ms: 0,
          total_duration_ms: 0,
        });
      }
      
      const stats = nodeStatsMap.get(node.nodeId)!;
      stats.total_executions += 1;
      
      if (node.status === "completed") {
        stats.completed_executions += 1;
      } else if (node.status === "failed") {
        stats.failed_executions += 1;
      }
      
      if (node.completedAt && node.startedAt) {
        const duration = node.completedAt.getTime() - node.startedAt.getTime();
        stats.total_duration_ms += duration;
      }
    });
    
    // Calculate averages
    const nodeStats = Array.from(nodeStatsMap.values()).map((stats: NodeStats) => {
      return {
        ...stats,
        avg_duration_ms: stats.completed_executions > 0
          ? Math.round(stats.total_duration_ms / stats.completed_executions)
          : 0,
      };
    });

    // Format response
    const result = {
      statusCounts: totalCount,
      durationStats: durationStats,
      nodeStats: nodeStats,
      since: since.toISOString(),
      workflowId,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching execution stats:", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { error: "Failed to fetch execution stats" },
      { status: 500 }
    );
  }
}
