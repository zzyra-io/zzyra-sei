import { Injectable, Logger } from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import { DatabaseService } from '../services/database.service';
import {
  topologicalSort,
  validateAcyclic,
  validateOrphans,
  validateTerminals,
} from '../utils/graph';
import { validateWorkflowDefinition } from '../utils/blockValidator';
import { NodeExecutor } from './node-executor';
import { ExecutionLogger } from './execution-logger';
import {
  NotificationService,
  NotificationType,
} from '../services/notification.service';
import { BlockType } from '@zyra/types';

@Injectable()
export class WorkflowExecutor {
  private readonly logger = new Logger(WorkflowExecutor.name);
  private tracer = trace.getTracer('workflow-execution');

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly nodeExecutor: NodeExecutor,
    private readonly executionLogger: ExecutionLogger,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Build a dependency map for nodes based on edges
   * @param nodes Workflow nodes
   * @param edges Workflow edges
   * @returns Map of node IDs to their direct parent node IDs
   */
  private buildNodeDependencyMap(
    nodes: any[],
    edges: any[],
  ): Map<string, string[]> {
    const dependencyMap = new Map<string, string[]>();

    // Initialize all nodes with empty dependency arrays
    nodes.forEach((node) => {
      dependencyMap.set(node.id, []);
    });

    // Add dependencies based on edges
    edges.forEach((edge) => {
      const sourceId = edge.source;
      const targetId = edge.target;

      // Add source as a dependency for target
      const dependencies = dependencyMap.get(targetId) || [];
      if (!dependencies.includes(sourceId)) {
        dependencies.push(sourceId);
        dependencyMap.set(targetId, dependencies);
      }
    });

    return dependencyMap;
  }

  /**
   * Get relevant outputs for a specific node based on its dependencies
   * @param nodeId Node ID to get relevant outputs for
   * @param dependencyMap Map of node dependencies
   * @param allOutputs All outputs collected so far
   * @returns Object containing only the outputs relevant to this node
   */
  private getRelevantOutputs(
    nodeId: string,
    dependencyMap: Map<string, string[]>,
    allOutputs: Record<string, any>,
  ): Record<string, any> {
    const relevantOutputs: Record<string, any> = {};
    const dependencies = dependencyMap.get(nodeId) || [];

    // Include outputs from direct dependencies
    dependencies.forEach((depId) => {
      if (allOutputs[depId] !== undefined) {
        relevantOutputs[depId] = allOutputs[depId];
      }
    });

    return relevantOutputs;
  }

  async executeWorkflow(
    nodes: any[],
    edges: any[],
    executionId: string,
    userId: string,
    resumeFromNodeId?: string,
    resumeData: Record<string, any> = {},
  ): Promise<{
    status: string;
    outputs: Record<string, any>;
    error: string | null;
  }> {
    const span = this.tracer.startSpan('execute_workflow', {
      attributes: { executionId, userId },
    });
    const start = Date.now();

    // Define these variables early to be accessible in finally block
    let finalStatus: string = 'processing';
    let finalError: string | null = null;
    let workflowName: string = 'Unknown Workflow';
    const activeNodeExecutions = new Set<string>();
    let workflowId: string = 'unknown';

    try {
      // Fetch execution details to get workflow info
      const execution =
        await this.databaseService.executions.findById(executionId);
      if (execution) {
        workflowId = execution.workflowId;
        const workflow =
          await this.databaseService.workflows.findById(workflowId);
        if (workflow) {
          workflowName = workflow.name;
        }
      }

      // Send workflow started notification
      await this.notificationService.sendNotification(
        userId,
        'workflow_started',
        {
          workflow_id: workflowId,
          execution_id: executionId,
          workflow_name: workflowName,
        },
      );

      // Log workflow execution start
      await this.executionLogger.logExecutionEvent(executionId, {
        level: 'info',
        message: 'Starting workflow execution',
        node_id: 'system',
        data: {
          nodes_count: nodes.length,
          edges_count: edges.length,
          resume_from_node: resumeFromNodeId || 'none',
        },
      });

      // Validate workflow definition
      const handlerRegistry: Record<string, any> = {};
      const blockTypes = Object.values(BlockType);

      blockTypes.forEach((type) => {
        handlerRegistry[type] = { validateConfig: () => [] };
      });

      validateWorkflowDefinition(nodes, handlerRegistry, userId);

      // Additional validations for production
      validateAcyclic(nodes, edges);
      validateOrphans(nodes, edges);
      validateTerminals(nodes, edges);

      // Sort nodes in execution order
      const sortedNodes = topologicalSort(nodes, edges);

      this.logger.debug(
        `Workflow nodes (${nodes.length}): ${JSON.stringify(
          nodes.map((n) => ({
            id: n.id,
            type: n.data?.type || n.data?.blockType || n.type,
          })),
        )}`,
      );
      this.logger.debug(
        `Sorted nodes for execution (${sortedNodes.length}): ${JSON.stringify(
          sortedNodes.map((n) => ({
            id: n.id,
            type: n.data?.type || n.data?.blockType || n.type,
          })),
        )}`,
      );

      // Build dependency map for nodes
      const dependencyMap = this.buildNodeDependencyMap(nodes, edges);

      // Initialize outputs with resume data if provided
      const outputs: Record<string, any> = resumeData || {};

      // If resuming, skip nodes until we reach the resume point
      let shouldExecute = !resumeFromNodeId;
      let resumeNodeFound = false;

      // Create block execution records for all nodes
      await Promise.all(
        nodes.map(async (node) => {
          try {
            await this.databaseService.prisma.blockExecution.create({
              data: {
                nodeId: node.id,
                execution: { connect: { id: executionId } },
                blockType: node.data?.type || node.data?.blockType || node.type,
                status:
                  resumeFromNodeId && node.id === resumeFromNodeId
                    ? 'completed'
                    : 'pending',
                input: node.data?.config || {},
                startTime: new Date(),
              },
            });
          } catch (error) {
            this.logger.error(
              `Error creating block execution record for ${node.id}: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }),
      );

      // Log execution plan
      await this.executionLogger.logExecutionEvent(executionId, {
        level: 'info',
        message: 'Execution plan prepared',
        node_id: 'system',
        data: {
          sorted_nodes: sortedNodes.map((n) => n.id),
          resume_from: resumeFromNodeId,
        },
      });

      // Execute each node in order
      for (const node of sortedNodes) {
        // Check if we need to start executing from this node
        if (!shouldExecute) {
          if (node.id === resumeFromNodeId) {
            shouldExecute = true;
            resumeNodeFound = true;
            this.logger.log(`Resuming execution from node: ${node.id}`);

            await this.executionLogger.logExecutionEvent(executionId, {
              level: 'info',
              message: `Resuming execution from node: ${node.id}`,
              node_id: 'system',
            });

            continue;
          } else {
            this.logger.debug(`Skipping already executed node: ${node.id}`);
            continue;
          }
        }

        // Add to active executions set for tracking
        activeNodeExecutions.add(node.id);

        // Get only the outputs relevant to this node
        const relevantOutputs = this.getRelevantOutputs(
          node.id,
          dependencyMap,
          outputs,
        );

        this.logger.debug(
          `Executing node ${node.id} with relevant outputs from dependencies`,
        );

        try {
          // Get the block execution record for this node
          const blockExecution =
            await this.databaseService.prisma.blockExecution.findFirst({
              where: {
                execution: { id: executionId },
                nodeId: node.id,
              },
            });

          if (!blockExecution) {
            throw new Error(
              `Block execution record not found for node ${node.id}`,
            );
          }

          // Update block status to running
          await this.databaseService.prisma.blockExecution.update({
            where: { id: blockExecution.id },
            data: {
              status: 'running',
              startTime: new Date(),
            },
          });

          // Execute the node
          outputs[node.id] = await this.nodeExecutor.executeNode(
            node,
            executionId,
            userId,
            relevantOutputs,
          );

          // Update block status to completed
          await this.databaseService.prisma.blockExecution.update({
            where: { id: blockExecution.id },
            data: {
              status: 'completed',
              endTime: new Date(),
              output: outputs[node.id],
            },
          });

          this.logger.log(
            `[executionId=${executionId}] Completed node ${node.id}`,
          );

          // Remove from active executions after successful completion
          activeNodeExecutions.delete(node.id);
        } catch (nodeError: any) {
          // Remove from active executions on error
          activeNodeExecutions.delete(node.id);

          this.logger.error(
            `[executionId=${executionId}] Error executing node ${node.id}: ${nodeError.message || 'Unknown error'}`,
          );

          // Clean up any active node executions
          await this.cleanupActiveNodeExecutions(
            executionId,
            activeNodeExecutions,
            nodeError.message,
          );

          throw nodeError;
        }
      }

      const duration = (Date.now() - start) / 1000;
      this.logger.log(
        `[executionId=${executionId}] Workflow completed successfully in ${duration}s`,
      );

      // Log workflow completion
      await this.executionLogger.logExecutionEvent(executionId, {
        level: 'info',
        message: `Workflow execution completed successfully in ${duration}s`,
        node_id: 'system',
        data: {
          duration_seconds: duration,
          output_nodes: Object.keys(outputs),
        },
      });

      finalStatus = 'completed';
      finalError = null;
    } catch (error) {
      finalStatus = 'failed';
      finalError = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Workflow execution ${executionId} failed: ${finalError}`,
      );
      span.recordException(error as Error);
      span.setStatus({ code: 2, message: finalError });

      // Update workflow execution status to failed
      await this.databaseService.executions.updateStatus(
        executionId,
        'failed',
        finalError,
      );

      // Ensure active node executions are marked as failed
      await Promise.allSettled(
        Array.from(activeNodeExecutions).map(async (nodeId) => {
          try {
            const blockExecution =
              await this.databaseService.prisma.blockExecution.findFirst({
                where: {
                  execution: { id: executionId },
                  nodeId,
                },
              });
            if (blockExecution) {
              await this.databaseService.prisma.blockExecution.update({
                where: { id: blockExecution.id },
                data: {
                  status: 'failed',
                  error: finalError,
                  endTime: new Date(),
                },
              });
            }
          } catch (cleanupError) {
            this.logger.warn(
              `Failed to cleanup node execution ${nodeId}: ${cleanupError}`,
            );
          }
        }),
      );

      // Log final failure event
      await this.executionLogger.logExecutionEvent(executionId, {
        level: 'error',
        message: `Workflow execution failed: ${finalError}`,
        node_id: 'system',
        data: { error: finalError },
      });

      return { status: 'failed', outputs: {}, error: finalError };
    } finally {
      // Send final notification
      const notificationType: NotificationType =
        finalStatus === 'completed' ? 'workflow_completed' : 'workflow_failed';
      await this.notificationService.sendNotification(
        userId,
        notificationType,
        {
          workflow_id: workflowId,
          execution_id: executionId,
          workflow_name: workflowName,
          status: finalStatus,
          error: finalError,
          duration_ms: Date.now() - start,
        },
      );

      const duration = Date.now() - start;
      this.logger.log(
        `[executionId=${executionId}] Workflow execution completed in ${duration}ms`,
      );

      return { status: finalStatus, outputs: {}, error: finalError };
    }
  }

  /**
   * Clean up any active node executions that might be stuck
   */
  private async cleanupActiveNodeExecutions(
    executionId: string,
    activeNodeExecutions: Set<string>,
    errorMessage: string,
  ): Promise<void> {
    if (activeNodeExecutions.size === 0) return;

    this.logger.warn(
      `[executionId=${executionId}] Cleaning up ${activeNodeExecutions.size} active node executions`,
    );

    await Promise.allSettled(
      Array.from(activeNodeExecutions).map(async (nodeId) => {
        try {
          const blockExecution =
            await this.databaseService.prisma.blockExecution.findFirst({
              where: {
                execution: { id: executionId },
                nodeId,
              },
            });
          if (blockExecution) {
            await this.databaseService.prisma.blockExecution.update({
              where: { id: blockExecution.id },
              data: {
                status: 'failed',
                error: errorMessage,
                endTime: new Date(),
              },
            });
          }
        } catch (cleanupError) {
          this.logger.warn(
            `Failed to cleanup node execution ${nodeId}: ${cleanupError}`,
          );
        }
      }),
    );
  }
}
