import { Injectable, Logger } from '@nestjs/common';

import { DatabaseService } from './database.service';

export interface ExecutionStatus {
  executionId: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  currentNodeId?: string;
  progress: {
    totalNodes: number;
    completedNodes: number;
    failedNodes: number;
    currentNode?: {
      id: string;
      type: string;
      label: string;
      status: 'running' | 'completed' | 'failed';
      startTime?: Date;
      endTime?: Date;
      duration?: number;
    };
  };
  startTime: Date;
  endTime?: Date;
  error?: string;
  results?: Record<string, any>;
  logs: ExecutionLog[];
}

export interface ExecutionLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  nodeId?: string;
  metadata?: Record<string, any>;
}

export interface NodeExecutionUpdate {
  executionId: string;
  nodeId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  output?: any;
  error?: string;
  duration?: number;
  progress?: number; // 0-100
  nodeType?: string;
  nodeLabel?: string;
  startTime?: Date;
  endTime?: Date;
}

export interface EdgeFlowUpdate {
  executionId: string;
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  status: 'flowing' | 'completed';
  data?: any;
  timestamp: Date;
}

export interface ExecutionMetrics {
  executionId: string;
  memoryUsage: number; // in MB
  cpuUsage: number; // percentage
  networkRequests: number;
  totalDuration: number; // in ms
  nodeMetrics: Record<
    string,
    {
      duration: number;
      memoryDelta: number;
      outputSize: number;
    }
  >;
}

@Injectable()
export class ExecutionMonitorService {
  private readonly logger = new Logger(ExecutionMonitorService.name);

  // Track active executions
  private activeExecutions = new Map<string, ExecutionStatus>();

  // Track client subscriptions
  private clientSubscriptions = new Map<string, Set<string>>(); // clientId -> executionIds

  // Track workflow definitions for edge animations
  private workflowDefinitions = new Map<
    string,
    { nodes: any[]; edges: any[] }
  >();

  // Track execution metrics
  private executionMetrics = new Map<string, ExecutionMetrics>();

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Start tracking an execution
   */
  async startExecution(
    executionId: string,
    workflowId: string,
    totalNodes: number,
    workflowDefinition?: { nodes: any[]; edges: any[] },
  ) {
    const status: ExecutionStatus = {
      executionId,
      workflowId,
      status: 'running',
      progress: {
        totalNodes,
        completedNodes: 0,
        failedNodes: 0,
      },
      startTime: new Date(),
      logs: [],
    };

    this.activeExecutions.set(executionId, status);

    // Store workflow definition for edge animations
    if (workflowDefinition) {
      this.workflowDefinitions.set(executionId, workflowDefinition);
    }

    // Initialize execution metrics
    const metrics: ExecutionMetrics = {
      executionId,
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // Convert to MB
      cpuUsage: 0,
      networkRequests: 0,
      totalDuration: 0,
      nodeMetrics: {},
    };
    this.executionMetrics.set(executionId, metrics);

    // Log to database
    await this.logExecutionEvent(executionId, 'info', 'Execution started', {
      workflowId,
      totalNodes,
    });

    this.logger.log(`Started tracking execution ${executionId}`);
  }

  /**
   * Update node execution status with enhanced data tracking
   */
  async updateNodeExecution(update: NodeExecutionUpdate) {
    const {
      executionId,
      nodeId,
      status,
      output,
      error,
      duration,
      nodeType,
      nodeLabel,
      progress,
      startTime,
      endTime,
    } = update;

    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      this.logger.warn(`Execution ${executionId} not found for node update`);
      return;
    }

    // Update metrics for the node with enhanced tracking
    const metrics = this.executionMetrics.get(executionId);
    if (metrics && duration) {
      const outputSize = output ? JSON.stringify(output).length : 0;
      const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB

      metrics.nodeMetrics[nodeId] = {
        duration,
        memoryDelta:
          memoryUsage - (metrics.nodeMetrics[nodeId]?.memoryDelta || 0),
        outputSize,
      };
    }

    // Enhanced current node tracking
    if (status === 'running') {
      execution.currentNodeId = nodeId;
      execution.progress.currentNode = {
        id: nodeId,
        type: nodeType || 'unknown',
        label: nodeLabel || nodeId,
        status,
        startTime: startTime || new Date(),
      };

      // Log node start with detailed information
      await this.logExecutionEvent(
        executionId,
        'info',
        `Node ${nodeLabel || nodeId} started execution`,
        {
          nodeId,
          nodeType,
          nodeLabel,
          timestamp: new Date().toISOString(),
        },
      );
    } else if (status === 'completed') {
      execution.progress.completedNodes++;
      if (execution.progress.currentNode?.id === nodeId) {
        execution.progress.currentNode.status = status;
        execution.progress.currentNode.endTime = endTime || new Date();
        execution.progress.currentNode.duration = duration;
      }

      // Log successful completion with output summary
      const outputSummary = output
        ? this.summarizeOutputData(output)
        : 'No output';
      await this.logExecutionEvent(
        executionId,
        'info',
        `Node ${nodeLabel || nodeId} completed successfully`,
        {
          nodeId,
          nodeType,
          nodeLabel,
          duration,
          outputSummary,
          outputSize: output ? JSON.stringify(output).length : 0,
          timestamp: new Date().toISOString(),
        },
      );

      // Trigger edge animations for completed nodes with data flow
      await this.triggerEdgeFlowAnimations(executionId, nodeId, output);
    } else if (status === 'failed') {
      execution.progress.failedNodes++;
      if (execution.progress.currentNode?.id === nodeId) {
        execution.progress.currentNode.status = status;
        execution.progress.currentNode.endTime = endTime || new Date();
        execution.progress.currentNode.duration = duration;
      }

      // Log failure with detailed error information
      await this.logExecutionEvent(
        executionId,
        'error',
        `Node ${nodeLabel || nodeId} failed: ${error}`,
        {
          nodeId,
          nodeType,
          nodeLabel,
          error,
          duration,
          timestamp: new Date().toISOString(),
        },
      );

      // Note: WebSocket emissions are handled by the gateway separately
    }

    // Enhanced progress tracking
    if (progress !== undefined) {
      await this.logExecutionEvent(
        executionId,
        'info',
        `Node ${nodeLabel || nodeId} progress: ${progress}%`,
        {
          nodeId,
          progress,
          timestamp: new Date().toISOString(),
        },
      );
    }

    // Log to database and in-memory with enhanced context
    const logLevel = status === 'failed' ? 'error' : 'info';
    const message =
      status === 'failed'
        ? `Node ${nodeId} failed: ${error}`
        : `Node ${nodeId} ${status}`;

    await this.logExecutionEvent(executionId, logLevel, message, {
      nodeId,
      status,
      output,
      error,
      duration,
      nodeType,
      nodeLabel,
    });

    // Note: WebSocket emissions are handled by the gateway separately

    this.logger.log(`Node ${nodeId} in execution ${executionId}: ${status}`);
  }

  /**
   * Complete execution
   */
  async completeExecution(executionId: string, results?: Record<string, any>) {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      this.logger.warn(`Execution ${executionId} not found for completion`);
      return;
    }

    execution.status = 'completed';
    execution.endTime = new Date();
    execution.results = results;

    // Log completion
    await this.logExecutionEvent(executionId, 'info', 'Execution completed', {
      results,
      duration: execution.endTime.getTime() - execution.startTime.getTime(),
    });

    // Note: WebSocket emissions are handled by the gateway separately

    // Clean up after 5 minutes
    setTimeout(
      () => {
        this.activeExecutions.delete(executionId);
        this.workflowDefinitions.delete(executionId);
        this.executionMetrics.delete(executionId);
      },
      5 * 60 * 1000,
    );

    this.logger.log(`Execution ${executionId} completed`);
  }

  /**
   * Fail execution
   */
  async failExecution(executionId: string, error: string) {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      this.logger.warn(`Execution ${executionId} not found for failure`);
      return;
    }

    execution.status = 'failed';
    execution.endTime = new Date();
    execution.error = error;

    // Log failure
    await this.logExecutionEvent(
      executionId,
      'error',
      `Execution failed: ${error}`,
      {
        error,
        duration: execution.endTime.getTime() - execution.startTime.getTime(),
      },
    );

    // Note: WebSocket emissions are handled by the gateway separately

    // Clean up after 5 minutes
    setTimeout(
      () => {
        this.activeExecutions.delete(executionId);
        this.workflowDefinitions.delete(executionId);
        this.executionMetrics.delete(executionId);
      },
      5 * 60 * 1000,
    );

    this.logger.error(`Execution ${executionId} failed: ${error}`);
  }

  /**
   * Pause execution
   */
  async pauseExecution(executionId: string, reason: string) {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      this.logger.warn(`Execution ${executionId} not found for pausing`);
      return;
    }

    execution.status = 'paused';

    // Log pause
    await this.logExecutionEvent(
      executionId,
      'info',
      `Execution paused: ${reason}`,
      {
        reason,
      },
    );

    this.logger.log(`Execution ${executionId} paused: ${reason}`);
  }

  /**
   * Resume execution
   */
  async resumeExecution(executionId: string) {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      this.logger.warn(`Execution ${executionId} not found for resuming`);
      return;
    }

    execution.status = 'running';

    // Log resume
    await this.logExecutionEvent(executionId, 'info', 'Execution resumed');

    this.logger.log(`Execution ${executionId} resumed`);
  }

  /**
   * Get current execution status
   */
  async getExecutionStatus(
    executionId: string,
  ): Promise<ExecutionStatus | null> {
    // First check in-memory
    const activeExecution = this.activeExecutions.get(executionId);
    if (activeExecution) {
      return activeExecution;
    }

    // Fetch from database
    try {
      const execution =
        await this.databaseService.executions.findById(executionId);
      if (!execution) {
        return null;
      }

      // Get node executions
      const nodeExecutions =
        await this.databaseService.prisma.nodeExecution.findMany({
          where: { executionId },
          orderBy: { startedAt: 'asc' },
        });

      // Get logs
      const logs = await this.databaseService.prisma.executionLog.findMany({
        where: { executionId },
        orderBy: { timestamp: 'asc' },
        take: 100, // Limit to recent logs
      });

      const status: ExecutionStatus = {
        executionId,
        workflowId: execution.workflowId,
        status: execution.status as any,
        progress: {
          totalNodes: nodeExecutions.length,
          completedNodes: nodeExecutions.filter((n) => n.status === 'completed')
            .length,
          failedNodes: nodeExecutions.filter((n) => n.status === 'failed')
            .length,
        },
        startTime: execution.startedAt,
        endTime: execution.finishedAt || undefined,
        error: execution.error || undefined,
        results: execution.output as any,
        logs: logs.map((log) => ({
          id: log.id,
          timestamp: log.timestamp,
          level: log.level as any,
          message: log.message,
          nodeId: (log.metadata as any)?.nodeId || undefined,
          metadata: log.metadata as any,
        })),
      };

      return status;
    } catch (error) {
      this.logger.error(
        `Failed to get execution status for ${executionId}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Get all active executions
   */
  getActiveExecutions(): ExecutionStatus[] {
    return Array.from(this.activeExecutions.values());
  }

  /**
   * Log execution event
   */
  private async logExecutionEvent(
    executionId: string,
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    metadata?: Record<string, any>,
  ) {
    try {
      // Add to in-memory logs
      const execution = this.activeExecutions.get(executionId);
      if (execution) {
        const log: ExecutionLog = {
          id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: new Date(),
          level,
          message,
          nodeId: metadata?.nodeId,
          metadata,
        };
        execution.logs.push(log);

        // Keep only last 50 logs in memory
        if (execution.logs.length > 50) {
          execution.logs = execution.logs.slice(-50);
        }
      }

      // Save to database - map to proper enum values (lowercase for Prisma LogLevel enum)
      const dbLevel =
        level === 'info'
          ? 'info'
          : level === 'warn'
            ? 'warn'
            : level === 'error'
              ? 'error'
              : 'info'; // default to 'info' instead of 'DEBUG'

      // Create execution_log entry
      await this.databaseService.prisma.executionLog.create({
        data: {
          executionId,
          level: dbLevel,
          message,
          timestamp: new Date(),
          metadata: metadata || {},
        },
      });

      // If this is a node-specific log, also create a node_log entry
      if (metadata?.nodeId) {
        try {
          // Find the node execution record
          const nodeExecution =
            await this.databaseService.prisma.nodeExecution.findUnique({
              where: {
                executionId_nodeId: {
                  executionId,
                  nodeId: metadata.nodeId,
                },
              },
            });

          if (nodeExecution) {
            // Create node_log entry
            await this.databaseService.prisma.nodeLog.create({
              data: {
                nodeExecutionId: nodeExecution.id,
                level: dbLevel,
                message,
                metadata: metadata || {},
              },
            });
          } else {
            // CRITICAL FIX: Create node execution record if it doesn't exist
            // This can happen when logs are created before the node execution record
            this.logger.warn(
              `Node execution not found for execution ${executionId} and node ${metadata.nodeId}, creating it now`,
            );

            try {
              const newNodeExecution =
                await this.databaseService.prisma.nodeExecution.create({
                  data: {
                    executionId,
                    nodeId: metadata.nodeId,
                    status: 'pending',
                    startedAt: new Date(),
                  },
                });

              // Now create the node_log entry
              await this.databaseService.prisma.nodeLog.create({
                data: {
                  nodeExecutionId: newNodeExecution.id,
                  level: dbLevel,
                  message,
                  metadata: metadata || {},
                },
              });
            } catch (createError) {
              this.logger.error(
                `Failed to create node execution and log for execution ${executionId} and node ${metadata.nodeId}:`,
                createError,
              );
            }
          }
        } catch (nodeLogError) {
          this.logger.error(
            `Failed to create node log for execution ${executionId} and node ${metadata.nodeId}:`,
            nodeLogError,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Failed to log execution event:`, error);
    }
  }

  /**
   * Get execution metrics by ID
   */
  getExecutionMetricsById(executionId: string): ExecutionMetrics | null {
    return this.executionMetrics.get(executionId) || null;
  }

  /**
   * Update execution metrics (called periodically during execution)
   */
  updateExecutionMetrics(
    executionId: string,
    updates: Partial<ExecutionMetrics>,
  ) {
    const metrics = this.executionMetrics.get(executionId);
    if (metrics) {
      Object.assign(metrics, updates);
    }
  }

  /**
   * Get dashboard metrics
   */
  async getDashboardMetrics(timeRange: 'hour' | 'day' | 'week' = 'day') {
    // Implementation for dashboard metrics
    return {
      totalExecutions: 0,
      successRate: 0,
      averageDuration: 0,
      topWorkflows: [],
    };
  }

  /**
   * Trigger edge flow animations
   */
  /**
   * Summarize output data for logging purposes
   */
  private summarizeOutputData(output: any): string {
    if (!output) return 'No output';

    if (typeof output === 'string') {
      return output.length > 100 ? `${output.substring(0, 100)}...` : output;
    }

    if (typeof output === 'object') {
      const keys = Object.keys(output);
      if (keys.length === 0) return 'Empty object';

      if (keys.length <= 3) {
        return `Object with ${keys.length} fields: ${keys.join(', ')}`;
      }

      return `Object with ${keys.length} fields: ${keys.slice(0, 3).join(', ')}...`;
    }

    return String(output);
  }

  private async triggerEdgeFlowAnimations(
    executionId: string,
    sourceNodeId: string,
    output: any,
  ) {
    const workflowDef = this.workflowDefinitions.get(executionId);
    if (!workflowDef) {
      this.logger.debug(
        `No workflow definition found for execution ${executionId}`,
      );
      return;
    }

    // Find edges that start from the completed node
    const outgoingEdges = workflowDef.edges.filter(
      (edge: any) => edge.source === sourceNodeId,
    );

    for (const edge of outgoingEdges) {
      const targetNode = workflowDef.nodes.find(
        (node: any) => node.id === edge.target,
      );

      if (targetNode) {
        // Calculate data flow metrics
        const outputSize = JSON.stringify(output).length;
        const dataType = typeof output;
        const isComplex = typeof output === 'object' && output !== null;
        const fieldCount = isComplex ? Object.keys(output).length : 0;

        // Emit edge flow animation event with enhanced data
        const edgeFlowUpdate: EdgeFlowUpdate = {
          executionId,
          edgeId: edge.id,
          sourceNodeId,
          targetNodeId: edge.target,
          status: 'flowing',
          data: {
            payload: output,
            metadata: {
              size: outputSize,
              type: dataType,
              fieldCount,
              timestamp: new Date().toISOString(),
            },
          },
          timestamp: new Date(),
        };

        // Note: WebSocket emissions are handled by the gateway separately

        // Log detailed data flow information
        await this.logExecutionEvent(
          executionId,
          'info',
          `Data flowing from ${sourceNodeId} to ${edge.target}`,
          {
            sourceNodeId,
            targetNodeId: edge.target,
            edgeId: edge.id,
            outputSize,
            dataType,
            fieldCount,
            outputSummary: this.summarizeOutputData(output),
            timestamp: new Date().toISOString(),
          },
        );

        // Calculate flow duration based on data complexity
        const baseDuration = 300; // Base 300ms
        const sizeMultiplier = Math.min(2, outputSize / 1000); // Max 2x for large data
        const complexityMultiplier = isComplex ? 1.5 : 1; // 1.5x for complex objects
        const flowDuration = Math.round(
          baseDuration * sizeMultiplier * complexityMultiplier,
        );

        // Simulate data flow with progress updates
        const progressSteps = Math.min(
          5,
          Math.max(2, Math.floor(flowDuration / 200)),
        );
        let currentStep = 0;

        const progressInterval = setInterval(() => {
          currentStep++;
          const progress = (currentStep / progressSteps) * 100;

          // Note: WebSocket emissions are handled by the gateway separately

          if (currentStep >= progressSteps) {
            clearInterval(progressInterval);

            // Emit completion
            const completedFlowUpdate: EdgeFlowUpdate = {
              ...edgeFlowUpdate,
              status: 'completed',
              timestamp: new Date(),
            };
            // Note: WebSocket emissions are handled by the gateway separately
          }
        }, flowDuration / progressSteps);
      }
    }
  }
}
