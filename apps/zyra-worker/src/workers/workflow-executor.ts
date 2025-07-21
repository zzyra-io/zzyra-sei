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
import { MultiLevelCircuitBreakerService, ExecutionContext } from '../services/multi-level-circuit-breaker.service';
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
        executionId
      };

      const circuitCheck = await this.multiLevelCircuitBreaker.shouldAllowExecution(executionContext);
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
            reason: circuitCheck.reason
          },
        });

        // Record the execution as failed due to circuit breaker
        await this.executionMonitorService.failExecution(executionId, error);

        return {
          status: 'failed',
          outputs: {},
          error
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
        { nodes, edges }
      );

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

          // Update block status to running and send real-time update
          const startTime = new Date();
          await this.databaseService.prisma.blockExecution.update({
            where: { id: blockExecution.id },
            data: {
              status: 'running',
              startTime: startTime,
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
            // Validate input data before execution
            const inputValidationResult = await this.validateNodeInputData(
              node,
              relevantOutputs,
              executionId
            );

            if (!inputValidationResult.isValid) {
              throw new Error(
                `Input validation failed for node ${node.id}: ${inputValidationResult.errors.join(', ')}`
              );
            }

            // Execute the node
            const nodeOutput = await this.nodeExecutor.executeNode(
              node,
              executionId,
              userId,
              relevantOutputs,
            );

            // Validate output data after execution
            const outputValidationResult = await this.validateNodeOutputData(
              node,
              nodeOutput,
              executionId
            );

            if (!outputValidationResult.isValid) {
              this.logger.warn(
                `Output validation warnings for node ${node.id}: ${outputValidationResult.errors.join(', ')}`,
                { executionId, nodeId: node.id }
              );
              
              // Log validation warnings but don't fail execution
              await this.executionLogger.logExecutionEvent(executionId, {
                level: 'warn',
                message: `Output validation warnings for node ${node.id}`,
                node_id: node.id,
                data: {
                  validation_errors: outputValidationResult.errors,
                  output_data: nodeOutput,
                },
              });
            }

            outputs[node.id] = nodeOutput;

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

            // Send real-time update: node execution failed
            await this.executionMonitorService.updateNodeExecution({
              executionId,
              nodeId: node.id,
              status: 'failed',
              error: nodeError instanceof Error ? nodeError.message : String(nodeError),
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

      // Send real-time update: workflow completed
      await this.executionMonitorService.completeExecution(executionId, outputs);

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
      await this.multiLevelCircuitBreaker.recordFailure(executionContext, error as Error);

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
      await this.executionMonitorService.failExecution(executionId, finalError || 'Unknown error');

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
    executionId: string
  ): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const nodeId = node.id;
    const blockType = node.data?.blockType || node.data?.type || node.type;

    try {
      // Get enhanced block schema for validation
      const enhancedSchema = getEnhancedBlockSchema(blockType as BlockType);
      
      if (enhancedSchema) {
        // Validate input data against schema
        try {
          enhancedSchema.inputSchema.parse({
            data: inputData,
            context: {
              workflowId: executionId,
              executionId,
              nodeId,
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
          if (node.data?.config?.url && !this.isValidUrl(node.data.config.url)) {
            errors.push('Invalid URL format');
          }
          break;

        case BlockType.EMAIL:
          if (node.data?.config?.to && !this.isValidEmail(node.data.config.to)) {
            errors.push('Invalid email address format');
          }
          break;

        case BlockType.CONDITION:
          if (!node.data?.config?.condition || node.data.config.condition.trim() === '') {
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
      this.logger.error(`Error during input validation for node ${nodeId}:`, error);
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
    executionId: string
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
            errors.push(validationError.message || 'Output schema validation failed');
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
      this.logger.error(`Error during output validation for node ${nodeId}:`, error);
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
}
