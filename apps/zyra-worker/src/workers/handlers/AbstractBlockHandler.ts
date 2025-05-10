import { Injectable, Logger } from '@nestjs/common';


import { createServiceClient } from '../../lib/supabase/serviceClient';
import { BlockExecutionContext, BlockHandler } from '@zyra/types';


/**
 * Abstract base class for block handlers
 * Provides common functionality for tracking execution and logs
 */
@Injectable()
export abstract class AbstractBlockHandler implements BlockHandler {
  protected readonly logger = new Logger(this.constructor.name);
  protected readonly supabase = createServiceClient();

  /**
   * Execute the block
   * This method must be implemented by all handlers
   * @param node The node to execute
   * @param ctx The execution context
   */
  abstract execute(node: any, ctx: BlockExecutionContext): Promise<any>;

  /**
   * Start tracking execution of a block
   * @param nodeId The ID of the node being executed
   * @param executionId The workflow execution ID
   * @param blockType The type of block being executed
   */
  protected async startExecution(
    nodeId: string,
    executionId: string,
    blockType: string,
  ): Promise<string> {
    try {
      const { data, error } = await this.supabase
        .from('node_executions')
        .insert({
          node_id: nodeId,
          execution_id: executionId,
          block_type: blockType,
          status: 'running',
          started_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (error) {
        this.logger.error(`Failed to start execution tracking: ${String(error)}`);
        return '';
      }

      return data.id;
    } catch (error: any) {
      this.logger.error(`Error starting execution tracking: ${error?.message || 'Unknown error'}`);
      return '';
    }
  }

  /**
   * Complete execution tracking for a block
   * @param blockExecutionId The ID of the block execution record
   * @param status The final status of the execution
   * @param result The result of the execution
   * @param error Any error that occurred during execution
   */
  protected async completeExecution(
    blockExecutionId: string,
    status: 'completed' | 'failed',
    result?: any,
    error?: Error,
  ): Promise<void> {
    if (!blockExecutionId) return;

    try {
      const { error: dbError } = await this.supabase
        .from('node_executions')
        .update({
          status,
          completed_at: new Date().toISOString(),
          result: result ? JSON.stringify(result) : null,
          error: error ? error.message : null,
        })
        .eq('id', blockExecutionId);

      if (dbError) {
        this.logger.error(`Failed to complete execution tracking: ${String(dbError)}`);
      }
    } catch (error: any) {
      this.logger.error(`Error completing execution tracking: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Track a log message for a block execution
   * @param executionId The workflow execution ID
   * @param nodeId The ID of the node being executed
   * @param level The log level
   * @param message The log message
   */
  protected async trackLog(
    executionId: string,
    nodeId: string,
    level: 'info' | 'error' | 'warn' | 'debug',
    message: string,
  ): Promise<void> {
    try {
      const { error } = await this.supabase.from('node_logs').insert({
        execution_id: executionId,
        node_id: nodeId,
        level,
        message,
        timestamp: new Date().toISOString(),
      });

      if (error) {
        this.logger.error(`Failed to track log: ${String(error)}`);
      }
    } catch (error: any) {
      this.logger.error(`Error tracking log: ${error?.message || 'Unknown error'}`);
    }
  }

  /**
   * Helper method to extract node data safely
   * @param node The node to extract data from
   */
  protected getNodeData(node: any): { nodeId: string; type: string; config: any; inputs: any } {
    const nodeId = node?.id || 'unknown-node';
    const type = node?.type || 'unknown-type';
    const config = node?.data?.config || {};
    const inputs = node?.data?.inputs || {};

    return { nodeId, type, config, inputs };
  }

  /**
   * Helper method to handle errors consistently
   * @param error The error that occurred
   * @param nodeId The ID of the node being executed
   * @param executionId The workflow execution ID
   * @param blockExecutionId The ID of the block execution record
   */
  protected async handleError(
    error: unknown,
    nodeId: string,
    executionId: string,
    blockExecutionId: string,
  ): Promise<never> {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    this.logger.error(`Block execution failed: ${errorMessage}`);
    await this.trackLog(executionId, nodeId, 'error', `Execution failed: ${errorMessage}`);
    await this.completeExecution(
      blockExecutionId, 
      'failed', 
      null, 
      error instanceof Error ? error : new Error(errorMessage)
    );
    throw error;
  }
}
