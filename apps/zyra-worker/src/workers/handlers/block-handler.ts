import { Injectable, Logger } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import type { ExecutionContext } from '../../types/execution';
import { createServiceClient } from '../../lib/supabase/serviceClient';
import type { Node as WorkflowNode } from '../../types/workflow';
import { BlockHandler, BlockExecutionContext } from '@zyra/types';


export interface BlockExecutionRecord {
  id: string;
  node_id: string;
  workflow_execution_id: string;
  block_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  error?: string;
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;
  execution_time_ms?: number;
  created_at: string;
}

@Injectable()
export abstract class BaseBlockHandler implements BlockHandler {
  protected readonly logger: Logger;
  protected readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = createServiceClient();
    this.logger = new Logger(this.constructor.name);
  }

  abstract executeBlock(node: WorkflowNode, ctx: ExecutionContext): Promise<any>;
  
  // Implement the BlockHandler interface
  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    // Call the executeBlock method with the appropriate types
    return this.executeBlock(node as any, ctx as any);
  }

  // This is the actual implementation used by executeBlock
  async _execute(node: WorkflowNode, ctx: ExecutionContext): Promise<any> {
    const startedAt = new Date().toISOString();

    // Create execution record
    const { data: executionData, error: createError } = await this.supabase
      .from('block_executions')
      .insert({
        node_id: node.id,
        workflow_execution_id: ctx.executionId,
        block_type: node.type,
        status: 'running',
        started_at: startedAt,
        inputs: node.data.inputs || {},
      })
      .select('id, started_at')
      .single();

    if (createError) {
      throw new Error(
        `Failed to create block execution: ${createError.message}`,
      );
    }

    if (!executionData) {
      throw new Error('Failed to create block execution record');
    }

    const executionId = executionData.id;

    try {
      // Execute the block's logic
      const result = await this.executeBlock(node, ctx);

      // Update execution status to completed
      await this.supabase
        .from('block_executions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          outputs: result,
          execution_time_ms: Date.now() - new Date(startedAt).getTime(),
        })
        .eq('id', executionId);

      return result;
    } catch (error: any) {
      this.logger.error(`Block execution error: ${error.message}`, error.stack);

      // Update execution status to failed
      await this.supabase
        .from('block_executions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error: error.message,
          execution_time_ms: Date.now() - new Date(startedAt).getTime(),
        })
        .eq('id', executionId);

      throw error;
    }
  }
}
