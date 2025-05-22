import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { WorkflowStatus } from "@prisma/client";

export async function GET() {
  try {
    // Define time periods
    const now = new Date();
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const twoWeeksAgo = new Date(oneWeekAgo);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 7);

    // Get recent executions (last week)
    const recentExecutions = await prisma.workflowExecution.findMany({
      where: {
        startedAt: {
          gte: oneWeekAgo,
          lte: now
        }
      },
      select: {
        id: true,
        status: true,
        startedAt: true,
        updatedAt: true // Use updatedAt instead of completedAt
      }
    });

    // Get previous executions (week before last)
    const previousExecutions = await prisma.workflowExecution.findMany({
      where: {
        startedAt: {
          gte: twoWeeksAgo,
          lt: oneWeekAgo
        }
      },
      select: {
        id: true,
        status: true,
        startedAt: true,
        updatedAt: true // Use updatedAt instead of completedAt
      }
    });

    // Count successful executions
    const successfulExecutions = recentExecutions.filter(
      exec => exec.status === WorkflowStatus.completed
    );

    // Calculate success rate
    const successRate = recentExecutions.length > 0
      ? Math.round((successfulExecutions.length / recentExecutions.length) * 100)
      : 0;

    // Calculate previous week success rate for comparison
    const previousSuccessfulExecutions = previousExecutions.filter(
      exec => exec.status === WorkflowStatus.completed
    );
    
    const previousSuccessRate = previousExecutions.length > 0
      ? Math.round((previousSuccessfulExecutions.length / previousExecutions.length) * 100)
      : 0;

    // Calculate average duration for completed executions
    let totalDurationMs = 0;
    let completedWithDuration = 0;

    for (const exec of successfulExecutions) {
      if (exec.updatedAt && exec.startedAt) {
        const duration = exec.updatedAt.getTime() - exec.startedAt.getTime();
        totalDurationMs += duration;
        completedWithDuration++;
      }
    }

    // Calculate previous week average duration
    let previousTotalDurationMs = 0;
    let previousCompletedWithDuration = 0;

    for (const exec of previousSuccessfulExecutions) {
      if (exec.updatedAt && exec.startedAt) {
        const duration = exec.updatedAt.getTime() - exec.startedAt.getTime();
        previousTotalDurationMs += duration;
        previousCompletedWithDuration++;
      }
    }

    const avgDurationMs = completedWithDuration > 0
      ? Math.round(totalDurationMs / completedWithDuration)
      : 0;

    const previousAvgDurationMs = previousCompletedWithDuration > 0
      ? Math.round(previousTotalDurationMs / previousCompletedWithDuration)
      : 0;

    // Format average duration as "Xm Ys"
    const formatDuration = (ms: number): string => {
      const seconds = Math.floor(ms / 1000);
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    };

    // Get active workflows (workflows with executions in the past week)
    const activeWorkflowsCount = await prisma.workflow.count({
      where: {
        executions: {
          some: {
            startedAt: {
              gte: oneWeekAgo
            }
          }
        }
      }
    });

    // Calculate changes from last week
    const executionChange = previousExecutions.length > 0
      ? Math.round(((recentExecutions.length - previousExecutions.length) / previousExecutions.length) * 100)
      : 0;

    const durationChange = previousAvgDurationMs > 0
      ? Math.round(((avgDurationMs - previousAvgDurationMs) / previousAvgDurationMs) * 100)
      : 0;

    const successRateChange = previousSuccessRate > 0
      ? successRate - previousSuccessRate
      : 0;

    const metrics = {
      successRate,
      totalExecutions: recentExecutions.length,
      averageDuration: formatDuration(avgDurationMs),
      rawAverageDurationMs: avgDurationMs,
      activeWorkflows: activeWorkflowsCount,
      changeFromLastWeek: {
        successRate: successRateChange,
        totalExecutions: executionChange,
        averageDuration: durationChange
      }
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Error fetching dashboard metrics:", error);
    return NextResponse.json(
      { 
        successRate: 0,
        totalExecutions: 0,
        averageDuration: '0m 0s',
        rawAverageDurationMs: 0,
        activeWorkflows: 0
      }, 
      { status: 200 }
    );
  }
}