import { NextResponse } from "next/server";
import prisma from "@zyra/database/src/client";

type DailyStatsItem = {
  date: string;
  total: number;
  success: number;
  failed: number;
  avgDuration: number;
  totalDuration: number;
  successRate?: number;
  failureRate?: number;
};

type WorkflowExecutionWithNodes = {
  id: string;
  status: string;
  startedAt: Date;
  finishedAt: Date | null;
  error: string | null;
  nodeExecutions: { status: string }[];
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
    // Get execution counts grouped by date and status
    const executions = await prisma.WorkflowExecution.findMany({
      where: {
        workflowId: workflowId,
        startedAt: {
          gte: since,
        },
      },
      select: {
        id: true,
        status: true,
        startedAt: true,
        finishedAt: true,
        error: true,
        nodeExecutions: {
          select: {
            status: true,
          },
        },
      },
      orderBy: {
        startedAt: 'asc',
      },
    });

    // Group by date and calculate metrics
    const dailyStats: Record<string, DailyStatsItem> = {};
    executions.forEach((exec: WorkflowExecutionWithNodes) => {
      const date = exec.startedAt.toISOString().split("T")[0];
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
      if (exec.finishedAt) {
        const duration = exec.finishedAt.getTime() - exec.startedAt.getTime();
        dailyStats[date].totalDuration += duration;
      }
    });

    // Calculate averages and format response
    const result = Object.values(dailyStats).map((day: DailyStatsItem) => ({
      ...day,
      successRate: day.total > 0 ? (day.success / day.total) * 100 : 0,
      failureRate: day.total > 0 ? (day.failed / day.total) * 100 : 0,
      avgDuration: day.total > 0 ? day.totalDuration / day.total : 0,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error fetching execution trends:", error);
    return NextResponse.json(
      { error: "Failed to fetch execution trends" },
      { status: 500 }
    );
  }
}
