import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

type HeatmapResultItem = {
  nodeId: string;
  nodeLabel: string;
  date: string;
  avgDuration: number;
  failureRate: number;
  executionCount: number;
};

type WorkflowExecution = {
  id: string;
};

type NodeExecution = {
  nodeId: string;
  startedAt: Date;
  completedAt: Date | null;
  status: string;
};

type NodeData = {
  id: string;
  type?: string;
  data?: {
    label?: string;
    name?: string;
  };
};

type BucketStats = {
  total: number;
  failures: number;
  totalDuration: number;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const workflowId = searchParams.get("workflowId");
  if (!workflowId) {
    return NextResponse.json({ error: "Missing workflowId" }, { status: 400 });
  }

  // Fetch node execution durations and failure counts over last 30 days
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  try {
    // First get all executions for this workflow
    const workflowExecutions = (await prisma.workflowExecution.findMany({
      where: {
        workflowId: workflowId,
        startedAt: {
          gte: since,
        },
      },
      select: {
        id: true,
      },
    })) as WorkflowExecution[];

    if (workflowExecutions.length === 0) {
      // No executions found for this workflow in the time period
      return NextResponse.json([]);
    }

    // Get all execution IDs
    const executionIds = workflowExecutions.map(
      (exec: WorkflowExecution) => exec.id
    );

    // Then get all node executions for these workflow executions
    const nodeExecutions = (await prisma.nodeExecution.findMany({
      where: {
        executionId: {
          in: executionIds,
        },
        startedAt: {
          gte: since,
        },
      },
      select: {
        nodeId: true,
        startedAt: true,
        completedAt: true,
        status: true,
      },
    })) as NodeExecution[];

    // Get workflow data for node labels
    const workflow = await prisma.workflow.findUnique({
      where: {
        id: workflowId,
      },
      select: {
        nodes: true,
      },
    });

    // Create a map of node IDs to labels
    const nodeLabels: Record<string, string> = {};
    if (workflow?.nodes) {
      try {
        const nodes =
          typeof workflow.nodes === "string"
            ? JSON.parse(workflow.nodes)
            : workflow.nodes;

        if (Array.isArray(nodes)) {
          nodes.forEach((node: NodeData) => {
            const label =
              node.data?.label || node.data?.name || node.type || node.id;
            nodeLabels[node.id] = label;
          });
        }
      } catch (err) {
        console.error("Error parsing workflow nodes:", err);
      }
    }

    // Group by nodeId and day buckets
    const buckets: Record<string, Record<string, BucketStats>> = {};

    nodeExecutions.forEach((node: NodeExecution) => {
      // Format date as "Apr 23" for better readability
      const formattedDate = node.startedAt.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });

      if (!buckets[node.nodeId]) buckets[node.nodeId] = {};
      if (!buckets[node.nodeId][formattedDate]) {
        buckets[node.nodeId][formattedDate] = {
          total: 0,
          failures: 0,
          totalDuration: 0,
        };
      }

      buckets[node.nodeId][formattedDate].total += 1;

      if (node.completedAt) {
        const duration = node.completedAt.getTime() - node.startedAt.getTime();
        buckets[node.nodeId][formattedDate].totalDuration += duration;
      }

      if (node.status === "failed") {
        buckets[node.nodeId][formattedDate].failures += 1;
      }
    });

    const result: HeatmapResultItem[] = [];

    // Sort dates for consistent display
    Object.entries(buckets).forEach(([nodeId, days]) => {
      const sortedDates = Object.keys(days).sort((a, b) => {
        // Convert "Apr 23" format back to Date objects for sorting
        const dateA = new Date(a + ", 2025"); // Adding year for proper parsing
        const dateB = new Date(b + ", 2025");
        return dateA.getTime() - dateB.getTime();
      });

      sortedDates.forEach((date) => {
        const stats = days[date];
        result.push({
          nodeId,
          nodeLabel: nodeLabels[nodeId] || nodeId, // Use label if available, otherwise ID
          date,
          avgDuration: Math.round(stats.totalDuration / stats.total), // Round to whole number
          failureRate: Math.round((stats.failures / stats.total) * 100), // Round to whole number
          executionCount: stats.total,
        });
      });
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error(
      "Error fetching heatmap data:",
      error instanceof Error ? error.message : String(error)
    );
    return NextResponse.json(
      { error: "Failed to fetch heatmap data" },
      { status: 500 }
    );
  }
}
