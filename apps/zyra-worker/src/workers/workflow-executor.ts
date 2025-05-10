import { Injectable, Logger } from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import { createServiceClient } from '../lib/supabase/serviceClient';
import {
  topologicalSort,
  validateAcyclic,
  validateOrphans,
  validateTerminals,
} from '../utils/graph';
import { validateWorkflowDefinition } from '../utils/blockValidator';
import { NodeExecutor } from './node-executor';
import { ExecutionLogger } from './execution-logger';
import { SupabaseClient } from '@supabase/supabase-js';

import { Database, TablesInsert, TablesUpdate } from '../types/supabase';
import { NotificationService, NotificationType } from '../services/notification.service';
import { BlockType } from '@zyra/types';


@Injectable()
export class WorkflowExecutor {
  private readonly logger = new Logger(WorkflowExecutor.name);
  private tracer = trace.getTracer('workflow-execution');

  constructor(
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
    const supabase = createServiceClient();

    // Define these variables early to be accessible in finally block
    let finalStatus: string = 'processing';
    let finalError: string | null = null;
    let workflowName: string = 'Unknown Workflow'; // Default or fetch later
    const activeNodeExecutions = new Set<string>();
    type ExecDataType = { workflow_id: string; workflows: { name: string } | null } | null;
    let execData: ExecDataType = null;

    try {
      // --- Fetch Workflow Name (Assuming executionId relates to workflow_executions table which has workflow_id)
      // We need the workflow name for notifications. This might require an extra query.
      // Let's assume we can get it somehow, perhaps via the execution record.
      // Placeholder - This logic needs refinement based on actual data flow.
      const { data: fetchedExecData, error: execError } = await supabase
        .from('workflow_executions')
        .select('workflow_id, workflows ( name )')
        .eq('id', executionId)
        .single();

      execData = fetchedExecData as ExecDataType;

      if (execError) {
        this.logger.warn(`Could not fetch workflow name for execution ${executionId}: ${execError.message}`);
      } else if (execData?.workflows?.name) {
        workflowName = execData.workflows.name;
      }
      // --- End Fetch Workflow Name

      // --- Send Workflow Started Notification ---
      await this.notificationService.sendNotification(userId, 'workflow_started', {
        workflow_id: execData?.workflow_id || 'unknown',
        execution_id: executionId,
        workflow_name: workflowName,
      });
      // --- End Send Notification ---

      // Log workflow execution start
      await this.executionLogger.logExecutionEvent(supabase, executionId, {
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
      const handlerRegistry: Record<string, any> = {}; // Create a registry of handlers from node executor
      // Import all block types
      const blockTypes = Object.values(BlockType);

      // Create a simple registry for validation
      blockTypes.forEach((type) => {
        handlerRegistry[type] = { validateConfig: () => [] };
      });

      // Now call with the correct parameters
      validateWorkflowDefinition(nodes, handlerRegistry, userId);

      // Additional validations for production
      validateAcyclic(nodes, edges);
      validateOrphans(nodes, edges);
      validateTerminals(nodes, edges);

      // Sort nodes in execution order
      const sortedNodes = topologicalSort(nodes, edges);

      // Log all nodes and their types for debugging
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
      let shouldExecute = !resumeFromNodeId; // If no resumeFromNodeId, execute all nodes
      let resumeNodeFound = false;

      // Track active node executions for cleanup in case of errors
      // Create block execution records for all nodes
      await Promise.all(
        nodes.map(async (node) => {
          const blockExecution: TablesInsert<'block_executions'> = {
            node_id: node.id,
            workflow_execution_id: executionId,
            block_type: node.data?.type || node.data?.blockType || node.type,
            status:
              resumeFromNodeId && node.id === resumeFromNodeId
                ? 'completed'
                : 'pending',
            inputs: node.data?.config || {},
            created_at: new Date().toISOString(),
          };

          const { error } = await supabase
            .from('block_executions')
            .insert(blockExecution);

          if (error) {
            this.logger.error(
              `Error creating block execution record for ${node.id}: ${error.message}`,
            );
          }
        }),
      );

      // Log execution plan
      await this.executionLogger.logExecutionEvent(supabase, executionId, {
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
            // We found the node to resume from, start executing from the next node
            shouldExecute = true;
            resumeNodeFound = true;
            this.logger.log(`Resuming execution from node: ${node.id}`);

            await this.executionLogger.logExecutionEvent(
              supabase,
              executionId,
              {
                level: 'info',
                message: `Resuming execution from node: ${node.id}`,
                node_id: 'system',
              },
            );

            continue; // Skip this node as it was already executed
          } else {
            // Skip nodes until we find the resume point
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
          const { data: blockExecution } = await supabase
            .from('block_executions')
            .select('id, started_at')
            .eq('workflow_execution_id', executionId)
            .eq('node_id', node.id)
            .single();

          if (!blockExecution) {
            throw new Error(
              `Block execution record not found for node ${node.id}`,
            );
          }

          // Update block status to running
          const runningUpdate: TablesUpdate<'block_executions'> = {
            status: 'running',
            started_at: new Date().toISOString(),
          };

          await supabase
            .from('block_executions')
            .update(runningUpdate)
            .eq('id', blockExecution.id);

          // Execute the node
          outputs[node.id] = await this.nodeExecutor.executeNode(
            node,
            executionId,
            userId,
            relevantOutputs,
          );

          // Update block status to completed
          const completedUpdate: TablesUpdate<'block_executions'> = {
            status: 'completed',
            completed_at: new Date().toISOString(),
            outputs: outputs[node.id],
            execution_time_ms:
              Date.now() - new Date(blockExecution.started_at).getTime(),
          };

          await supabase
            .from('block_executions')
            .update(completedUpdate)
            .eq('id', blockExecution.id);

          this.logger.log(
            `[executionId=${executionId}] Completed node ${node.id}`,
          );

          // Remove from active executions after successful completion
          activeNodeExecutions.delete(node.id);
        } catch (nodeError: any) {
          // Remove from active executions on error
          activeNodeExecutions.delete(node.id);

          // Log the error
          this.logger.error(
            `[executionId=${executionId}] Error executing node ${node.id}: ${nodeError.message || 'Unknown error'}`,
          );

          // Clean up any active node executions
          await this.cleanupActiveNodeExecutions(
            supabase,
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
      await this.executionLogger.logExecutionEvent(supabase, executionId, {
        level: 'info',
        message: `Workflow execution completed successfully in ${duration}s`,
        node_id: 'system',
        data: {
          duration_seconds: duration,
          output_nodes: Object.keys(outputs),
        },
      });

      // Update final status and error based on outcome
      finalStatus = 'completed';
      finalError = null;
    } catch (error) {
      finalStatus = 'failed'; // Ensure status is updated on error
      finalError = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Workflow execution ${executionId} failed: ${finalError}`,
      );
      span.recordException(error as Error);
      span.setStatus({ code: 2, message: finalError }); // 2 is ERROR code in OpenTelemetry

      // Update workflow execution status to failed
      await supabase
        .from('workflow_executions')
        .update({ status: 'failed', finished_at: new Date().toISOString(), error: finalError })
        .eq('id', executionId);

      // Ensure active node executions are marked as failed
      await Promise.allSettled(
        Array.from(activeNodeExecutions).map(async (nodeExecId) => {
          await supabase
            .from('block_executions')
            .update({ status: 'failed', finished_at: new Date().toISOString(), error: 'Workflow failed' })
            .eq('id', nodeExecId);
        })
      );

      // Log final failure event
      await this.executionLogger.logExecutionEvent(supabase, executionId, {
        level: 'error',
        message: `Workflow execution failed: ${finalError}`,
        node_id: 'system',
        data: { error: finalError },
      });

      // Rethrow or return error state
      return { status: 'failed', outputs: {}, error: finalError };
    } finally {
      // --- Send Final Notification (Completed/Failed) ---
      const notificationType: NotificationType = finalStatus === 'completed' ? 'workflow_completed' : 'workflow_failed';
      await this.notificationService.sendNotification(userId, notificationType, {
        workflow_id: execData?.workflow_id || 'unknown',
        execution_id: executionId,
        workflow_name: workflowName,
        status: finalStatus,
        error: finalError,
        duration_ms: Date.now() - start,
      });
      // --- End Send Final Notification ---

      const duration = Date.now() - start;
      this.logger.log(
        `[executionId=${executionId}] Workflow execution completed in ${duration}ms`,
      );

      // Return the final state
      return { status: finalStatus, outputs: {}, error: finalError };
    }
  }

  /**
   * Clean up any active node executions that might be stuck
   */
  private async cleanupActiveNodeExecutions(
    supabase: SupabaseClient,
    executionId: string,
    activeNodeExecutions: Set<string>,
    errorMessage: string,
  ): Promise<void> {
    if (activeNodeExecutions.size === 0) return;

    this.logger.warn(
      `[executionId=${executionId}] Cleaning up ${activeNodeExecutions.size} active node executions`,
    );

    // Mark all active nodes as failed
    for (const nodeId of activeNodeExecutions) {
      try {
        await supabase
          .from('node_executions')
          .update({
            status: 'failed',
            error: 'Workflow execution failed or was interrupted',
            finished_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
          })
          .match({ execution_id: executionId, node_id: nodeId });

        await this.executionLogger.logNodeEvent(
          supabase,
          executionId,
          nodeId,
          'error',
          'Node execution terminated due to workflow failure',
          { workflow_error: errorMessage || 'Unknown error' },
        );
      } catch (cleanupError) {
        this.logger.error(
          `[executionId=${executionId}] Error cleaning up node ${nodeId}: ${cleanupError}`,
        );
      }
    }
  }
}
