import { Injectable, Logger } from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import { DatabaseService } from '../services/database.service';
import { MagicAdminService } from '../services/magic-admin.service';
import { ExecutionLogger } from './execution-logger';
import {
  BlockExecutionContext,
  BlockHandler,
  BlockType,
  getEnhancedBlockSchema,
} from '@zyra/types';
import { BlockHandlerRegistry } from './handlers/BlockHandlerRegistry';
import { CircuitBreakerDbService } from '../lib/blockchain/CircuitBreakerDbService';


@Injectable()
export class NodeExecutor {
  private readonly logger = new Logger(NodeExecutor.name);
  private tracer = trace.getTracer('workflow-execution');
  private handlers: Record<BlockType, BlockHandler>;
  private blockHandlerRegistry: BlockHandlerRegistry;
  private circuitBreakerService: CircuitBreakerDbService;

  private static readonly MAX_RETRIES = parseInt(
    process.env.NODE_MAX_RETRIES || '3',
    10,
  );
  private static readonly RETRY_BACKOFF_MS = parseInt(
    process.env.NODE_RETRY_BACKOFF_MS || '1000',
    10,
  );
  private static readonly RETRY_JITTER_MS = parseInt(
    process.env.NODE_RETRY_JITTER_MS || '500',
    10,
  );
  private static readonly NODE_EXECUTION_TIMEOUT = parseInt(
    process.env.NODE_EXECUTION_TIMEOUT || '300000',
    10,
  );

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly executionLogger: ExecutionLogger,
    private readonly magicAdminService: MagicAdminService,
  ) {
    this.circuitBreakerService = new CircuitBreakerDbService(this.databaseService);
    // Initialize BlockHandlerRegistry with class-level logger and database service
    this.blockHandlerRegistry = new BlockHandlerRegistry(
      this.logger,
      this.databaseService,
    );
    this.handlers = this.blockHandlerRegistry.getAllHandlers();
  }

  async executeNode(
    node: any,
    executionId: string,
    userId: string,
    previousOutputs: Record<string, any>,
  ): Promise<any> {
    const span = this.tracer.startSpan('execute_node', {
      attributes: { nodeId: node.id, executionId, userId },
    });

    let attempt = 0;
    let result: any;

    while (attempt < NodeExecutor.MAX_RETRIES) {
      const startTime = Date.now();

      try {
        // Get block type - prioritize blockType from data over generic type
        const blockType = node.data?.blockType || node.data?.type || node.type;
        if (!blockType) {
          throw new Error(`Node ${node.id} has no block type specified`);
        }

        // Get enhanced schema for validation
        const enhancedSchema = getEnhancedBlockSchema(blockType as BlockType);

        // Validate input data against enhanced schema if available
        if (enhancedSchema && previousOutputs) {
          try {
            // Validate input data against the enhanced input schema
            const validatedInputs = enhancedSchema.inputSchema.parse({
              data: previousOutputs,
              context: {
                workflowId: executionId,
                executionId,
                userId,
                timestamp: new Date().toISOString(),
              },
            });

            this.logger.debug(`Input validation passed for ${blockType}`, {
              nodeId: node.id,
              executionId,
            });
          } catch (validationError) {
            this.logger.warn(`Input validation failed for ${blockType}`, {
              nodeId: node.id,
              executionId,
              error:
                validationError instanceof Error
                  ? validationError.message
                  : String(validationError),
            });
            // Continue execution but log the validation issue
          }
        }

        // Debug logging
        this.logger.debug(`Block type resolution for node ${node.id}:`);
        this.logger.debug(`  node.data?.blockType: ${node.data?.blockType}`);
        this.logger.debug(`  node.data?.type: ${node.data?.type}`);
        this.logger.debug(`  node.type: ${node.type}`);
        this.logger.debug(`  final blockType: ${blockType}`);
        this.logger.debug(
          `  available handlers: ${Object.keys(this.handlers).join(', ')}`,
        );

        // Get handler using the registry (case-insensitive)
        const handler = this.blockHandlerRegistry.getHandler(
          blockType as BlockType,
        );

        this.logger.debug(
          `Handler lookup result for ${blockType}: ${handler ? 'found' : 'not found'}`,
        );

        if (!handler) {
          this.logger.error(`No handler found for block type: ${blockType}`);
          this.logger.error(
            `Available block types: ${Object.keys(this.handlers).join(', ')}`,
          );
          throw new Error(
            `No handler found for block type: ${blockType}. Available: ${Object.keys(this.handlers).join(', ')}`,
          );
        }

        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(
              new Error(
                `Node execution timeout after ${NodeExecutor.NODE_EXECUTION_TIMEOUT}ms`,
              ),
            );
          }, NodeExecutor.NODE_EXECUTION_TIMEOUT);
        });

        // Log node start
        await this.executionLogger.logNodeEvent(
          executionId,
          node.id,
          'info',
          `Starting execution of ${blockType} node`,
          {
            input: {
              node_data: node.data,
              previous_outputs: previousOutputs,
            },
          },
        );

        // Fetch the workflow information to get the workflow_id
        const execution =
          await this.databaseService.executions.findById(executionId);
        if (!execution) {
          throw new Error(
            `Could not find workflow execution with ID: ${executionId}`,
          );
        }

        // Create context with logger
        const blockData = this.prepareBlockData(node, blockType);

        const ctx: BlockExecutionContext = {
          nodeId: node.id,
          executionId,
          workflowId: execution.workflowId,
          userId,
          inputs: node.data?.inputs || {},
          config: node.data || {},
          previousOutputs,
          logger: this.executionLogger.createNodeLogger(executionId, node.id),
          workflowData: {
            nodeId: node.id,
            nodeType: blockType,
            executionTime: new Date().toISOString(),
          },
        };

        // Update node with prepared data
        node.data = blockData;

        // Generate circuit ID for this node type
        const circuitId = this.circuitBreakerService.generateCircuitId('node-executor', blockType);
        
        // Check if circuit breaker allows operation
        const isAllowed = await this.circuitBreakerService.isOperationAllowed(circuitId);
        if (!isAllowed) {
          throw new Error(`Circuit breaker is OPEN for ${blockType}`);
        }

        // Execute with timeout protection
        result = await Promise.race([
          handler.execute(node, ctx),
          timeoutPromise,
        ]);
        
        // Record success
        await this.circuitBreakerService.recordSuccess(circuitId);

        // Validate output data against enhanced schema if available
        if (enhancedSchema && result) {
          try {
            // Validate output data against the enhanced output schema
            const validatedOutput = enhancedSchema.outputSchema.parse(result);

            this.logger.debug(`Output validation passed for ${blockType}`, {
              nodeId: node.id,
              executionId,
            });

            // Use validated output
            result = validatedOutput;
          } catch (validationError) {
            this.logger.warn(`Output validation failed for ${blockType}`, {
              nodeId: node.id,
              executionId,
              error:
                validationError instanceof Error
                  ? validationError.message
                  : String(validationError),
            });
            // Continue with original result but log the validation issue
          }
        }

        // Log node output
        await this.executionLogger.logNodeEvent(
          executionId,
          node.id,
          'info',
          `Node execution completed`,
          { output: result },
        );

        // Note: Block execution status is handled by WorkflowExecutor

        const duration = Date.now() - startTime;
        await this.executionLogger.logNodeEvent(
          executionId,
          node.id,
          'info',
          `Node execution duration: ${duration}ms`,
          { duration_ms: duration },
        );

        return result;
      } catch (err: any) {
        attempt++;
        const duration = Date.now() - startTime;

        // Record circuit breaker failure
        const blockType = node.data?.blockType || node.data?.type || node.type;
        if (blockType) {
          try {
            const circuitId = this.circuitBreakerService.generateCircuitId('node-executor', blockType);
            await this.circuitBreakerService.recordFailure(circuitId);
          } catch (cbError) {
            this.logger.warn(`Failed to record circuit breaker failure: ${cbError instanceof Error ? cbError.message : String(cbError)}`);
          }
        }

        // Enhance error details
        const errorDetails = {
          message: err.message,
          stack: err.stack,
          duration_ms: duration,
          nodeType: node.type,
          blockType: node.data?.type || node.data?.blockType || node.type,
          config: node.data?.config,
          inputs: previousOutputs,
          attempt,
          maxRetries: NodeExecutor.MAX_RETRIES,
        };

        // Log detailed error
        this.logger.error(
          `Node ${node.id} execution failed (attempt ${attempt}/${NodeExecutor.MAX_RETRIES}):\n` +
            `Type: ${node.type}\n` +
            `Error: ${err.message}\n` +
            `Config: ${JSON.stringify(node.data?.config, null, 2)}\n` +
            `Inputs: ${JSON.stringify(previousOutputs, null, 2)}`,
        );

        // Log to execution logger
        await this.executionLogger.logNodeEvent(
          executionId,
          node.id,
          'error',
          `Error executing ${node.type} node: ${err.message}`,
          errorDetails,
        );

        // Note: Block execution status is handled by WorkflowExecutor

        if (attempt < NodeExecutor.MAX_RETRIES) {
          const jitter = Math.floor(
            Math.random() * NodeExecutor.RETRY_JITTER_MS,
          );
          const delay = NodeExecutor.RETRY_BACKOFF_MS * attempt + jitter;

          this.logger.warn(
            `Node ${node.id} failed, retrying after ${delay}ms: ${err.message}`,
          );

          await this.executionLogger.logNodeEvent(
            executionId,
            node.id,
            'warn',
            `Retrying after ${delay}ms`,
            { attempt, max_retries: NodeExecutor.MAX_RETRIES },
          );

          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          span.recordException(err);
          span.setStatus({ code: 2, message: err.message });
          throw err;
        }
      }
    }

    throw new Error(
      `Node ${node.id} failed after ${NodeExecutor.MAX_RETRIES} attempts`,
    );
  }

  private prepareBlockData(node: any, blockType: BlockType) {
    const baseData = node.data || {};

    switch (blockType) {
      case BlockType.EMAIL:
        return {
          ...baseData,
          to: baseData.to || '',
          subject: baseData.subject || '',
          body: baseData.body || '',
          config: {
            ...baseData.config,
            template: baseData.config?.template || null,
            attachments: baseData.config?.attachments || [],
          },
        };

      default:
        return baseData;
    }
  }
}
