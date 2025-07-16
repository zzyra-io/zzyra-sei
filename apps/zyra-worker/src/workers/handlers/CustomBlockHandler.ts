import { Injectable, Logger } from '@nestjs/common';
import {
  BlockExecutionContext,
  BlockHandler,
  CustomBlockDefinition,
} from '@zyra/types';
import { DatabaseService } from '../../services/database.service';
import { AbstractBlockHandler } from './AbstractBlockHandler';
import { executeCustomBlockLogic } from '../../types/custom-block';

@Injectable()
export class CustomBlockHandler
  extends AbstractBlockHandler
  implements BlockHandler
{
  protected readonly logger = new Logger(CustomBlockHandler.name);

  constructor(databaseService: DatabaseService) {
    super(databaseService);
  }

  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    const { nodeId, executionId, userId } = ctx;

    this.logger.log(`Executing custom block: ${nodeId}`);

    try {
      // Start execution tracking
      const blockExecutionId = await this.startExecution(
        nodeId,
        executionId,
        'CUSTOM',
      );

      // Get custom block definition from database
      // Check multiple possible locations for the custom block ID
      let customBlockId =
        node.data?.customBlockId ||
        node.data?.blockId ||
        node.data?.config?.customBlockId ||
        ctx.config?.customBlockId ||
        node.config?.customBlockId;

      // For the new unified system, block type should be CUSTOM and ID should be in config
      if (!customBlockId && node.type === 'CUSTOM') {
        // This is the new standard format
        this.logger.log('Using unified CUSTOM block format');
      }

      if (!customBlockId) {
        throw new Error(
          'Custom block ID is required in node data, config, or block type',
        );
      }

      // Fetch custom block from database
      const customBlock =
        await this.databaseService.prisma.customBlock.findFirst({
          where: {
            id: customBlockId,
            OR: [{ userId: userId }, { isPublic: true }],
          },
        });

      if (!customBlock) {
        throw new Error(
          `Custom block not found or access denied: ${customBlockId}`,
        );
      }

      // Parse block data (inputs/outputs definitions)
      let blockData: any = {};
      try {
        blockData =
          typeof customBlock.blockData === 'string'
            ? JSON.parse(customBlock.blockData)
            : customBlock.blockData || {};
      } catch (error) {
        this.logger.warn(
          `Failed to parse blockData for custom block ${customBlockId}`,
          error,
        );
        blockData = {};
      }

      // Create CustomBlockDefinition from database record
      const blockDefinition: CustomBlockDefinition = {
        id: customBlock.id,
        name: customBlock.name,
        description: customBlock.description || '',
        category: customBlock.category as any,
        inputs: blockData.inputs || [],
        outputs: blockData.outputs || [],
        code: customBlock.code,
        logicType: customBlock.logicType as any,
        isPublic: customBlock.isPublic || false,
        createdAt: customBlock.createdAt?.toISOString(),
        updatedAt: customBlock.updatedAt?.toISOString(),
        createdBy: customBlock.userId,
        tags: [],
      };

      // Extract inputs from node data
      const inputs =
        node.data?.inputs ||
        node.data?.config?.inputs ||
        ctx.inputs ||
        ctx.config?.inputs ||
        {};

      this.logger.debug(`Custom block inputs:`, inputs);
      this.logger.debug(`Custom block definition:`, {
        id: blockDefinition.id,
        name: blockDefinition.name,
        logicType: blockDefinition.logicType,
        inputCount: blockDefinition.inputs.length,
        outputCount: blockDefinition.outputs.length,
      });

      // Execute the custom block logic
      const result = await executeCustomBlockLogic(blockDefinition, inputs);

      if (!result.success) {
        throw new Error(result.error || 'Custom block execution failed');
      }

      // Log execution details
      if (result.logs && result.logs.length > 0) {
        result.logs.forEach((log) => {
          this.logger.log(`[CustomBlock ${customBlock.name}] ${log}`);
        });
      }

      // Update execution status to completed
      if (blockExecutionId) {
        await this.databaseService.prisma.blockExecution.update({
          where: { id: blockExecutionId },
          data: {
            status: 'completed',
            endTime: new Date(),
            output: result.outputs,
          },
        });
      }

      this.logger.log(`Custom block execution completed: ${nodeId}`);
      return result.outputs;
    } catch (error: any) {
      this.logger.error(
        `Custom block execution failed: ${error.message}`,
        error.stack,
      );

      // Update execution status to failed
      try {
        const blockExecution =
          await this.databaseService.prisma.blockExecution.findFirst({
            where: {
              nodeId,
              executionId,
            },
          });

        if (blockExecution) {
          await this.databaseService.prisma.blockExecution.update({
            where: { id: blockExecution.id },
            data: {
              status: 'failed',
              endTime: new Date(),
              error: error.message,
            },
          });
        }
      } catch (updateError) {
        this.logger.error(
          `Failed to update block execution status: ${updateError}`,
        );
      }

      throw error;
    }
  }
}
