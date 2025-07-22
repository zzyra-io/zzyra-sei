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
import { ExecutionMonitorService } from '../services/execution-monitor.service';
import {
  MultiLevelCircuitBreakerService,
  ExecutionContext,
} from '../services/multi-level-circuit-breaker.service';
import { DataTransformationService } from '../services/data-transformation.service';
import { DataStateService } from '../services/data-state.service';
import { ParallelExecutionService } from '../services/parallel-execution.service';
import { BlockchainDataSyncService } from '../services/blockchain-data-sync.service';
import { BlockType, getEnhancedBlockSchema } from '@zyra/types';

@Injectable()
export class WorkflowExecutor {
  private readonly logger = new Logger(WorkflowExecutor.name);
  private tracer = trace.getTracer('workflow-execution');

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly nodeExecutor: NodeExecutor,
    private readonly executionLogger: ExecutionLogger,
    private readonly notificationService: NotificationService,
    private readonly executionMonitorService: ExecutionMonitorService,
    private readonly multiLevelCircuitBreaker: MultiLevelCircuitBreakerService,
    private readonly dataTransformationService: DataTransformationService,
    private readonly dataStateService: DataStateService,
    private readonly parallelExecutionService: ParallelExecutionService,
    private readonly blockchainDataSyncService: BlockchainDataSyncService,
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

  /**
   * Check for type compatibility between connected nodes
   * @param nodes Workflow nodes
   * @param edges Workflow edges
   * @returns Array of type mismatch issues
   */
  private checkTypeCompatibility(
    nodes: any[],
    edges: any[],
  ): Array<{
    sourceNode: string;
    targetNode: string;
    mismatches: Array<{ field: string; expected: string; received: string }>;
  }> {
    const issues: Array<{
      sourceNode: string;
      targetNode: string;
      mismatches: Array<{ field: string; expected: string; received: string }>;
    }> = [];

    edges.forEach((edge) => {
      const sourceNode = nodes.find((n) => n.id === edge.source);
      const targetNode = nodes.find((n) => n.id === edge.target);

      if (!sourceNode || !targetNode) return;

      const sourceBlockType =
        sourceNode.data?.blockType || sourceNode.data?.type || sourceNode.type;
      const targetBlockType =
        targetNode.data?.blockType || targetNode.data?.type || targetNode.type;

      const sourceSchema = getEnhancedBlockSchema(sourceBlockType as BlockType);
      const targetSchema = getEnhancedBlockSchema(targetBlockType as BlockType);

      if (sourceSchema && targetSchema) {
        const mismatches: Array<{
          field: string;
          expected: string;
          received: string;
        }> = [];

        // Check for field type mismatches
        const sourceOutputFields = Object.keys(
          sourceSchema.outputSchema.shape || {},
        );
        const targetInputFields = Object.keys(
          targetSchema.inputSchema.shape || {},
        );

        targetInputFields.forEach((inputField) => {
          const sourceField = sourceOutputFields.find(
            (field) => field === inputField,
          );
          if (sourceField) {
            const sourceFieldSchema =
              sourceSchema.outputSchema.shape[sourceField];
            const targetFieldSchema =
              targetSchema.inputSchema.shape[inputField];

            if (sourceFieldSchema && targetFieldSchema) {
              const sourceType = this.getZodTypeString(
                sourceFieldSchema._def?.typeName,
              );
              const targetType = this.getZodTypeString(
                targetFieldSchema._def?.typeName,
              );

              if (sourceType !== targetType) {
                mismatches.push({
                  field: inputField,
                  expected: targetType,
                  received: sourceType,
                });
              }
            }
          }
        });

        if (mismatches.length > 0) {
          issues.push({
            sourceNode: sourceNode.id,
            targetNode: targetNode.id,
            mismatches,
          });
        }
      }
    });

    return issues;
  }

  /**
   * Get Zod type string for comparison
   */
  private getZodTypeString(typeName: string): string {
    switch (typeName) {
      case 'ZodString':
        return 'string';
      case 'ZodNumber':
        return 'number';
      case 'ZodBoolean':
        return 'boolean';
      case 'ZodArray':
        return 'array';
      case 'ZodObject':
        return 'object';
      case 'ZodEnum':
        return 'string';
      default:
        return 'unknown';
    }
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

    // Define execution context for circuit breaker - accessible in both try and catch blocks
    let executionContext: ExecutionContext;

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
      this.logger.log(`=== WORKFLOW VALIDATION DEBUG ===`);
      this.logger.log(
        `Received ${nodes.length} nodes and ${edges.length} edges`,
      );
      this.logger.log(
        `Nodes: ${nodes.map((n) => `${n.id}(${n.data?.type || n.type})`).join(', ')}`,
      );
      this.logger.log(
        `Edges: ${edges.map((e) => `${e.source}->${e.target}`).join(', ')}`,
      );
      this.logger.log(`=====================================`);

      validateAcyclic(nodes, edges);
      validateOrphans(nodes, edges);
      validateTerminals(nodes, edges);

      // Check multi-level circuit breaker before execution
      executionContext = {
        workflowId,
        userId,
        executionId,
      };

      const circuitCheck =
        await this.multiLevelCircuitBreaker.shouldAllowExecution(
          executionContext,
        );
      if (!circuitCheck.allowed) {
        const error = `Execution blocked by ${circuitCheck.blockedBy?.level} circuit breaker: ${circuitCheck.reason}`;
        this.logger.error(`[executionId=${executionId}] ${error}`);

        // Log the circuit breaker block
        await this.executionLogger.logExecutionEvent(executionId, {
          level: 'error',
          message: `Workflow execution blocked: ${error}`,
          node_id: 'system',
          data: {
            circuitLevel: circuitCheck.blockedBy?.level,
            circuitId: circuitCheck.blockedBy?.circuitId,
            reason: circuitCheck.reason,
          },
        });

        // Record the execution as failed due to circuit breaker
        await this.executionMonitorService.failExecution(executionId, error);

        return {
          status: 'failed',
          outputs: {},
          error,
        };
      }

      // Check for type compatibility issues
      const typeCompatibilityIssues = this.checkTypeCompatibility(nodes, edges);
      if (typeCompatibilityIssues.length > 0) {
        this.logger.warn('Type compatibility issues detected:', {
          executionId,
          issues: typeCompatibilityIssues,
        });

        // Log each compatibility issue
        typeCompatibilityIssues.forEach((issue) => {
          this.logger.warn(
            `Type mismatch between ${issue.sourceNode} and ${issue.targetNode}:`,
            {
              executionId,
              sourceNode: issue.sourceNode,
              targetNode: issue.targetNode,
              mismatches: issue.mismatches,
            },
          );

          // Log suggestion for data transformation
          this.logger.log(
            `Suggestion: Add a DATA_TRANSFORM block between ${issue.sourceNode} and ${issue.targetNode} to handle type conversions`,
            {
              executionId,
              sourceNode: issue.sourceNode,
              targetNode: issue.targetNode,
            },
          );

          // Log detailed transformation suggestions
          issue.mismatches.forEach((mismatch) => {
            this.logger.log(
              `Type mismatch: field '${mismatch.field}' - expected ${mismatch.expected}, received ${mismatch.received}`,
              {
                executionId,
                sourceNode: issue.sourceNode,
                targetNode: issue.targetNode,
                field: mismatch.field,
                expectedType: mismatch.expected,
                receivedType: mismatch.received,
              },
            );
          });
        });

        // Log to execution logs for UI visibility
        await this.executionLogger.logExecutionEvent(executionId, {
          level: 'warn',
          message: `Type compatibility issues detected. Consider adding DATA_TRANSFORM blocks.`,
          node_id: 'system',
          data: {
            type_issues: typeCompatibilityIssues.length,
            issues: typeCompatibilityIssues,
          },
        });
      }

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

      // Ensure node_executions row exists for every node before execution
      await Promise.all(
        sortedNodes.map(async (node) => {
          try {
            await this.databaseService.prisma.nodeExecution.upsert({
              where: {
                executionId_nodeId: {
                  executionId,
                  nodeId: node.id,
                },
              },
              create: {
                executionId,
                nodeId: node.id,
                status: 'pending',
                startedAt: new Date(),
                completedAt: new Date(),
              },
              update: {
                // No-op update, just ensure it exists
              },
            });
          } catch (error) {
            this.logger.error(
              `Error upserting node_execution for node ${node.id}: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
        }),
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

      // Start real-time monitoring for this execution
      await this.executionMonitorService.startExecution(
        executionId,
        workflowId,
        sortedNodes.length,
        { nodes, edges },
      );

      // Execute each node in order
      for (const node of sortedNodes) {
        this.logger.log(
          `Processing node ${node.id} (shouldExecute: ${shouldExecute})`,
        );

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

        this.logger.log(`Starting execution of node ${node.id}`);

        // Add to active executions set for tracking
        activeNodeExecutions.add(node.id);

        // Get only the outputs relevant to this node
        const relevantOutputs = this.getRelevantOutputs(
          node.id,
          dependencyMap,
          outputs,
        );

        // Apply data transformations if needed
        const transformedOutputs = await this.applyDataTransformations(
          node,
          relevantOutputs,
          executionId,
        );

        // Save intermediate data state
        await this.dataStateService.saveDataState(
          executionId,
          node.id,
          transformedOutputs,
          { tags: ['input', 'intermediate'] },
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

          // Update block status to running and send real-time update
          const startTime = new Date();
          await this.databaseService.prisma.blockExecution.update({
            where: { id: blockExecution.id },
            data: {
              status: 'running',
              startTime: startTime,
            },
          });

          // Update node_executions status to running
          await this.databaseService.prisma.nodeExecution.update({
            where: {
              executionId_nodeId: {
                executionId,
                nodeId: node.id,
              },
            },
            data: {
              status: 'running',
              startedAt: startTime,
            },
          });

          // Send real-time update: node execution started
          await this.executionMonitorService.updateNodeExecution({
            executionId,
            nodeId: node.id,
            status: 'running',
            nodeType: node.data?.type || node.data?.blockType || node.type,
            nodeLabel: node.data?.label || node.data?.name || node.id,
            startTime: startTime,
          });

          // Execute the node with enhanced data validation
          try {
            this.logger.log(
              `About to execute node ${node.id} with NodeExecutor`,
            );

            // Validate input data before execution
            const inputValidationResult = await this.validateNodeInputData(
              node,
              relevantOutputs,
              executionId,
            );

            if (!inputValidationResult.isValid) {
              throw new Error(
                `Input validation failed for node ${node.id}: ${inputValidationResult.errors.join(', ')}`,
              );
            }

            this.logger.log(
              `Input validation passed for node ${node.id}, executing...`,
            );

            // Execute the node with enhanced data tracking
            const nodeStartTime = Date.now();

            // Log input data summary
            const inputSummary = this.summarizeData(transformedOutputs);
            await this.executionLogger.logExecutionEvent(executionId, {
              level: 'info',
              message: `Node ${node.id} starting execution with ${inputSummary}`,
              node_id: node.id,
              data: {
                inputSize: JSON.stringify(transformedOutputs).length,
                inputFields: Object.keys(transformedOutputs).length,
                inputSummary,
              },
            });

            const nodeOutput = await this.nodeExecutor.executeNode(
              node,
              executionId,
              userId,
              transformedOutputs,
            );

            const nodeDuration = Date.now() - nodeStartTime;
            const outputSummary = this.summarizeData(nodeOutput);

            this.logger.log(
              `Node ${node.id} executed successfully in ${nodeDuration}ms, output: ${outputSummary}`,
            );

            // Log output data summary
            await this.executionLogger.logExecutionEvent(executionId, {
              level: 'info',
              message: `Node ${node.id} completed with ${outputSummary}`,
              node_id: node.id,
              data: {
                duration: nodeDuration,
                outputSize: JSON.stringify(nodeOutput).length,
                outputFields:
                  typeof nodeOutput === 'object'
                    ? Object.keys(nodeOutput).length
                    : 0,
                outputSummary,
              },
            });

            // Validate output data after execution
            const outputValidationResult = await this.validateNodeOutputData(
              node,
              nodeOutput,
              executionId,
            );

            if (!outputValidationResult.isValid) {
              this.logger.error(
                `Output validation failed for node ${node.id}: ${outputValidationResult.errors.join(', ')}`,
                { executionId, nodeId: node.id },
              );

              // Log validation errors and FAIL the execution
              await this.executionLogger.logExecutionEvent(executionId, {
                level: 'error',
                message: `Output validation failed for node ${node.id}`,
                node_id: node.id,
                data: {
                  validation_errors: outputValidationResult.errors,
                  output_data: nodeOutput,
                },
              });

              // CRITICAL FIX: Fail the workflow when output validation fails
              throw new Error(
                `Output validation failed for node ${node.id}: ${outputValidationResult.errors.join(', ')}`,
              );
            }

            outputs[node.id] = nodeOutput;

            // Save output data state
            await this.dataStateService.saveDataState(
              executionId,
              node.id,
              nodeOutput,
              { tags: ['output', 'completed'] },
            );
          } catch (nodeError) {
            // Handle node execution error
            const endTime = new Date();
            const duration = endTime.getTime() - startTime.getTime();

            // Update block status to failed
            await this.databaseService.prisma.blockExecution.update({
              where: { id: blockExecution.id },
              data: {
                status: 'failed',
                endTime: endTime,
                output: null,
              },
            });

            // Update node_executions status to failed
            await this.databaseService.prisma.nodeExecution.update({
              where: {
                executionId_nodeId: {
                  executionId,
                  nodeId: node.id,
                },
              },
              data: {
                status: 'failed',
                completedAt: endTime,
                error:
                  nodeError instanceof Error
                    ? nodeError.message
                    : String(nodeError),
              },
            });

            // Send real-time update: node execution failed
            await this.executionMonitorService.updateNodeExecution({
              executionId,
              nodeId: node.id,
              status: 'failed',
              error:
                nodeError instanceof Error
                  ? nodeError.message
                  : String(nodeError),
              duration,
              nodeType: node.data?.type || node.data?.blockType || node.type,
              nodeLabel: node.data?.label || node.data?.name || node.id,
              startTime: startTime,
              endTime: endTime,
            });

            throw nodeError; // Re-throw to fail the workflow
          }

          // Update block status to completed
          const endTime = new Date();
          const duration = endTime.getTime() - startTime.getTime();

          await this.databaseService.prisma.blockExecution.update({
            where: { id: blockExecution.id },
            data: {
              status: 'completed',
              endTime: endTime,
              output: outputs[node.id],
            },
          });

          // Update node_executions status to completed
          await this.databaseService.prisma.nodeExecution.update({
            where: {
              executionId_nodeId: {
                executionId,
                nodeId: node.id,
              },
            },
            data: {
              status: 'completed',
              completedAt: endTime,
              outputData: outputs[node.id],
            },
          });

          // Send real-time update: node execution completed
          await this.executionMonitorService.updateNodeExecution({
            executionId,
            nodeId: node.id,
            status: 'completed',
            output: outputs[node.id],
            duration,
            nodeType: node.data?.type || node.data?.blockType || node.type,
            nodeLabel: node.data?.label || node.data?.name || node.id,
            startTime: startTime,
            endTime: endTime,
          });

          this.logger.log(
            `[executionId=${executionId}] Completed node ${node.id} in ${duration}ms`,
          );

          // Remove from active executions after successful completion
          activeNodeExecutions.delete(node.id);
        } catch (nodeError: any) {
          // Remove from active executions on error
          activeNodeExecutions.delete(node.id);

          this.logger.error(
            `[executionId=${executionId}] Error executing node ${node.id}: ${nodeError.message || 'Unknown error'}`,
          );

          this.logger.error(
            `[executionId=${executionId}] Node ${node.id} execution failed with error:`,
            nodeError,
          );

          // Clean up any active node executions
          await this.cleanupActiveNodeExecutions(
            executionId,
            activeNodeExecutions,
            nodeError.message,
          );

          // CRITICAL FIX: Stop workflow execution immediately when a node fails
          // Don't continue to next nodes - halt the entire workflow
          throw nodeError; // This will be caught by the outer try-catch and fail the workflow
        }
      }

      const duration = (Date.now() - start) / 1000;
      this.logger.log(
        `[executionId=${executionId}] Workflow completed successfully in ${duration}s`,
      );

      // Send real-time update: workflow completed
      await this.executionMonitorService.completeExecution(
        executionId,
        outputs,
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

      // Record successful execution in circuit breaker
      await this.multiLevelCircuitBreaker.recordSuccess(executionContext);

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

      // Record failure in circuit breaker
      await this.multiLevelCircuitBreaker.recordFailure(
        executionContext,
        error as Error,
      );

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

      // Send real-time update: workflow failed
      await this.executionMonitorService.failExecution(
        executionId,
        finalError || 'Unknown error',
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

  /**
   * Enhanced data flow validation - validate input data before node execution
   */
  private async validateNodeInputData(
    node: any,
    inputData: Record<string, any>,
    executionId: string,
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const nodeId = node.id;
    const blockType = node.data?.blockType || node.data?.type || node.type;

    try {
      // Get enhanced block schema for validation
      const enhancedSchema = getEnhancedBlockSchema(blockType as BlockType);

      if (enhancedSchema) {
        // Get execution details to get userId
        const execution =
          await this.databaseService.executions.findById(executionId);
        const userId = execution?.userId || 'unknown';

        // Validate input data against schema
        try {
          enhancedSchema.inputSchema.parse({
            data: inputData,
            context: {
              workflowId: executionId,
              executionId,
              userId,
              timestamp: new Date().toISOString(),
            },
          });
        } catch (validationError: any) {
          if (validationError.errors) {
            validationError.errors.forEach((err: any) => {
              errors.push(`${err.path?.join('.')}: ${err.message}`);
            });
          } else {
            errors.push(validationError.message || 'Schema validation failed');
          }
        }
      }

      // Additional validation based on block type
      switch (blockType) {
        case BlockType.HTTP_REQUEST:
        case BlockType.WEBHOOK:
          if (
            node.data?.config?.url &&
            !this.isValidUrl(node.data.config.url)
          ) {
            errors.push('Invalid URL format');
          }
          break;

        case BlockType.EMAIL:
          if (
            node.data?.config?.to &&
            !this.isValidEmail(node.data.config.to)
          ) {
            errors.push('Invalid email address format');
          }
          break;

        case BlockType.CONDITION:
          if (
            !node.data?.config?.condition ||
            node.data.config.condition.trim() === ''
          ) {
            errors.push('Condition expression is required');
          }
          break;

        case BlockType.DATA_TRANSFORM:
          if (!node.data?.config?.code || node.data.config.code.trim() === '') {
            errors.push('Transformation code is required');
          }
          break;
      }

      // Log validation results
      if (errors.length > 0) {
        await this.executionLogger.logExecutionEvent(executionId, {
          level: 'warn',
          message: `Input validation failed for node ${nodeId}`,
          node_id: nodeId,
          data: {
            block_type: blockType,
            validation_errors: errors,
            input_data: inputData,
          },
        });
      }
    } catch (error) {
      this.logger.error(
        `Error during input validation for node ${nodeId}:`,
        error,
      );
      errors.push('Validation process failed');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Enhanced data flow validation - validate output data after node execution
   */
  private async validateNodeOutputData(
    node: any,
    outputData: any,
    executionId: string,
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const nodeId = node.id;
    const blockType = node.data?.blockType || node.data?.type || node.type;

    try {
      // Get enhanced block schema for validation
      const enhancedSchema = getEnhancedBlockSchema(blockType as BlockType);

      if (enhancedSchema) {
        // Validate output data against schema
        try {
          enhancedSchema.outputSchema.parse(outputData);
        } catch (validationError: any) {
          if (validationError.errors) {
            validationError.errors.forEach((err: any) => {
              errors.push(`${err.path?.join('.')}: ${err.message}`);
            });
          } else {
            errors.push(
              validationError.message || 'Output schema validation failed',
            );
          }
        }
      }

      // Additional validation based on block type
      switch (blockType) {
        case BlockType.HTTP_REQUEST:
        case BlockType.WEBHOOK:
          if (outputData && typeof outputData.status !== 'number') {
            errors.push('HTTP response should include status code');
          }
          break;

        case BlockType.EMAIL:
          if (outputData && !outputData.messageId) {
            errors.push('Email output should include messageId');
          }
          break;

        case BlockType.CONDITION:
          if (outputData && typeof outputData.outcome !== 'boolean') {
            errors.push('Condition output should include boolean outcome');
          }
          break;

        case BlockType.PRICE_MONITOR:
          if (outputData) {
            if (typeof outputData.price !== 'number') {
              errors.push('Price monitor should output numeric price');
            }
            if (typeof outputData.conditionMet !== 'boolean') {
              errors.push('Price monitor should output boolean conditionMet');
            }
          }
          break;
      }

      // Log validation results
      if (errors.length > 0) {
        await this.executionLogger.logExecutionEvent(executionId, {
          level: 'warn',
          message: `Output validation warnings for node ${nodeId}`,
          node_id: nodeId,
          data: {
            block_type: blockType,
            validation_errors: errors,
            output_data: outputData,
          },
        });
      }
    } catch (error) {
      this.logger.error(
        `Error during output validation for node ${nodeId}:`,
        error,
      );
      errors.push('Output validation process failed');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Utility methods for validation
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Summarize data for logging purposes
   */
  private summarizeData(data: any): string {
    if (!data) return 'no data';

    if (typeof data === 'string') {
      return data.length > 50 ? `${data.substring(0, 50)}...` : data;
    }

    if (typeof data === 'object') {
      const keys = Object.keys(data);
      if (keys.length === 0) return 'empty object';

      if (keys.length <= 3) {
        return `object with ${keys.length} fields: ${keys.join(', ')}`;
      }

      return `object with ${keys.length} fields: ${keys.slice(0, 3).join(', ')}...`;
    }

    return String(data);
  }

  /**
   * Apply data transformations between nodes if needed
   */
  private async applyDataTransformations(
    node: any,
    inputData: Record<string, any>,
    executionId: string,
  ): Promise<Record<string, any>> {
    const nodeType = node.data?.blockType || node.data?.type || node.type;

    // Check if this node has specific data transformation requirements
    if (nodeType === 'DATA_TRANSFORM') {
      // For DATA_TRANSFORM blocks, apply the configured transformations
      const transformConfig = node.data?.config;
      if (transformConfig?.transformations) {
        try {
          const pipeline = {
            id: `pipeline-${node.id}`,
            transformations: transformConfig.transformations,
            metadata: {
              name: `Transform for ${node.id}`,
              description: 'Node-specific data transformation',
              version: '1.0.0',
            },
          };

          const result = await this.dataTransformationService.applyPipeline(
            inputData,
            pipeline,
          );

          if (result.success) {
            this.logger.debug(
              `Applied data transformations for node ${node.id}: ${result.metadata.transformationsApplied} transformations`,
            );
            return result.data;
          } else {
            this.logger.warn(
              `Data transformation failed for node ${node.id}: ${result.errors.join(', ')}`,
            );
            return inputData; // Fallback to original data
          }
        } catch (error) {
          this.logger.error(
            `Error applying data transformations for node ${node.id}:`,
            error,
          );
          return inputData;
        }
      }
    }

    // For other node types, apply basic filtering to keep only relevant data
    const relevantKeys = this.getRelevantDataKeys(node, inputData);
    if (relevantKeys.length > 0) {
      const filtered = this.dataTransformationService.filterRelevantData(
        inputData,
        relevantKeys,
      );
      return filtered;
    }

    return inputData;
  }

  /**
   * Determine which data keys are relevant for a specific node
   */
  private getRelevantDataKeys(
    node: any,
    inputData: Record<string, any>,
  ): string[] {
    const nodeType = node.data?.blockType || node.data?.type || node.type;
    const allKeys = Object.keys(inputData);

    // For most block types, all input data is potentially relevant
    // But we can filter out obvious system metadata
    const systemKeys = ['_metadata', '_version', '_timestamp', '_executionId'];
    return allKeys.filter((key) => !systemKeys.includes(key));
  }

  /**
   * Enhanced data flow validation - validate input data before node execution
   * (Enhanced version of the existing method)
   */
  private async validateNodeInputDataEnhanced(
    node: any,
    inputData: Record<string, any>,
    executionId: string,
  ): Promise<{ isValid: boolean; errors: string[] }> {
    // Use the existing validation method
    const basicValidation = await this.validateNodeInputData(
      node,
      inputData,
      executionId,
    );

    // Add enhanced validations
    const enhancedErrors: string[] = [...basicValidation.errors];

    try {
      // Check data freshness
      const freshness = await this.dataStateService.checkDataFreshness(node.id);
      if (!freshness.isFresh) {
        enhancedErrors.push(
          `Input data may be stale due to dependencies: [${freshness.staleDependencies.join(', ')}]`,
        );
      }

      // Check data size limits
      const dataSize = JSON.stringify(inputData).length;
      if (dataSize > 1024 * 1024) {
        // 1MB limit
        enhancedErrors.push(
          `Input data size (${Math.round(dataSize / 1024)}KB) exceeds recommended limit of 1MB`,
        );
      }

      // Node-specific validations
      const nodeType = node.data?.blockType || node.data?.type || node.type;

      if (nodeType === 'HTTP_REQUEST') {
        // Validate HTTP request data structure
        if (inputData.url && typeof inputData.url !== 'string') {
          enhancedErrors.push('HTTP request URL must be a string');
        }
      } else if (nodeType === 'EMAIL') {
        // Validate email data structure
        if (inputData.to && !this.isValidEmail(inputData.to)) {
          enhancedErrors.push('Invalid email address format in input data');
        }
      }
    } catch (error) {
      this.logger.error(
        `Error during enhanced input validation for node ${node.id}:`,
        error,
      );
      enhancedErrors.push('Enhanced validation process failed');
    }

    return {
      isValid: enhancedErrors.length === 0,
      errors: enhancedErrors,
    };
  }
}
