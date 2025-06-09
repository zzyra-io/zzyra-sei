import { Injectable } from "@nestjs/common";
import { ExecutionRepository, WorkflowRepository } from "@zyra/database";

@Injectable()
export class DashboardService {
  constructor(
    private readonly executionRepository: ExecutionRepository,
    private readonly workflowRepository: WorkflowRepository
  ) {}

  async getMetrics(userId: string) {
    // Get recent executions for the user
    const recentExecutions = await this.executionRepository.findByUserId(
      userId,
      10
    );

    // Get user workflows
    const workflows = await this.workflowRepository.findByUserId(userId);

    // Calculate metrics
    const totalWorkflows = workflows.length;
    const totalExecutions = recentExecutions.length;
    const successfulExecutions = recentExecutions.filter(
      (e) => e.status === "completed"
    ).length;
    const failedExecutions = recentExecutions.filter(
      (e) => e.status === "failed"
    ).length;
    const runningExecutions = recentExecutions.filter(
      (e) => e.status === "running"
    ).length;

    const successRate =
      totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

    return {
      total_workflows: totalWorkflows,
      total_executions: totalExecutions,
      successful_executions: successfulExecutions,
      failed_executions: failedExecutions,
      running_executions: runningExecutions,
      success_rate: Math.round(successRate * 100) / 100,
      recent_executions: recentExecutions.map((execution) => ({
        id: execution.id,
        workflow_id: execution.workflowId,
        status: execution.status,
        started_at: execution.startedAt?.toISOString(),
        finished_at: execution.finishedAt?.toISOString(),
        error: execution.error,
      })),
    };
  }
}
