import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { DatabaseService } from '../../services/database.service';

import { ProtocolService } from '../../services/protocol.service';
import { BlockExecutionContext, BlockHandler } from '@zyra/types';

// Define the schema for configuration validation
const YieldMonitorConfigSchema = z.object({
  protocols: z
    .array(z.string())
    .min(1, 'At least one protocol must be specified'),
  minYield: z.number().optional(),
  maxYield: z.number().optional(),
  updateFrequency: z.number().optional().default(24), // in hours
});

type YieldMonitorConfig = z.infer<typeof YieldMonitorConfigSchema>;

/**
 * Handler for monitoring DeFi protocol yields
 */
@Injectable()
export class YieldMonitorHandler implements BlockHandler {
  private readonly logger = new Logger(YieldMonitorHandler.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly protocolService: ProtocolService,
  ) {}

  /**
   * Execute the yield monitor block
   * @param node The node to execute
   * @param ctx The execution context
   */
  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    const { nodeId, type, config } = this.getNodeData(node);
    const { executionId } = ctx;

    this.logger.log(`Executing YieldMonitor block: ${nodeId}`);

    // Track execution
    const blockExecutionId = await this.startExecution(
      nodeId,
      executionId,
      type,
    );

    try {
      // Validate configuration
      const validatedConfig = this.validateConfig(config);

      // Log the start of yield fetching
      await this.trackLog(
        executionId,
        nodeId,
        'info',
        'Fetching protocol yields',
      );

      // Get yields for the specified protocols
      const yields = await this.getProtocolYields(validatedConfig.protocols);

      // Check if yields meet criteria
      const filteredYields = this.filterYieldsByCriteria(
        yields,
        validatedConfig.minYield,
        validatedConfig.maxYield,
      );

      // Log results
      await this.trackLog(
        executionId,
        nodeId,
        'info',
        `Found ${filteredYields.length} protocols meeting yield criteria`,
      );

      // Complete execution
      const result = {
        yields: filteredYields,
        timestamp: new Date().toISOString(),
        count: filteredYields.length,
      };

      await this.completeExecution(blockExecutionId, 'completed', result);

      return result;
    } catch (error) {
      return this.handleError(error, nodeId, executionId, blockExecutionId);
    }
  }

  /**
   * Validates the configuration for the yield monitor block
   */
  private validateConfig(config: Record<string, any>): YieldMonitorConfig {
    try {
      return YieldMonitorConfigSchema.parse(config);
    } catch (error: any) {
      throw new Error(
        `Invalid yield monitor configuration: ${error?.message || 'Unknown validation error'}`,
      );
    }
  }

  /**
   * Fetches yields for specified protocols
   */
  private async getProtocolYields(
    protocols: string[],
  ): Promise<Array<{ protocol: string; apy: number; details?: any }>> {
    try {
      // Mock implementation - in a real implementation, this would call an actual API
      // This is just for demonstration purposes
      const mockYields = protocols.map((protocol) => ({
        protocol,
        apy: Math.random() * 10, // Random APY between 0-10%
        details: {
          provider: protocol,
          lastUpdated: new Date().toISOString(),
          riskScore: Math.floor(Math.random() * 5) + 1, // Risk score 1-5
        },
      }));

      return mockYields;
    } catch (error: any) {
      throw new Error(
        `Failed to fetch protocol yields: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Helper method to extract node data safely
   * @param node The node to extract data from
   */
  private getNodeData(node: any): {
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
   * Start tracking execution of a block
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
      this.logger.error(
        `Error starting execution tracking: ${error?.message || 'Unknown error'}`,
      );
      return '';
    }
  }

  /**
   * Complete execution tracking for a block
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
        `Error completing execution tracking: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Track a log entry for a node execution
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
      this.logger.error(
        `Error tracking log: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Helper method to handle errors consistently
   * @param error The error that occurred
   * @param nodeId The ID of the node being executed
   * @param executionId The workflow execution ID
   * @param blockExecutionId The ID of the block execution record
   */
  private async handleError(
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

  /**
   * Filters yields based on min/max criteria
   */
  private filterYieldsByCriteria(
    yields: Array<{ protocol: string; apy: number; details?: any }>,
    minYield?: number,
    maxYield?: number,
  ): Array<{ protocol: string; apy: number; details?: any }> {
    return yields.filter((yieldData) => {
      const meetsMinCriteria =
        minYield === undefined || yieldData.apy >= minYield;
      const meetsMaxCriteria =
        maxYield === undefined || yieldData.apy <= maxYield;
      return meetsMinCriteria && meetsMaxCriteria;
    });
  }
}
