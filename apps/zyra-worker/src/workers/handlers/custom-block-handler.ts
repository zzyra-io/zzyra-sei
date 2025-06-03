import { Injectable, Logger } from '@nestjs/common';
import { BlockExecutionContext, BlockHandler } from '@zyra/types';
import { DatabaseService } from '../../services/database.service';

@Injectable()
export class CustomBlockHandler implements BlockHandler {
  private readonly logger = new Logger(CustomBlockHandler.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    const { nodeId, executionId, userId } = ctx;
    const blockData = node.data || {};

    this.logger.log(`Executing custom block: ${nodeId}`);

    // Track execution start
    const blockExecutionId = await this.startExecution(
      nodeId,
      executionId,
      'custom',
    );

    try {
      // Get custom block definition from database
      const customBlock = await this.getCustomBlock(blockData.blockId, userId);

      if (!customBlock) {
        throw new Error(`Custom block not found: ${blockData.blockId}`);
      }

      // Execute custom block logic
      const result = await this.executeCustomLogic(customBlock, blockData, ctx);

      // Complete execution tracking
      await this.completeExecution(blockExecutionId, 'completed', result);

      return result;
    } catch (error: any) {
      // Track execution failure
      await this.trackLog(
        executionId,
        nodeId,
        'error',
        `Custom block execution failed: ${error.message}`,
      );

      await this.completeExecution(blockExecutionId, 'failed', null, error);
      throw error;
    }
  }

  /**
   * Get custom block definition from database
   */
  private async getCustomBlock(blockId: string, userId: string): Promise<any> {
    try {
      const customBlock =
        await this.databaseService.prisma.customBlock.findFirst({
          where: {
            id: blockId,
            OR: [{ userId: userId }, { isPublic: true }],
          },
        });

      return customBlock;
    } catch (error: any) {
      this.logger.error(`Failed to get custom block: ${error.message}`);
      throw new Error(`Failed to load custom block: ${error.message}`);
    }
  }

  /**
   * Execute custom block logic
   */
  private async executeCustomLogic(
    customBlock: any,
    blockData: any,
    ctx: BlockExecutionContext,
  ): Promise<any> {
    try {
      // Parse the custom logic based on logic type
      switch (customBlock.logicType) {
        case 'javascript':
          return await this.executeJavaScript(
            customBlock.logic,
            blockData,
            ctx,
          );
        case 'python':
          return await this.executePython(customBlock.logic, blockData, ctx);
        case 'sql':
          return await this.executeSQL(customBlock.logic, blockData, ctx);
        default:
          throw new Error(`Unsupported logic type: ${customBlock.logicType}`);
      }
    } catch (error: any) {
      this.logger.error(`Custom logic execution failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Execute JavaScript logic
   */
  private async executeJavaScript(
    logic: string,
    blockData: any,
    ctx: BlockExecutionContext,
  ): Promise<any> {
    try {
      // Create a sandboxed execution environment
      const sandbox = {
        inputs: ctx.inputs,
        blockData,
        ctx,
        console: {
          log: (message: string) => this.logger.log(`Custom block: ${message}`),
          error: (message: string) =>
            this.logger.error(`Custom block: ${message}`),
        },
      };

      // Execute the JavaScript code
      const result = new Function(
        'sandbox',
        `
        with (sandbox) {
          ${logic}
        }
      `,
      )(sandbox);

      return result;
    } catch (error: any) {
      throw new Error(`JavaScript execution failed: ${error.message}`);
    }
  }

  /**
   * Execute Python logic (placeholder - would need Python runtime)
   */
  private async executePython(
    logic: string,
    blockData: any,
    ctx: BlockExecutionContext,
  ): Promise<any> {
    // This would require integration with a Python runtime
    throw new Error('Python execution not yet implemented');
  }

  /**
   * Execute SQL logic
   */
  private async executeSQL(
    logic: string,
    blockData: any,
    ctx: BlockExecutionContext,
  ): Promise<any> {
    try {
      // Execute raw SQL (be careful with security)
      const result = await this.databaseService.prisma.$queryRawUnsafe(logic);
      return result;
    } catch (error: any) {
      throw new Error(`SQL execution failed: ${error.message}`);
    }
  }

  /**
   * Start execution tracking
   */
  private async startExecution(
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
   * Complete execution tracking
   */
  private async completeExecution(
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
  private async trackLog(
    executionId: string,
    nodeId: string,
    level: 'info' | 'error' | 'warn',
    message: string,
  ): Promise<void> {
    try {
      await this.databaseService.executions.addLog(
        executionId,
        level,
        message,
        {
          nodeId,
          timestamp: new Date().toISOString(),
        },
      );
    } catch (error: any) {
      this.logger.error(`Failed to track log: ${error.message}`);
    }
  }
}
