import { Injectable, Logger } from '@nestjs/common';
import { trace } from '@opentelemetry/api';
import { createServiceClient } from '../lib/supabase/serviceClient';
import { Database } from '../types/supabase';
import { getBlockType,  } from '../types/workflow';
import { ExecutionLogger } from './execution-logger';

import { BlockHandlerRegistry } from './handlers/BlockHandlerRegistry';
import { BlockType, BlockExecutionContext, BlockHandler } from '@zyra/types';


// Circuit breaker implementation
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private threshold: number = 5,
    private timeout: number = 30000,
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      // Check if timeout has elapsed
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      if (this.state === 'HALF_OPEN') {
        this.reset();
      }
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.failures >= this.threshold) {
        this.state = 'OPEN';
      }

      throw error;
    }
  }

  private reset() {
    this.failures = 0;
    this.state = 'CLOSED';
  }
}

@Injectable()
export class NodeExecutor {
  private readonly logger = new Logger(NodeExecutor.name);
  private tracer = trace.getTracer('workflow-execution');
  private handlers: Record<BlockType, BlockHandler>;
  private circuitBreaker: CircuitBreaker;

  private static readonly MAX_RETRIES = parseInt(
    process.env.MAX_RETRIES || '3',
    10,
  );
  private static readonly RETRY_BACKOFF_MS = parseInt(
    process.env.RETRY_BACKOFF_MS || '1000',
    10,
  );
  private static readonly RETRY_JITTER_MS = parseInt(
    process.env.RETRY_JITTER_MS || '500',
    10,
  );
  private static readonly NODE_EXECUTION_TIMEOUT = parseInt(
    process.env.NODE_EXECUTION_TIMEOUT || '300000', // 5 minutes default
    10,
  );

  constructor(private readonly executionLogger: ExecutionLogger) {
    this.circuitBreaker = new CircuitBreaker();
    // Initialize BlockHandlerRegistry with class-level logger
    const registry = new BlockHandlerRegistry(this.logger);
    this.handlers = registry.getAllHandlers();
  }

  async executeNode(
    node: any,
    executionId: string,
    userId: string,
    previousOutputs: Record<string, any>,
  ): Promise<any> {
    const span = this.tracer.startSpan('execute_node', {
      attributes: { executionId, nodeId: node.id },
    });

    // Emit 'started' status to execution_node_status table
    console.log(
      `Emitting 'started' status for node ID: ${node.id} in execution ${executionId}`,
    );
    const supabase = createServiceClient();
    try {
      await supabase.from('execution_node_status').insert({
        execution_id: executionId,
        node_id: node.id,
        status: 'started',
      });
      console.log(`Successfully inserted 'started' status for node ${node.id}`);
    } catch (error) {
      console.error(`Error inserting node status for ${node.id}:`, error);
    }

    // Set a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            `Node execution timed out after ${NodeExecutor.NODE_EXECUTION_TIMEOUT}ms`,
          ),
        );
      }, NodeExecutor.NODE_EXECUTION_TIMEOUT);
    });

    try {
      // Check for pause
      const { data: pause } = await supabase
        .from('workflow_pauses')
        .select('*')
        .match({
          execution_id: executionId,
          node_id: node.id,
          resumed_at: null,
        })
        .single();

      if (pause) {
        throw new Error(`Node ${node.id} is paused`);
      }

      const blockType = getBlockType(node.data);
      const handler = this.handlers[blockType];

      if (!handler) {
        throw new Error(`No handler for block type: ${blockType}`);
      }

      const nodeExec = await this.getOrCreateNodeExecution(
        supabase,
        executionId,
        node.id,
      );

      if (nodeExec.status === 'completed') {
        this.logger.log(
          `Node ${node.id} already completed, returning cached output`,
        );
        return nodeExec.output;
      }

      let attempt = nodeExec.retry_count || 0;
      let result;

      while (attempt < NodeExecutor.MAX_RETRIES) {
        const startTime = Date.now();

        try {
          await supabase
            .from('node_executions')
            .update({
              status: 'running',
              retry_count: attempt,
              started_at: new Date().toISOString(),
            })
            .match({ execution_id: executionId, node_id: node.id });

          this.logger.log(`Executing node ${node.id}, attempt ${attempt + 1}`);

          // Log node inputs
          await this.executionLogger.logNodeEvent(
            supabase,
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

          // Create context with logger
          // Prepare block data based on type
          const blockData = this.prepareBlockData(node, blockType);

          const ctx: BlockExecutionContext = {
            executionId,
            userId,
            previousOutputs,
            logger: this.executionLogger.createNodeLogger(
              supabase,
              executionId,
              node.id,
            ),
            workflowData: {
              nodeId: node.id,
              nodeType: blockType,
              executionTime: new Date().toISOString(),
            },
          };

          // Update node with prepared data
          node.data = blockData;

          // Execute with circuit breaker and timeout protection
          result = await Promise.race([
            this.circuitBreaker.execute(() => handler.execute(node, ctx)),
            timeoutPromise,
          ]);

          // Log node output
          await this.executionLogger.logNodeEvent(
            supabase,
            executionId,
            node.id,
            'info',
            `Node execution completed`,
            { output: result },
          );

          // Update execution status
          await supabase
            .from('node_executions')
            .update({
              status: 'completed',
              output: result,
              error: null,
              finished_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
            })
            .match({ execution_id: executionId, node_id: node.id });

          // Emit 'success' status
          console.log(
            `Emitting 'success' status for node ID: ${node.id} in execution ${executionId}`,
          );
          try {
            await supabase.from('execution_node_status').insert({
              execution_id:
                executionId as unknown as Database['public']['Tables']['workflow_executions']['Row']['id'],
              node_id: node.id,
              status: 'success',
            });
            console.log(
              `Successfully inserted 'success' status for node ${node.id}`,
            );
          } catch (error) {
            console.error(
              `Error inserting success status for ${node.id}:`,
              error,
            );
          }

          const duration = Date.now() - startTime;
          await this.executionLogger.logNodeEvent(
            supabase,
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

          // Enhance error details
          const errorDetails = {
            message: err.message,
            stack: err.stack,
            duration_ms: duration,
            nodeType: node.type,
            blockType: blockType,
            config: node.data?.config,
            inputs: previousOutputs,
            attempt,
            maxRetries: NodeExecutor.MAX_RETRIES
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
            supabase,
            executionId,
            node.id,
            'error',
            `Error executing ${node.type} node: ${err.message}`,
            errorDetails
          );

          // Update node execution with detailed status
          await supabase
            .from('node_executions')
            .update({
              status: 'failed',
              error: err.message,
              error_details: errorDetails,
              retry_count: attempt,
              finished_at: new Date().toISOString(),
              completed_at: new Date().toISOString(),
            })
            .match({ execution_id: executionId, node_id: node.id });

          // Emit 'error' status
          console.log(
            `Emitting 'error' status for node ID: ${node.id} in execution ${executionId}`,
          );
          try {
            await supabase.from('execution_node_status').insert({
              execution_id:
                executionId as unknown as Database['public']['Tables']['workflow_executions']['Row']['id'],
              node_id: node.id,
              status: 'error',
            });
            console.log(
              `Successfully inserted 'error' status for node ${node.id}`,
            );
          } catch (error) {
            console.error(
              `Error inserting error status for ${node.id}:`,
              error,
            );
          }

          if (attempt < NodeExecutor.MAX_RETRIES) {
            const jitter = Math.floor(
              Math.random() * NodeExecutor.RETRY_JITTER_MS,
            );
            const delay = NodeExecutor.RETRY_BACKOFF_MS * attempt + jitter;

            this.logger.warn(
              `Node ${node.id} failed, retrying after ${delay}ms: ${err.message}`,
            );

            await this.executionLogger.logNodeEvent(
              supabase,
              executionId,
              node.id,
              'warning',
              `Retrying after ${delay}ms`,
              { attempt, max_retries: NodeExecutor.MAX_RETRIES },
            );

            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }

          this.logger.error(
            `Node ${node.id} failed after ${NodeExecutor.MAX_RETRIES} attempts: ${err.message}`,
          );
          throw err;
        }
      }

      return result;
    } finally {
      span.end();
    }
  }

  private prepareBlockData(node: any, blockType: BlockType) {
    const baseData = node.data || {};

    switch (blockType) {
      case BlockType.AI_BLOCKCHAIN:
        return {
          ...baseData,
          operation: baseData.operation || 'query',
          parameters: baseData.parameters || {},
          config: {
            ...baseData.config,
            timeout: baseData.config?.timeout || 30000,
            retries: baseData.config?.retries || 3,
          },
        };

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

      case BlockType.CUSTOM:
        return {
          ...baseData,
          customBlockId: baseData.customBlockId,
          inputs: baseData.inputs || {},
        };

      default:
        return baseData;
    }
  }

  private async getOrCreateNodeExecution(
    supabase: any,
    executionId: string,
    nodeId: string,
  ) {
    try {
      // Try to get existing node execution
      const { data } = await supabase
        .from('node_executions')
        .select('*')
        .match({ execution_id: executionId, node_id: nodeId })
        .maybeSingle();

      if (data) return data;

      // Create new node execution
      const { data: newData, error } = await supabase
        .from('node_executions')
        .insert({
          execution_id: executionId,
          node_id: nodeId,
          status: 'pending',
          retry_count: 0,
          updated_at: new Date().toISOString(),
        })
        .select('*')
        .single();

      if (error) {
        throw new Error(
          `Failed to create node execution record: ${error.message}`,
        );
      }

      return newData;
    } catch (error) {
      this.logger.error(`Error in getOrCreateNodeExecution: ${error}`);
      throw error;
    }
  }
}
