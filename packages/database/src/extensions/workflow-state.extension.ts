import { Prisma } from "@prisma/client";

// Event types for workflow state transitions
export interface StateTransitionEvent {
  workflowId: string;
  executionId: string;
  fromStatus: string | null;
  toStatus: string;
  timestamp: Date;
  metadata?: any;
  userId: string;
}

export interface WorkflowStateConfig {
  enabled: boolean;
  updateStatistics: boolean;
  trackTransitions: boolean;
  createSnapshots: boolean;
  snapshotInterval: number; // minutes
  retryOnFailure: boolean;
  maxRetries: number;
  autoArchiveAfter: number; // days
}

export interface StateEventHandler {
  onExecutionStarted?: (event: StateTransitionEvent) => Promise<void>;
  onExecutionCompleted?: (event: StateTransitionEvent) => Promise<void>;
  onExecutionFailed?: (event: StateTransitionEvent) => Promise<void>;
  onWorkflowActivated?: (event: StateTransitionEvent) => Promise<void>;
  onWorkflowDeactivated?: (event: StateTransitionEvent) => Promise<void>;
}

const defaultConfig: WorkflowStateConfig = {
  enabled: true,
  updateStatistics: true,
  trackTransitions: true,
  createSnapshots: false,
  snapshotInterval: 60, // 1 hour
  retryOnFailure: true,
  maxRetries: 3,
  autoArchiveAfter: 30, // 30 days
};

/**
 * Workflow State Management Extension
 *
 * Tracks workflow execution states, statistics, and transitions
 */
export function createWorkflowStateExtension(
  config: Partial<WorkflowStateConfig> = {},
  eventHandler?: StateEventHandler
) {
  const finalConfig = { ...defaultConfig, ...config };

  return Prisma.defineExtension({
    name: "WorkflowState",
    query: {
      // Handle workflow execution state changes
      workflowExecution: {
        async create({ args, query }) {
          const result = await query(args);

          if (finalConfig.enabled && eventHandler?.onExecutionStarted) {
            try {
              await eventHandler.onExecutionStarted({
                workflowId: result.workflowId || "",
                executionId: result.id || "",
                fromStatus: null,
                toStatus: "pending",
                timestamp: new Date(),
                userId: result.userId || "",
              });
            } catch (error) {
              console.warn("Failed to emit execution started event:", error);
            }
          }

          return result;
        },

        async update({ args, query }) {
          const result = await query(args);

          if (finalConfig.enabled) {
            try {
              // Track state transitions
              if (
                finalConfig.trackTransitions &&
                args.data &&
                "status" in args.data
              ) {
                const event: StateTransitionEvent = {
                  workflowId: result.workflowId || "",
                  executionId: result.id || "",
                  fromStatus: null, // We don't have the previous status
                  toStatus: String(args.data.status),
                  timestamp: new Date(),
                  userId: result.userId || "",
                };

                // Emit appropriate events
                if (
                  args.data.status === "completed" &&
                  eventHandler?.onExecutionCompleted
                ) {
                  await eventHandler.onExecutionCompleted(event);
                } else if (
                  args.data.status === "failed" &&
                  eventHandler?.onExecutionFailed
                ) {
                  await eventHandler.onExecutionFailed(event);
                }
              }

              // Calculate and log execution duration
              if (result.finishedAt && result.startedAt) {
                const startTime = new Date(result.startedAt as any).getTime();
                const finishTime = new Date(result.finishedAt as any).getTime();
                const duration = finishTime - startTime;
                console.log(
                  `Execution ${result.id} completed in ${duration}ms`
                );
              }
            } catch (error) {
              console.warn("Failed to handle execution state change:", error);
            }
          }

          return result;
        },
      },

      // Handle workflow state changes
      workflow: {
        async update({ args, query }) {
          const result = await query(args);

          if (finalConfig.enabled && eventHandler) {
            try {
              // Handle workflow activation/deactivation
              if (args.data && "isPublic" in args.data) {
                console.log(`Workflow ${result.id} visibility changed`);

                if (eventHandler.onWorkflowActivated) {
                  await eventHandler.onWorkflowActivated({
                    workflowId: result.id || "",
                    executionId: "",
                    fromStatus: null,
                    toStatus: "updated",
                    timestamp: new Date(),
                    userId: result.userId || "",
                  });
                }
              }
            } catch (error) {
              console.warn("Failed to handle workflow state change:", error);
            }
          }

          return result;
        },
      },
    },
  });
}

/**
 * Calculate workflow statistics
 */
async function calculateWorkflowStats(prisma: any, workflowId: string) {
  const executions = await prisma.workflowExecution.findMany({
    where: { workflowId },
    select: {
      status: true,
      startedAt: true,
      finishedAt: true,
    },
  });

  const totalExecutions = executions.length;
  const completed = executions.filter(
    (e: any) => e.status === "completed"
  ).length;
  const failed = executions.filter((e: any) => e.status === "failed").length;
  const pending = executions.filter((e: any) => e.status === "pending").length;
  const running = executions.filter((e: any) => e.status === "running").length;

  const successfulExecutions = completed;
  const failedExecutions = failed;
  const successRate =
    totalExecutions > 0 ? (successfulExecutions / totalExecutions) * 100 : 0;

  // Calculate average execution time for completed executions
  const completedExecutions = executions.filter(
    (e: any) => e.finishedAt && e.startedAt
  );
  let averageExecutionTime = 0;
  if (completedExecutions.length > 0) {
    const durations = completedExecutions.map(
      (e: any) =>
        new Date(e.finishedAt).getTime() - new Date(e.startedAt).getTime()
    );
    averageExecutionTime =
      durations.reduce((a: number, b: number) => a + b, 0) / durations.length;
  }

  const lastExecutionAt =
    executions.length > 0
      ? executions.reduce(
          (latest: any, execution: any) =>
            execution.startedAt > latest ? execution.startedAt : latest,
          executions[0].startedAt
        )
      : null;

  // Count by status for statistics
  executions.forEach((execution: any) => {
    // Additional processing can be added here
  });

  return {
    totalExecutions,
    successfulExecutions,
    failedExecutions,
    successRate,
    lastExecutionAt,
    averageExecutionTime,
    pending,
    running,
    completed,
    failed,
  };
}

/**
 * Create workflow state snapshots
 */
async function createWorkflowSnapshot(prisma: any, workflowId: string) {
  try {
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        executions: {
          take: 10,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (workflow) {
      const stats = await calculateWorkflowStats(prisma, workflowId);

      await prisma.workflowStateSnapshot.create({
        data: {
          workflowId,
          snapshotData: {
            workflow: {
              id: workflow.id,
              name: workflow.name,
              status: "active", // Default since no status field exists
              executions: workflow.executions.length,
            },
            statistics: stats,
            timestamp: new Date(),
          },
        },
      });
    }
  } catch (error) {
    console.warn(
      `Failed to create snapshot for workflow ${workflowId}:`,
      error
    );
  }
}

/**
 * Auto-archive old executions
 */
async function autoArchiveExecutions(prisma: any, daysToKeep: number) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  try {
    const archivedCount = await prisma.workflowExecution.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate,
        },
        status: {
          in: ["completed", "failed"],
        },
      },
    });

    console.log(`Archived ${archivedCount.count} old workflow executions`);
    return archivedCount.count;
  } catch (error) {
    console.warn("Failed to archive old executions:", error);
    return 0;
  }
}

/**
 * Workflow State Management Utilities
 */
export const createWorkflowStateUtils = () => {
  return {
    // Calculate statistics for a workflow
    calculateStats: calculateWorkflowStats,

    // Create a snapshot of workflow state
    createSnapshot: createWorkflowSnapshot,

    // Archive old executions
    archiveOldExecutions: autoArchiveExecutions,

    // Get workflow health score
    getHealthScore: async (prisma: any, workflowId: string) => {
      const stats = await calculateWorkflowStats(prisma, workflowId);

      // Simple health score based on success rate and recent activity
      let score = stats.successRate;

      // Boost score for recent activity
      if (stats.lastExecutionAt) {
        const daysSinceLastExecution =
          (Date.now() - new Date(stats.lastExecutionAt).getTime()) /
          (1000 * 60 * 60 * 24);
        if (daysSinceLastExecution < 1) score += 10;
        else if (daysSinceLastExecution < 7) score += 5;
      }

      return Math.min(100, Math.max(0, score));
    },

    // Get execution trends
    getExecutionTrends: async (
      prisma: any,
      workflowId: string,
      days: number = 7
    ) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const executions = await prisma.workflowExecution.findMany({
        where: {
          workflowId,
          createdAt: {
            gte: startDate,
          },
        },
        select: {
          status: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      // Group by day
      const trends = executions.reduce((acc: any, execution: any) => {
        const day = execution.createdAt.toISOString().split("T")[0];
        if (!acc[day]) {
          acc[day] = { total: 0, completed: 0, failed: 0 };
        }
        acc[day].total++;
        if (execution.status === "completed") acc[day].completed++;
        if (execution.status === "failed") acc[day].failed++;
        return acc;
      }, {});

      return trends;
    },
  };
};
