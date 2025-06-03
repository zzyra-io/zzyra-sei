import { Injectable, Logger } from '@nestjs/common';
import { BlockExecutionContext, BlockHandler } from '@zyra/types';
import { DatabaseService } from '../../services/database.service';

/**
 * Abstract base class for block handlers
 * Provides common functionality for tracking execution and logs
 */
@Injectable()
export abstract class AbstractBlockHandler implements BlockHandler {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(protected readonly databaseService: DatabaseService) {}

  /**
   * Execute the block
   * This method must be implemented by all handlers
   * @param node The node to execute
   * @param ctx The execution context
   */
  abstract execute(node: any, ctx: BlockExecutionContext): Promise<any>;

  /**
   * Track the start of block execution
   */
  protected async startExecution(
    nodeId: string,
    executionId: string,
    blockType: string,
  ): Promise<string> {
    try {
      const blockExecution =
        await this.databaseService.prisma.blockExecution.create({
          data: {
            nodeId,
            executionId,
            blockType,
            status: 'running',
            startTime: new Date(),
          },
        });
      return blockExecution.id;
    } catch (error: any) {
      this.logger.error(`Failed to start execution tracking: ${error.message}`);
      return '';
    }
  }

  /**
   * Track the completion of block execution
   */
  protected async completeExecution(
    blockExecutionId: string,
    status: 'completed' | 'failed',
    result?: any,
    error?: Error,
  ): Promise<void> {
    if (!blockExecutionId) return;

    try {
      await this.databaseService.prisma.blockExecution.update({
        where: { id: blockExecutionId },
        data: {
          status,
          endTime: new Date(),
          output: result ? JSON.stringify(result) : null,
          error: error ? error.message : null,
        },
      });
    } catch (error: any) {
      this.logger.error(
        `Failed to complete execution tracking: ${error.message}`,
      );
    }
  }

  /**
   * Track execution logs
   */
  protected async trackLog(
    executionId: string,
    nodeId: string,
    level: 'info' | 'error' | 'warn',
    message: string,
    data?: any,
  ): Promise<void> {
    try {
      await this.databaseService.executions.addLog(
        executionId,
        level,
        message,
        {
          nodeId,
          timestamp: new Date().toISOString(),
          ...(data && { data }),
        },
      );
    } catch (error: any) {
      this.logger.error(`Failed to track log: ${error.message}`);
    }
  }

  /**
   * Get workflow execution data
   */
  protected async getExecutionData(executionId: string): Promise<any> {
    try {
      const execution =
        await this.databaseService.prisma.workflowExecution.findUnique({
          where: { id: executionId },
          include: {
            workflow: true,
            executionLogs: true,
            nodeExecutions: true,
          },
        });
      return execution;
    } catch (error: any) {
      this.logger.error(`Failed to get execution data: ${error.message}`);
      return null;
    }
  }

  /**
   * Update workflow execution status
   */
  protected async updateExecutionStatus(
    executionId: string,
    status: 'pending' | 'running' | 'completed' | 'failed' | 'paused',
    result?: any,
    error?: string,
  ): Promise<void> {
    try {
      await this.databaseService.prisma.workflowExecution.update({
        where: { id: executionId },
        data: {
          status,
          ...(result && { output: JSON.stringify(result) }),
          ...(error && { error }),
          ...((status === 'completed' || status === 'failed') && {
            finishedAt: new Date(),
          }),
        },
      });
    } catch (error: any) {
      this.logger.error(`Failed to update execution status: ${error.message}`);
    }
  }

  /**
   * Validate block configuration
   */
  protected validateConfig(
    config: Record<string, any>,
    requiredFields: string[],
  ): void {
    for (const field of requiredFields) {
      if (!config[field]) {
        throw new Error(`Missing required configuration field: ${field}`);
      }
    }
  }

  /**
   * Process input parameters with variable substitution
   */
  protected processInputs(
    parameters: Record<string, any>,
    ctx: BlockExecutionContext,
  ): Record<string, any> {
    const processed: Record<string, any> = {};

    for (const [key, value] of Object.entries(parameters)) {
      if (typeof value === 'string' && value.includes('{{')) {
        // Handle variable substitution from context inputs
        processed[key] = this.substituteVariables(value, ctx);
      } else {
        processed[key] = value;
      }
    }

    return processed;
  }

  /**
   * Substitute variables in strings
   */
  private substituteVariables(
    template: string,
    ctx: BlockExecutionContext,
  ): any {
    return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const keys = path.trim().split('.');
      let value: any = ctx.inputs;

      for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
          value = value[key];
        } else {
          return match; // Return original if path not found
        }
      }

      return value;
    });
  }
}
