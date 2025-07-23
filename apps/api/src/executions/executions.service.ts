import { Injectable, NotFoundException } from "@nestjs/common";
import { ExecutionRepository } from "@zyra/database";
import { CreateExecutionDto, UpdateExecutionDto } from "./dto/execution.dto";

@Injectable()
export class ExecutionsService {
  constructor(private readonly executionRepository: ExecutionRepository) {}

  async findAll(userId: string, limit = 10): Promise<any[]> {
    const executions = await this.executionRepository.findByUserId(
      userId,
      limit
    );

    // For each execution, fetch complete data including logs and nodes
    const executionsWithData = await Promise.all(
      executions.map(async (execution: any) => {
        try {
          const completeExecution =
            await this.executionRepository.findWithNodesAndLogs(execution.id);
          if (completeExecution) {
            return {
              ...execution,
              logs: completeExecution.executionLogs || [],
              nodeExecutions: completeExecution.nodeExecutions || [],
              executionLogs: completeExecution.executionLogs || [],
              nodeInputs:
                completeExecution.nodeExecutions?.reduce(
                  (acc: any, nodeExec: any) => {
                    if (nodeExec.nodeInputs && nodeExec.nodeInputs.length > 0) {
                      acc[nodeExec.nodeId] = nodeExec.nodeInputs.map(
                        (input: any) => ({
                          id: input.id,
                          input_data: input.inputData,
                          created_at: input.createdAt,
                        })
                      );
                    }
                    return acc;
                  },
                  {}
                ) || {},
              nodeOutputs:
                completeExecution.nodeExecutions?.reduce(
                  (acc: any, nodeExec: any) => {
                    if (
                      nodeExec.nodeOutputs &&
                      nodeExec.nodeOutputs.length > 0
                    ) {
                      acc[nodeExec.nodeId] = nodeExec.nodeOutputs.map(
                        (output: any) => ({
                          id: output.id,
                          output_data: output.outputData,
                          created_at: output.createdAt,
                        })
                      );
                    }
                    return acc;
                  },
                  {}
                ) || {},
            };
          }
          return execution;
        } catch (error) {
          console.error(
            `Failed to fetch complete data for execution ${execution.id}:`,
            error
          );
          return execution;
        }
      })
    );

    return executionsWithData;
  }

  async findOne(id: string, userId?: string): Promise<any> {
    try {
      const execution = await this.executionRepository.findWithNodesAndLogs(id);

      if (!execution) {
        throw new Error("Execution not found");
      }

      // Check if user has access to this execution (if userId provided)
      if (userId && execution.userId !== userId) {
        throw new Error("Access denied");
      }

      return execution;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to get execution: ${errorMessage}`);
    }
  }

  async findOnePublic(id: string): Promise<any> {
    try {
      const execution = await this.executionRepository.findWithNodesAndLogs(id);

      if (!execution) {
        throw new Error("Execution not found");
      }

      // The findWithNodesAndLogs method already includes all the data we need
      // Transform the data to match the expected format
      const transformedExecution = {
        ...execution,
        nodeExecutions:
          execution.nodeExecutions?.map((nodeExec: any) => ({
            id: nodeExec.id,
            execution_id: nodeExec.executionId,
            node_id: nodeExec.nodeId,
            status: nodeExec.status,
            started_at: nodeExec.startedAt,
            completed_at: nodeExec.completedAt,
            finished_at: nodeExec.finishedAt,
            error: nodeExec.error,
            output_data: nodeExec.outputData,
            duration_ms: nodeExec.durationMs,
            retry_count: nodeExec.retryCount,
            logs:
              nodeExec.logs?.map((log: any) => ({
                id: log.id,
                nodeExecutionId: log.nodeExecutionId,
                level: log.level,
                message: log.message,
                metadata: log.metadata,
                timestamp: log.createdAt,
              })) || [],
          })) || [],
        executionLogs:
          execution.executionLogs?.map((log: any) => ({
            id: log.id,
            execution_id: log.executionId,
            level: log.level,
            message: log.message,
            timestamp: log.timestamp,
            metadata: log.metadata,
          })) || [],
        nodeInputs:
          execution.nodeExecutions?.reduce((acc: any, nodeExec: any) => {
            if (nodeExec.nodeInputs && nodeExec.nodeInputs.length > 0) {
              acc[nodeExec.nodeId] = nodeExec.nodeInputs.map((input: any) => ({
                id: input.id,
                input_data: input.inputData,
                created_at: input.createdAt,
              }));
            }
            return acc;
          }, {}) || {},
        nodeOutputs:
          execution.nodeExecutions?.reduce((acc: any, nodeExec: any) => {
            if (nodeExec.nodeOutputs && nodeExec.nodeOutputs.length > 0) {
              acc[nodeExec.nodeId] = nodeExec.nodeOutputs.map(
                (output: any) => ({
                  id: output.id,
                  output_data: output.outputData,
                  created_at: output.createdAt,
                })
              );
            }
            return acc;
          }, {}) || {},
      };

      return transformedExecution;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to get execution: ${errorMessage}`);
    }
  }

  async findOneComplete(id: string, userId?: string): Promise<any> {
    try {
      const execution = await this.executionRepository.findWithNodesAndLogs(id);

      if (!execution) {
        throw new Error("Execution not found");
      }

      // Check if user has access to this execution (if userId provided)
      if (userId && execution.userId !== userId) {
        throw new Error("Access denied");
      }

      // The findWithNodesAndLogs method already includes all the data we need
      // Transform the data to match the expected format
      const transformedExecution = {
        ...execution,
        nodeExecutions:
          execution.nodeExecutions?.map((nodeExec: any) => ({
            id: nodeExec.id,
            execution_id: nodeExec.executionId,
            node_id: nodeExec.nodeId,
            status: nodeExec.status,
            started_at: nodeExec.startedAt,
            completed_at: nodeExec.completedAt,
            finished_at: nodeExec.finishedAt,
            error: nodeExec.error,
            output_data: nodeExec.outputData,
            duration_ms: nodeExec.durationMs,
            retry_count: nodeExec.retryCount,
            logs:
              nodeExec.logs?.map((log: any) => ({
                id: log.id,
                nodeExecutionId: log.nodeExecutionId,
                level: log.level,
                message: log.message,
                metadata: log.metadata,
                timestamp: log.createdAt,
              })) || [],
          })) || [],
        executionLogs:
          execution.executionLogs?.map((log: any) => ({
            id: log.id,
            execution_id: log.executionId,
            level: log.level,
            message: log.message,
            timestamp: log.timestamp,
            metadata: log.metadata,
          })) || [],
        nodeInputs:
          execution.nodeExecutions?.reduce((acc: any, nodeExec: any) => {
            if (nodeExec.nodeInputs && nodeExec.nodeInputs.length > 0) {
              acc[nodeExec.nodeId] = nodeExec.nodeInputs.map((input: any) => ({
                id: input.id,
                input_data: input.inputData,
                created_at: input.createdAt,
              }));
            }
            return acc;
          }, {}) || {},
        nodeOutputs:
          execution.nodeExecutions?.reduce((acc: any, nodeExec: any) => {
            if (nodeExec.nodeOutputs && nodeExec.nodeOutputs.length > 0) {
              acc[nodeExec.nodeId] = nodeExec.nodeOutputs.map(
                (output: any) => ({
                  id: output.id,
                  output_data: output.outputData,
                  created_at: output.createdAt,
                })
              );
            }
            return acc;
          }, {}) || {},
      };

      return transformedExecution;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to get execution: ${errorMessage}`);
    }
  }

  async create(
    createExecutionDto: CreateExecutionDto,
    userId: string
  ): Promise<any> {
    return this.executionRepository.createExecution(
      createExecutionDto.workflowId,
      userId,
      createExecutionDto.input,
      createExecutionDto.triggerType
    );
  }

  async update(
    id: string,
    updateExecutionDto: UpdateExecutionDto,
    userId?: string
  ): Promise<any> {
    // Verify execution exists and user has access
    const execution = await this.findOne(id, userId);

    if (updateExecutionDto.status) {
      return this.executionRepository.updateStatus(
        id,
        updateExecutionDto.status as any,
        updateExecutionDto.error
      );
    }

    // Convert the string status to the expected enum type
    const updateData = {
      ...updateExecutionDto,
      status: updateExecutionDto.status as any, // Type assertion to handle the enum conversion
    };
    return this.executionRepository.update(id, updateData);
  }

  async cancel(id: string, userId?: string): Promise<any> {
    await this.findOne(id, userId); // Verify access
    return this.executionRepository.updateStatus(id, "cancelled");
  }

  async pause(id: string, userId?: string): Promise<any> {
    await this.findOne(id, userId); // Verify access
    return this.executionRepository.updateStatus(id, "paused" as any);
  }

  async resume(id: string, userId?: string): Promise<any> {
    await this.findOne(id, userId); // Verify access
    return this.executionRepository.updateStatus(id, "running" as any);
  }

  async retry(id: string, userId?: string): Promise<any> {
    await this.findOne(id, userId); // Verify access
    return this.executionRepository.updateStatus(id, "pending" as any);
  }

  async getStats(userId?: string, workflowId?: string) {
    // Get recent executions for stats
    let executions = userId
      ? await this.executionRepository.findByUserId(userId, 100)
      : await this.executionRepository.findMany({ take: 100 });

    // Filter by workflowId if provided
    if (workflowId) {
      executions = executions.filter((exec) => exec.workflowId === workflowId);
    }

    const total = executions.length;
    const completed = executions.filter((e) => e.status === "completed").length;
    const failed = executions.filter((e) => e.status === "failed").length;
    const running = executions.filter((e) => e.status === "running").length;
    const pending = executions.filter((e) => e.status === "pending").length;

    // Calculate performance metrics for completed executions
    const completedExecutions = executions.filter(
      (e) => e.status === "completed" && e.startedAt && e.finishedAt
    );

    let avgDuration = 0;
    let medianDuration = 0;
    let peakConcurrency = 0;

    if (completedExecutions.length > 0) {
      // Calculate durations in milliseconds
      const durations = completedExecutions.map((exec) => {
        const start = new Date(exec.startedAt!).getTime();
        const end = new Date(exec.finishedAt!).getTime();
        return end - start;
      });

      // Average duration
      avgDuration = Math.round(
        durations.reduce((sum, duration) => sum + duration, 0) /
          durations.length
      );

      // Median duration
      const sortedDurations = durations.sort((a, b) => a - b);
      const mid = Math.floor(sortedDurations.length / 2);
      medianDuration = Math.round(
        sortedDurations.length % 2 === 0
          ? (sortedDurations[mid - 1] + sortedDurations[mid]) / 2
          : sortedDurations[mid]
      );

      // Peak concurrency - count max simultaneous executions
      const timePoints: { time: number; delta: number }[] = [];

      executions.forEach((exec) => {
        if (exec.startedAt) {
          timePoints.push({
            time: new Date(exec.startedAt).getTime(),
            delta: 1,
          });
        }
        if (exec.finishedAt) {
          timePoints.push({
            time: new Date(exec.finishedAt).getTime(),
            delta: -1,
          });
        }
      });

      // Sort by time and calculate peak concurrency
      timePoints.sort((a, b) => a.time - b.time);
      let currentConcurrency = 0;
      timePoints.forEach((point) => {
        currentConcurrency += point.delta;
        peakConcurrency = Math.max(peakConcurrency, currentConcurrency);
      });
    }

    return {
      // Performance metrics for frontend
      avgDuration,
      medianDuration,
      peakConcurrency,
      // Traditional stats for other uses
      total,
      completed,
      failed,
      running,
      pending,
      success_rate: total > 0 ? (completed / total) * 100 : 0,
    };
  }

  async getTrends(userId?: string, days = 7, workflowId?: string) {
    let executions = userId
      ? await this.executionRepository.findByUserId(userId, 1000) // Get more data for trends
      : await this.executionRepository.findMany({ take: 1000 });

    // Filter by workflowId if provided
    if (workflowId) {
      executions = executions.filter((exec) => exec.workflowId === workflowId);
    }

    // Group executions by day
    const trendsMap = new Map<string, { total: number; successful: number }>();

    // Initialize all days with zero counts
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split("T")[0];
      trendsMap.set(dateKey, { total: 0, successful: 0 });
    }

    // Count executions by day
    executions.forEach((execution) => {
      if (execution.startedAt) {
        const dateKey = execution.startedAt.toISOString().split("T")[0];
        if (trendsMap.has(dateKey)) {
          const dayData = trendsMap.get(dateKey)!;
          dayData.total++;
          if (execution.status === "completed") {
            dayData.successful++;
          }
        }
      }
    });

    // Convert to array format expected by frontend
    const trends = Array.from(trendsMap.entries())
      .map(([date, data]) => ({
        timestamp: date,
        count: data.total,
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

    return trends;
  }

  async getHeatmap(userId?: string, workflowId?: string) {
    let executions = userId
      ? await this.executionRepository.findByUserId(userId, 1000)
      : await this.executionRepository.findMany({ take: 1000 });

    // Filter by workflowId if provided
    if (workflowId) {
      executions = executions.filter((exec) => exec.workflowId === workflowId);
    }

    // For now, create a simplified heatmap based on daily execution patterns
    // In a real implementation, this would analyze node-level performance data
    const heatmapMap = new Map<
      string,
      {
        executions: number;
        completedExecutions: number;
        totalDuration: number;
        completedWithDuration: number;
      }
    >();

    // Group executions by date
    executions.forEach((execution) => {
      if (execution.startedAt) {
        const dateKey = execution.startedAt.toISOString().split("T")[0];

        if (!heatmapMap.has(dateKey)) {
          heatmapMap.set(dateKey, {
            executions: 0,
            completedExecutions: 0,
            totalDuration: 0,
            completedWithDuration: 0,
          });
        }

        const dayData = heatmapMap.get(dateKey)!;
        dayData.executions++;

        if (execution.status === "completed") {
          dayData.completedExecutions++;

          if (execution.startedAt && execution.finishedAt) {
            const duration =
              new Date(execution.finishedAt).getTime() -
              new Date(execution.startedAt).getTime();
            dayData.totalDuration += duration;
            dayData.completedWithDuration++;
          }
        }
      }
    });

    // Convert to array format expected by frontend
    // Since we don't have actual node data, we'll create a general "workflow" node entry per date
    const heatmap = Array.from(heatmapMap.entries()).map(([date, data]) => ({
      nodeId: "workflow", // Generic node ID since we don't have node-level data
      date,
      avgDuration:
        data.completedWithDuration > 0
          ? Math.round(data.totalDuration / data.completedWithDuration)
          : 0,
      failureRate:
        data.executions > 0
          ? Math.round(
              ((data.executions - data.completedExecutions) / data.executions) *
                100
            )
          : 0,
      executionCount: data.executions, // Add execution count for UI
    }));

    return heatmap;
  }
}
