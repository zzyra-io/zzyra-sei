import { Injectable, Logger } from '@nestjs/common';
import { BlockExecutionContext, BlockHandler } from '@zyra/types';
import { DatabaseService } from '../../services/database.service';

@Injectable()
export abstract class BaseBlockHandler implements BlockHandler {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(protected readonly databaseService: DatabaseService) {}

  abstract execute(node: any, ctx: BlockExecutionContext): Promise<any>;

  /**
   * Start tracking execution of a block
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
   * Complete execution tracking for a block
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
   * Track a log message for a block execution
   */
  protected async trackLog(
    executionId: string,
    nodeId: string,
    level: 'info' | 'error' | 'warn',
    message: string,
    metadata?: any,
  ): Promise<void> {
    try {
      await this.databaseService.executions.addLog(
        executionId,
        level,
        message,
        {
          nodeId,
          timestamp: new Date().toISOString(),
          ...(metadata && { metadata }),
        },
      );
    } catch (error: any) {
      this.logger.error(`Failed to track log: ${error.message}`);
    }
  }

  /**
   * Helper method to extract node data safely
   */
  protected getNodeData(node: any): {
    nodeId: string;
    type: string;
    config: any;
    inputs: any;
  } {
    const nodeId = node?.id || 'unknown-node';
    const type = node?.type || 'unknown-type';
    const config = node?.data?.config || {};
    const inputs = node?.data?.inputs || {};

    return { nodeId, type, config, inputs };
  }

  /**
   * Helper method to handle errors consistently
   */
  protected async handleError(
    error: unknown,
    nodeId: string,
    executionId: string,
    blockExecutionId: string,
  ): Promise<never> {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';
    this.logger.error(`Block execution failed: ${errorMessage}`);
    await this.trackLog(
      executionId,
      nodeId,
      'error',
      `Execution failed: ${errorMessage}`,
    );
    await this.completeExecution(
      blockExecutionId,
      'failed',
      null,
      error instanceof Error ? error : new Error(errorMessage),
    );
    throw error;
  }
}
