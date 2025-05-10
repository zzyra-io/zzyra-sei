import { Injectable } from '@nestjs/common';
import type { ExecutionContext } from '../../types/execution';
import type { Node as WorkflowNode } from '../../types/workflow';
import * as vm from 'vm';
import { BlockHandler, BlockExecutionContext } from '@zyra/types';
import { createServiceClient } from '../../lib/supabase/serviceClient';


interface CustomBlockRecord {
  id: string;
  handler_code: string;
  outputs?: Record<string, any>;
}

@Injectable()
export class CustomBlockHandler implements BlockHandler {
  private supabase = createServiceClient();
  private logger = console;
  
  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    return this.executeBlock(node, ctx as any);
  }
  private readonly MAX_EXECUTION_TIME = 10000; // 10 seconds
  private readonly MAX_MEMORY_SANDBOX = 50 * 1024 * 1024; // 50MB

  async executeBlock(node: WorkflowNode, ctx: ExecutionContext): Promise<any> {
    const blockId = node.data.blockId;
    const inputs = node.data.inputs || {};

    // Create execution record
    const { data: executionData, error: createError } = await this.supabase
      .from('block_executions')
      .insert({
        node_id: node.id,
        workflow_execution_id: ctx.executionId,
        block_type: 'custom',
        status: 'running',
        started_at: new Date().toISOString(),
        inputs,
      })
      .select('id, started_at')
      .single();

    if (createError) {
      throw new Error(`Failed to create block execution: ${createError.message}`);
    }

    if (!executionData) {
      throw new Error('Failed to create block execution record');
    }

    const executionId = executionData.id;
    const startedAt = executionData.started_at;

    try {
      // Get the custom block code
      const { data: customBlock, error: blockError } = await this.supabase
        .from('custom_blocks')
        .select('handler_code, outputs')
        .eq('id', blockId)
        .single();

      if (blockError || !customBlock) {
        throw new Error(`Custom block not found: ${blockId}`);
      }
      
      // Use type assertions to work around TypeScript errors
      const handlerCode = (customBlock as any).handler_code || '';
      const outputDefs = (customBlock as any).outputs || {};

      // Create sandbox context
      const sandbox = {
        inputs,
        console: {
          log: (...args: any[]) => this.log(executionId, node.id, 'info', args.join(' ')),
          error: (...args: any[]) => this.log(executionId, node.id, 'error', args.join(' ')),
          warn: (...args: any[]) => this.log(executionId, node.id, 'warn', args.join(' ')),
        },
      };

      // Execute the code in sandbox with timeout
      const script = new vm.Script(handlerCode);
      const context = vm.createContext(sandbox);
      const result = await Promise.race([
        script.runInContext(context, { 
          timeout: this.MAX_EXECUTION_TIME,
          displayErrors: true,
        }),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Execution timeout')),
            this.MAX_EXECUTION_TIME,
          ),
        ),
      ]);

      // Validate outputs
      const validatedResult = this.validateOutputs(outputDefs, result);

      // Update block execution status
      await this.supabase
        .from('block_executions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          outputs: validatedResult,
          execution_time_ms: Date.now() - new Date(startedAt).getTime(),
        })
        .eq('id', executionId);

      return validatedResult;

    } catch (error: any) {
      this.logger.error(
        `JavaScript execution error: ${error.message}`,
        error.stack,
      );

      // Update block execution status
      await this.supabase
        .from('block_executions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error: error.message,
          execution_time_ms: Date.now() - new Date(startedAt).getTime(),
        })
        .eq('id', executionId);

      throw new Error(`Template execution failed: ${error.message}`);
    }
  }

  public async log(
    executionId: string,
    nodeId: string,
    level: 'info' | 'error' | 'warn',
    message: string,
  ): Promise<void> {
    await this.supabase
      .from('block_execution_logs')
      .insert({
        execution_id: executionId,
        node_id: nodeId,
        level,
        message,
        timestamp: new Date().toISOString(),
      });
  }

  public validateOutputs(expectedOutputs: Record<string, any>, actualOutputs: any): Record<string, any> {
    // For now, just return the actual outputs
    // TODO: Implement output validation based on schema
    return actualOutputs;
  }

  private async executeCondition(
    customBlock: any,
    previousOutputs: any,
  ): Promise<any> {
    // Condition evaluation
    try {
      const sandbox = {
        inputs: previousOutputs,
        result: false,
      };

      const script = new vm.Script(`
        result = Boolean(${customBlock.code});
      `);

      script.runInNewContext(sandbox, { timeout: 1000 });
      return { result: sandbox.result };
    } catch (error: any) {
      throw new Error(`Condition evaluation failed: ${error.message}`);
    }
  }

  /**
   * Special handler for Google Drive monitoring blocks
   */
  private async handleGoogleDriveMonitoring(
    node: any,
    previousOutputs: any,
    logger: any,
  ): Promise<any> {
    logger.log('Handling Google Drive monitoring block', { previousOutputs });

    try {
      // Extract inputs from node data or previous outputs
      const folderId = node.data?.config?.folderId || previousOutputs?.folderId;
      const checkIntervalSeconds =
        node.data?.config?.checkIntervalSeconds || 60;
      const credentials =
        node.data?.config?.credentials || previousOutputs?.credentials;

      // Validate required inputs
      if (!folderId) {
        throw new Error('Google Drive folder ID is required');
      }

      // In a production implementation, this would:
      // 1. Use the Google Drive API to authenticate with credentials
      // 2. Query the folder for new files since the last check
      // 3. Store the last check time in a database
      // 4. Return metadata for any new files

      logger.log(`Checking Google Drive folder ${folderId} for new files`);

      // For now, return mock data to demonstrate the flow
      // In production, this would be replaced with actual API calls
      const mockFileData = {
        fileName: 'example.pdf',
        fileType: 'application/pdf',
        fileLink: `https://drive.google.com/file/d/${folderId}/view`,
        createdTime: new Date().toISOString(),
        fileMetadata: {
          id: '1234567890',
          name: 'example.pdf',
          mimeType: 'application/pdf',
          webViewLink: `https://drive.google.com/file/d/${folderId}/view`,
          createdTime: new Date().toISOString(),
          modifiedTime: new Date().toISOString(),
          size: '1024000',
        },
      };

      logger.log('Google Drive monitoring completed successfully', {
        result: mockFileData,
      });
      return mockFileData;
    } catch (error: any) {
      logger.error('Google Drive monitoring failed', { error: error.message });
      throw error;
    }
  }

  private applyTransform(transform: any, data: any): any {
    // Recursive function to apply JSON transformation
    if (typeof transform !== 'object' || transform === null) {
      return transform;
    }

    if (Array.isArray(transform)) {
      return transform.map((item) => this.applyTransform(item, data));
    }

    const result: any = {};
    for (const [key, value] of Object.entries(transform)) {
      if (typeof value === 'string' && value.startsWith('$.')) {
        // Path reference like $.inputs.fieldName
        const path = value.substring(2).split('.');
        let current = data;
        for (const segment of path) {
          if (current === undefined || current === null) break;
          current = current[segment];
        }
        result[key] = current;
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.applyTransform(value, data);
      } else {
        result[key] = value;
      }
    }

    return result;
  }
}
