import { z } from 'zod';


import { PortfolioService } from '../../services/portfolio.service';
import { Injectable, Logger } from '@nestjs/common';
import retry from 'async-retry';
import { createServiceClient } from '../../lib/supabase/serviceClient';
import { BlockExecutionContext, BlockType, BlockHandler  } from '@zyra/types';


// Define the schema for configuration validation
const PortfolioConfigSchema = z.object({
  walletAddress: z.string().nonempty('Wallet address is required'),
  networks: z.array(z.string()).default(['ethereum']),
  includeRiskMetrics: z.boolean().default(false),
  includePerformance: z.boolean().default(false),
  timeframe: z.enum(['1d', '7d', '30d', '90d', '365d']).default('30d'),
  maxRetries: z.number().default(3),
  retryDelay: z.number().default(1000),
});

// Define the type for the configuration
type PortfolioConfig = z.infer<typeof PortfolioConfigSchema>;

/**
 * Handler for portfolio balance blocks
 * Retrieves and processes wallet balance information across multiple networks
 */
@Injectable()
export class PortfolioBalanceHandler implements BlockHandler {
  private readonly logger = new Logger(PortfolioBalanceHandler.name);
  private readonly supabase = createServiceClient();

  constructor(private readonly portfolioService: PortfolioService) {}

  /**
   * Execute the portfolio balance block
   * @param node The node to execute
   * @param ctx The execution context
   */
  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    const { id: nodeId, type, data } = node;
    const { executionId } = ctx;

    // Start execution tracking
    const blockExecutionId = await this.startExecution(nodeId, executionId, type);

    try {
      // Validate configuration
      const parseResult = PortfolioConfigSchema.safeParse(data.config || {});
      if (!parseResult.success) {
        const errorMessage = `Invalid configuration: ${parseResult.error.message}`;
        this.logger.error(errorMessage);
        await this.trackLog(executionId, nodeId, 'error', errorMessage);
        await this.completeExecution(blockExecutionId, 'failed', null, new Error(errorMessage));
        throw new Error(errorMessage);
      }

      const config: PortfolioConfig = parseResult.data;

      // Log execution start
      this.logger.log(`Executing portfolio balance check for wallet: ${config.walletAddress}`);
      await this.trackLog(executionId, nodeId, 'info', `Starting portfolio balance check for wallet: ${config.walletAddress}`);

      // Fetch portfolio data with retry logic
      const result = await retry(
        async () => this.getPortfolioData(config),
        {
          retries: config.maxRetries,
          factor: 2,
          minTimeout: config.retryDelay,
          onRetry: (error, attempt) => {
            this.logger.warn(`Retry ${attempt}/${config.maxRetries} for portfolio data: ${error.message}`);
            this.trackLog(executionId, nodeId, 'warn', `Retry ${attempt}/${config.maxRetries}: ${error.message}`);
          },
        }
      );

      // Log success and complete execution
      this.logger.log(`Portfolio balance check completed for wallet: ${config.walletAddress}`);
      await this.trackLog(executionId, nodeId, 'info', `Portfolio balance check completed with total value: $${result.totalValue.toFixed(2)}`);

      await this.completeExecution(blockExecutionId, 'completed', result);
      return result;
    } catch (error) {
      // Handle errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.logger.error(`Portfolio balance check failed: ${errorMessage}`);
      await this.trackLog(executionId, nodeId, 'error', `Portfolio balance check failed: ${errorMessage}`);
      await this.completeExecution(blockExecutionId, 'failed', null, error instanceof Error ? error : new Error(errorMessage));
      throw error;
    }
  }

  /**
   * Start tracking execution of a block
   * @param nodeId The ID of the node being executed
   * @param executionId The workflow execution ID
   * @param blockType The type of block being executed
   */
  private async startExecution(
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
  private async completeExecution(
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
  private async trackLog(
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
   * Get comprehensive portfolio data using the PortfolioService
   * @param config Block configuration
   * @returns Processed portfolio data
   */
  private async getPortfolioData(config: PortfolioConfig) {
    // Get basic portfolio data
    const balances = await this.portfolioService.getAssetBalances();
    const totalValue = await this.portfolioService.getPortfolioValue();
    const allocation = await this.portfolioService.getPortfolioAllocation();

    // Build the result object
    const result: any = {
      walletAddress: config.walletAddress,
      totalValue,
      assets: balances,
      allocation,
      timestamp: new Date().toISOString(),
      networks: config.networks,
    };

    // Add risk metrics if requested
    if (config.includeRiskMetrics) {
      // Create mock data for risk metrics calculation
      // In a real implementation, this would use actual price history data
      const positions = balances.map((balance) => ({
        asset: balance.asset,
        value: balance.value,
        priceHistory: Array(30)
          .fill(0)
          .map(() => Math.random() * 100 + 1000),
        marketPriceHistory: Array(30)
          .fill(0)
          .map(() => Math.random() * 100 + 1000),
        returns: Array(30)
          .fill(0)
          .map(() => (Math.random() - 0.5) * 0.1),
      }));

      const riskMetrics = await this.portfolioService.calculateRiskMetrics(positions);
      result.riskMetrics = riskMetrics;
    }

    // Add performance data if requested
    if (config.includePerformance) {
      // Create mock data for performance calculation
      const mockBalances = balances.reduce(
        (acc, balance) => {
          acc[balance.asset] = { value: balance.value };
          return acc;
        },
        {} as Record<string, any>,
      );

      const performance = await this.portfolioService.calculatePortfolioPerformance(
        mockBalances,
        config.timeframe,
      );

      result.performance = performance;
    }

    return result;
  }
}
