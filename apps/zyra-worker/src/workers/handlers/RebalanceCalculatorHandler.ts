import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { BlockExecutionContext, BlockHandler, BlockType } from '@zyra/types';
import { PortfolioService } from '../../services/portfolio.service';
import { DatabaseService } from '../../services/database.service';

// Zod schema for rebalance configuration
const RebalanceConfigSchema = z.object({
  targetAllocations: z.record(z.string(), z.number()),
  threshold: z.number().min(0).max(100),
  rebalanceMethod: z.enum(['threshold', 'periodic', 'both']),
  rebalancePeriod: z.number().positive().optional(),
});

type RebalanceConfig = z.infer<typeof RebalanceConfigSchema>;

/**
 * Handler for DeFi portfolio rebalancing calculations
 */
@Injectable()
export class RebalanceCalculatorHandler implements BlockHandler {
  private readonly logger = new Logger(RebalanceCalculatorHandler.name);

  constructor(
    private readonly portfolioService: PortfolioService,
    private readonly databaseService: DatabaseService,
  ) {}

  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    const { id: nodeId } = node;
    const { executionId } = ctx;
    const blockType = BlockType.DEFI_REBALANCE;
    const inputs = ctx.workflowData || {};
    const config = node.data?.config || {};
    this.logger.log(`Executing RebalanceCalculator block: ${nodeId}`);

    // Track execution
    const blockExecutionId = await this.startExecution(
      nodeId,
      executionId,
      blockType,
    );

    try {
      // Validate configuration
      const validatedConfig = this.validateConfig(config);

      // Log the start of rebalance calculation
      await this.trackLog(
        executionId,
        nodeId,
        'info',
        'Calculating portfolio rebalance needs',
      );

      // Get current portfolio allocation
      const currentAllocation = await this.getCurrentAllocation();

      // Calculate rebalance needs
      const rebalanceNeeds = this.calculateRebalanceNeeds(
        currentAllocation,
        validatedConfig.targetAllocations,
        validatedConfig.threshold,
      );

      // Determine if rebalance is needed
      const needsRebalance = this.determineIfRebalanceNeeded(
        rebalanceNeeds,
        validatedConfig.rebalanceMethod,
        validatedConfig.rebalancePeriod,
        inputs.lastRebalanceDate,
      );

      // Log results
      await this.trackLog(
        executionId,
        nodeId,
        'info',
        `Rebalance needed: ${needsRebalance ? 'Yes' : 'No'}`,
      );

      // Complete execution
      const result = {
        currentAllocation,
        targetAllocation: validatedConfig.targetAllocations,
        deviations: rebalanceNeeds.deviations,
        trades: rebalanceNeeds.trades,
        needsRebalance,
        timestamp: new Date().toISOString(),
      };

      await this.completeExecution(blockExecutionId, 'completed', result);

      return result;
    } catch (error: any) {
      // Log error
      await this.trackLog(
        executionId,
        nodeId,
        'error',
        `Error: ${error?.message || 'Unknown error'}`,
      );

      // Complete execution with error
      await this.completeExecution(blockExecutionId, 'failed', null, error);

      throw error;
    }
  }

  /**
   * Validates the configuration for the rebalance calculator block
   */
  private validateConfig(config: Record<string, any>): RebalanceConfig {
    try {
      const parsedConfig = RebalanceConfigSchema.parse(config);

      // Validate that target allocations sum to 100%
      const sum = Object.values(parsedConfig.targetAllocations).reduce(
        (a, b) => a + b,
        0,
      );
      if (Math.abs(sum - 100) > 0.1) {
        throw new Error(`Target allocations must sum to 100%, got ${sum}%`);
      }

      // Validate that rebalancePeriod is provided if method requires it
      if (
        (parsedConfig.rebalanceMethod === 'periodic' ||
          parsedConfig.rebalanceMethod === 'both') &&
        !parsedConfig.rebalancePeriod
      ) {
        throw new Error(
          'rebalancePeriod is required when rebalanceMethod is periodic or both',
        );
      }

      return parsedConfig;
    } catch (error: any) {
      throw new Error(
        `Invalid rebalance configuration: ${error?.message || 'Unknown validation error'}`,
      );
    }
  }

  /**
   * Gets current portfolio allocation
   */
  private async getCurrentAllocation(): Promise<Record<string, number>> {
    try {
      const assetBalances = await this.portfolioService.getAssetBalances();

      // Calculate total portfolio value
      const totalValue = assetBalances.reduce(
        (sum, asset) => sum + asset.value,
        0,
      );

      // Calculate percentage allocation for each asset
      const allocation: Record<string, number> = {};
      assetBalances.forEach((asset) => {
        allocation[asset.asset] = (asset.value / totalValue) * 100;
      });

      return allocation;
    } catch (error: any) {
      throw new Error(
        `Failed to get current portfolio allocation: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Calculates rebalance needs based on current and target allocations
   */
  private calculateRebalanceNeeds(
    currentAllocation: Record<string, number>,
    targetAllocation: Record<string, number>,
    threshold: number,
  ): {
    deviations: Record<string, number>;
    trades: Array<{
      asset: string;
      action: 'buy' | 'sell';
      percentage: number;
    }>;
  } {
    const deviations: Record<string, number> = {};
    const trades: Array<{
      asset: string;
      action: 'buy' | 'sell';
      percentage: number;
    }> = [];

    // Calculate deviations for all assets in target allocation
    Object.keys(targetAllocation).forEach((asset) => {
      const current = currentAllocation[asset] || 0;
      const target = targetAllocation[asset];
      const deviation = current - target;

      deviations[asset] = deviation;

      // If deviation exceeds threshold, add to trades
      if (Math.abs(deviation) > threshold) {
        trades.push({
          asset,
          action: deviation > 0 ? 'sell' : 'buy',
          percentage: Math.abs(deviation),
        });
      }
    });

    return { deviations, trades };
  }

  /**
   * Determines if rebalance is needed based on method and period
   */
  private determineIfRebalanceNeeded(
    rebalanceNeeds: {
      deviations: Record<string, number>;
      trades: Array<{
        asset: string;
        action: 'buy' | 'sell';
        percentage: number;
      }>;
    },
    method: 'threshold' | 'periodic' | 'both',
    period?: number,
    lastRebalanceDate?: string,
  ): boolean {
    // Check if any trades are needed (threshold-based)
    const thresholdRebalanceNeeded = rebalanceNeeds.trades.length > 0;

    // Check if periodic rebalance is needed
    let periodicRebalanceNeeded = false;
    if (method === 'periodic' || method === 'both') {
      if (!period) {
        throw new Error(
          'Rebalance period must be specified for periodic rebalancing',
        );
      }

      if (!lastRebalanceDate) {
        // If no last rebalance date, assume rebalance is needed
        periodicRebalanceNeeded = true;
      } else {
        const daysSinceLastRebalance = this.getDaysSince(
          new Date(lastRebalanceDate),
        );
        periodicRebalanceNeeded = daysSinceLastRebalance >= period;
      }
    }

    // Determine if rebalance is needed based on method
    switch (method) {
      case 'threshold':
        return thresholdRebalanceNeeded;
      case 'periodic':
        return periodicRebalanceNeeded;
      case 'both':
        return thresholdRebalanceNeeded && periodicRebalanceNeeded;
      default:
        return false;
    }
  }

  /**
   * Calculates days since a given date
   */
  private getDaysSince(date: Date): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  // Execution tracking methods
  public async startExecution(
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

  public async completeExecution(
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

  public async trackLog(
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
}
