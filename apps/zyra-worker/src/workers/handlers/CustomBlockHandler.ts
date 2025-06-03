import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../services/database.service';
import { executeCustomBlockLogic } from '../../types/custom-block';
import { BlockExecutionContext, BlockHandler } from '@zyra/types';

@Injectable()
export class CustomBlockHandler implements BlockHandler {
  private readonly logger = new Logger(CustomBlockHandler.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    const cfg = (node.data as any).config;
    const blockId = cfg.customBlockId || cfg.blockId;

    try {
      const blockDef = await this.databaseService.prisma.customBlock.findUnique(
        {
          where: { id: blockId },
        },
      );

      if (!blockDef) {
        throw new Error(`Custom block ${blockId} not found`);
      }

      const result = await executeCustomBlockLogic(
        blockDef as any,
        cfg.inputs || {},
      );

      if (!result.success) {
        throw new Error(`Custom block execution error: ${result.error}`);
      }

      return result.outputs;
    } catch (error: any) {
      this.logger.error(
        `Custom block execution failed: ${error?.message || 'Unknown error'}`,
      );
      throw error;
    }
  }
}
