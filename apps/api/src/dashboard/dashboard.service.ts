import { Injectable } from "@nestjs/common";
import { ExecutionRepository, WorkflowRepository } from "@zzyra/database";
import type { WorkflowExecution } from "@zzyra/database";

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly executionRepository: ExecutionRepository,
    private readonly workflowRepository: WorkflowRepository
  ) {}

  async getMetrics(userId: string) {
    const now = new Date();
    const oneWeekAgo = new Date(now);
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const twoWeeksAgo = new Date(oneWeekAgo);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 7);

    // Get all executions for the user (limit to a reasonable number for dashboard)
    const allExecutions: WorkflowExecution[] =
      await this.executionRepository.findByUserId(userId, 1000);
    const executionsLastWeek: WorkflowExecution[] = allExecutions.filter(
      (e: WorkflowExecution) =>
        e.startedAt &&
        new Date(e.startedAt as unknown as string) >= oneWeekAgo &&
        new Date(e.startedAt as unknown as string) <= now
    );
    const executionsPrevWeek: WorkflowExecution[] = allExecutions.filter(
      (e: WorkflowExecution) =>
        e.startedAt &&
        new Date(e.startedAt as unknown as string) >= twoWeeksAgo &&
        new Date(e.startedAt as unknown as string) < oneWeekAgo
    );

    // Get user workflows
    const workflows = await this.workflowRepository.findByUserId(userId);

    // Active workflows: workflows with executions in the last week
    const workflowIdsWithExecutions = new Set(
      executionsLastWeek.map((e: WorkflowExecution) => e.workflowId)
    );
    const activeWorkflows = workflowIdsWithExecutions.size;
    const totalWorkflows = workflows.length;

    // Success rate and totals for last week
    const successfulExecutions = executionsLastWeek.filter(
      (e: WorkflowExecution) => e.status === "completed"
    ).length;
    const failedExecutions = executionsLastWeek.filter(
      (e: WorkflowExecution) => e.status === "failed"
    ).length;
    const runningExecutions = executionsLastWeek.filter(
      (e: WorkflowExecution) => e.status === "running"
    ).length;
    const totalExecutions = executionsLastWeek.length;
    const successRate =
      totalExecutions > 0
        ? Math.round((successfulExecutions / totalExecutions) * 10000) / 100
        : 0;

    // Average duration for completed executions last week
    let totalDurationMs = 0;
    let completedWithDuration = 0;
    for (const exec of executionsLastWeek) {
      if (exec.status === "completed" && exec.startedAt && exec.finishedAt) {
        const duration =
          new Date(
            (exec.finishedAt as unknown as Date).toISOString()
          ).getTime() -
          new Date((exec.startedAt as unknown as Date).toISOString()).getTime();
        totalDurationMs += duration;
        completedWithDuration++;
      }
    }
    const avgDurationMs =
      completedWithDuration > 0
        ? Math.round(totalDurationMs / completedWithDuration)
        : 0;

    // Previous week metrics
    const prevSuccessfulExecutions = executionsPrevWeek.filter(
      (e: WorkflowExecution) => e.status === "completed"
    ).length;
    const prevTotalExecutions = executionsPrevWeek.length;
    const prevSuccessRate =
      prevTotalExecutions > 0
        ? Math.round((prevSuccessfulExecutions / prevTotalExecutions) * 10000) /
          100
        : 0;
    let prevTotalDurationMs = 0;
    let prevCompletedWithDuration = 0;
    for (const exec of executionsPrevWeek) {
      if (exec.status === "completed" && exec.startedAt && exec.finishedAt) {
        const duration =
          new Date(
            (exec.finishedAt as unknown as Date).toISOString()
          ).getTime() -
          new Date((exec.startedAt as unknown as Date).toISOString()).getTime();
        prevTotalDurationMs += duration;
        prevCompletedWithDuration++;
      }
    }
    const prevAvgDurationMs =
      prevCompletedWithDuration > 0
        ? Math.round(prevTotalDurationMs / prevCompletedWithDuration)
        : 0;

    // Calculate changes from last week
    const executionChange =
      prevTotalExecutions > 0
        ? Math.round(
            ((totalExecutions - prevTotalExecutions) / prevTotalExecutions) *
              100
          )
        : 0;
    const durationChange =
      prevAvgDurationMs > 0
        ? Math.round(
            ((avgDurationMs - prevAvgDurationMs) / prevAvgDurationMs) * 100
          )
        : 0;
    const successRateChange =
      prevSuccessRate > 0
        ? Math.round((successRate - prevSuccessRate) * 100) / 100
        : 0;

    return {
      successRate,
      totalExecutions,
      averageDuration: formatDuration(avgDurationMs),
      rawAverageDurationMs: avgDurationMs,
      activeWorkflows: totalWorkflows, // Use total workflows instead of just active ones
      changeFromLastWeek: {
        successRate: successRateChange,
        totalExecutions: executionChange,
        averageDuration: durationChange,
      },
    };
  }
}
