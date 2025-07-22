/**
 * Execution Repository
 *
 * This repository provides database operations for workflow executions.
 * It handles execution tracking, node execution, and execution logs.
 */

import {
  Prisma,
  WorkflowExecution,
  NodeExecution,
  ExecutionLog,
  WorkflowStatus,
  NodeLog,
} from "@prisma/client";
import { BaseRepository } from "./base.repository";

// Type definitions for execution operations
export type ExecutionCreateInput = Prisma.WorkflowExecutionCreateInput;
export type ExecutionUpdateInput = Prisma.WorkflowExecutionUpdateInput;
export type ExecutionWithNodes = WorkflowExecution & {
  nodeExecutions: NodeExecution[];
  executionLogs: ExecutionLog[];
};

export class ExecutionRepository extends BaseRepository<
  WorkflowExecution,
  ExecutionCreateInput,
  ExecutionUpdateInput
> {
  protected tableName = "workflow_executions";
  protected model = this.prisma.workflowExecution;

  /**
   * Find executions by workflow ID
   * @param workflowId The workflow ID
   * @param limit The maximum number of executions to return
   * @returns An array of executions
   */
  async findByWorkflowId(
    workflowId: string,
    limit = 10
  ): Promise<WorkflowExecution[]> {
    return this.prisma.workflowExecution.findMany({
      where: { workflowId },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });
  }

  /**
   * Find executions by user ID
   * @param userId The user ID
   * @param limit The maximum number of executions to return
   * @returns An array of executions
   */
  async findByUserId(userId: string, limit = 10): Promise<WorkflowExecution[]> {
    return this.prisma.workflowExecution.findMany({
      where: { userId },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      include: {
        workflow: {
          select: {
            name: true,
          },
        },
      },
    });
  }

  /**
   * Find an execution with its node executions and logs
   * @param id The execution ID
   * @returns The execution with nodes and logs or null
   */
  async findWithNodesAndLogs(id: string): Promise<ExecutionWithNodes | null> {
    return this.prisma.workflowExecution.findUnique({
      where: { id },
      include: {
        nodeExecutions: {
          orderBy: {
            startedAt: "asc",
          },
        },
        executionLogs: {
          orderBy: {
            timestamp: "asc",
          },
        },
      },
    });
  }

  /**
   * Create a new execution
   * @param workflowId The workflow ID
   * @param userId The user ID
   * @param input Optional input data
   * @param triggerType Optional trigger type
   * @returns The created execution
   */
  async createExecution(
    workflowId: string,
    userId: string,
    input?: any,
    triggerType?: string
  ): Promise<WorkflowExecution> {
    return this.prisma.workflowExecution.create({
      data: {
        workflow: {
          connect: { id: workflowId },
        },
        user: {
          connect: { id: userId },
        },
        status: WorkflowStatus.pending,
        input: input || {},
        triggerType,
        startedAt: new Date(),
      },
    });
  }

  /**
   * Update execution status
   * @param id The execution ID
   * @param status The new status
   * @param error Optional error message
   * @returns The updated execution
   */
  async updateStatus(
    id: string,
    status: WorkflowStatus,
    error?: string
  ): Promise<WorkflowExecution> {
    const data: ExecutionUpdateInput = {
      status,
      updatedAt: new Date(),
    };

    if (
      status === WorkflowStatus.completed ||
      status === WorkflowStatus.failed
    ) {
      data.finishedAt = new Date();
    }

    if (error) {
      data.error = error;
    }

    return this.prisma.workflowExecution.update({
      where: { id },
      data,
    });
  }

  /**
   * Add a log to an execution
   * @param executionId The execution ID
   * @param level The log level
   * @param message The log message
   * @param metadata Optional metadata
   * @returns The created log
   */
  async addLog(
    executionId: string,
    level: "info" | "error" | "warn",
    message: string,
    metadata?: any
  ): Promise<ExecutionLog> {
    return this.prisma.executionLog.create({
      data: {
        execution: {
          connect: { id: executionId },
        },
        level,
        message,
        metadata: metadata || {},
        timestamp: new Date(),
      },
    });
  }

  /**
   * Add a log to a specific node execution
   * @param executionId The execution ID
   * @param nodeId The node ID
   * @param level The log level
   * @param message The log message
   * @param metadata Optional metadata
   * @returns The created node log
   */
  async addNodeLog(
    executionId: string,
    nodeId: string,
    level: "info" | "error" | "warn",
    message: string,
    metadata?: any
  ): Promise<NodeLog> {
    // First, find the node execution
    let nodeExecution = await this.prisma.nodeExecution.findUnique({
      where: {
        executionId_nodeId: {
          executionId,
          nodeId,
        },
      },
    });

    if (!nodeExecution) {
      // CRITICAL FIX: Create node execution record if it doesn't exist
      // This can happen when logs are created before the node execution record
      try {
        nodeExecution = await this.prisma.nodeExecution.create({
          data: {
            execution: {
              connect: { id: executionId },
            },
            nodeId,
            status: "pending",
            startedAt: new Date(),
          },
        });
      } catch (createError) {
        throw new Error(
          `Failed to create node execution for execution ${executionId} and node ${nodeId}: ${createError instanceof Error ? createError.message : String(createError)}`
        );
      }
    }

    return this.prisma.nodeLog.create({
      data: {
        nodeExecution: {
          connect: { id: nodeExecution.id },
        },
        level,
        message,
        metadata: metadata || {},
      },
    });
  }

  /**
   * Find node execution by execution ID and node ID
   * @param executionId The execution ID
   * @param nodeId The node ID
   * @returns The node execution or null if not found
   */
  async findNodeExecutionByExecutionAndNode(
    executionId: string,
    nodeId: string
  ): Promise<NodeExecution | null> {
    return this.prisma.nodeExecution.findUnique({
      where: {
        executionId_nodeId: {
          executionId,
          nodeId,
        },
      },
    });
  }

  /**
   * Create a node execution
   * @param executionId The execution ID
   * @param nodeId The node ID
   * @returns The created node execution
   */
  async createNodeExecution(
    executionId: string,
    nodeId: string
  ): Promise<NodeExecution> {
    return this.prisma.nodeExecution.create({
      data: {
        execution: {
          connect: { id: executionId },
        },
        nodeId,
        status: "pending",
        startedAt: new Date(),
        completedAt: new Date(), // Will be updated when completed
      },
    });
  }

  /**
   * Update node execution status
   * @param id The node execution ID
   * @param status The new status
   * @param output Optional output data
   * @param error Optional error message
   * @returns The updated node execution
   */
  async updateNodeStatus(
    id: string,
    status: string,
    output?: any,
    error?: string
  ): Promise<NodeExecution> {
    const now = new Date();
    const data: Prisma.NodeExecutionUpdateInput = {
      status,
      updatedAt: now,
    };

    if (status === "completed" || status === "failed") {
      data.finishedAt = now;
      data.completedAt = now;

      // Calculate duration in milliseconds
      const nodeExecution = await this.prisma.nodeExecution.findUnique({
        where: { id },
        select: { startedAt: true },
      });

      if (nodeExecution) {
        const startTime = new Date(nodeExecution.startedAt).getTime();
        const endTime = now.getTime();
        data.durationMs = endTime - startTime;
      }
    }

    if (output) {
      data.output = output;
      data.outputData = output;
    }

    if (error) {
      data.error = error;
    }

    return this.prisma.nodeExecution.update({
      where: { id },
      data,
    });
  }

  /**
   * Get pending executions
   * @param limit The maximum number of executions to return
   * @returns An array of pending executions
   */
  async getPendingExecutions(limit = 10): Promise<WorkflowExecution[]> {
    return this.prisma.workflowExecution.findMany({
      where: {
        status: WorkflowStatus.pending,
      },
      orderBy: {
        createdAt: "asc",
      },
      take: limit,
    });
  }

  /**
   * Lock an execution for processing
   * @param id The execution ID
   * @param workerId The worker ID
   * @returns The locked execution
   */
  async lockExecution(
    id: string,
    workerId: string
  ): Promise<WorkflowExecution> {
    return this.prisma.workflowExecution.update({
      where: { id },
      data: {
        status: WorkflowStatus.running,
        lockedBy: workerId,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Set execution result
   * @param id The execution ID
   * @param result The execution result
   * @returns The updated execution
   */
  async setResult(id: string, result: any): Promise<WorkflowExecution> {
    return this.prisma.workflowExecution.update({
      where: { id },
      data: {
        output: result,
        updatedAt: new Date(),
      },
    });
  }
}
