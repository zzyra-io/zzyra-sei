import { Injectable, Logger } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';


import { ProtocolService } from '../../services/protocol.service';
import { BlockType, BlockExecutionContext, BlockHandler } from '@zyra/types';


// Define the configuration schema for yield strategy
const YieldStrategyConfigSchema = z.object({
  asset: z.string().min(1, 'Asset is required'),
  amount: z.number().min(0, 'Amount must be non-negative'),
  riskTolerance: z.enum(['low', 'medium', 'high']).default('medium'),
  minApy: z.number().min(0).default(0),
  maxRisk: z.number().min(1).max(10).default(7), // Risk scale 1-10
  lockupPeriodMax: z.number().optional(), // Maximum lockup period in days
  protocolAllowList: z.array(z.string()).optional(), // Protocols to consider
  protocolDenyList: z.array(z.string()).optional(), // Protocols to exclude
});

type YieldStrategyConfig = z.infer<typeof YieldStrategyConfigSchema>;

interface ProtocolYieldOption {
  protocol: string;
  apy: number;
  risk: number;
  lockupPeriod: number; // in days
  liquidityScore: number; // 1-10 scale
  tvl: number; // Total Value Locked in USD
  strategy: string;
  asset: string;
}

/**
 * Handler for recommending yield strategies
 */
@Injectable()
export class YieldStrategyHandler implements BlockHandler {
  private readonly logger = new Logger(YieldStrategyHandler.name);
  private readonly supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_KEY || '',
  );

  constructor(private readonly protocolService: ProtocolService) {}

  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    const { id: nodeId } = node;
    const { executionId } = ctx;
    const blockType = BlockType.DEFI_YIELD_STRATEGY;
    const inputs = ctx.workflowData || {};
    const config = node.data?.config || {};
    this.logger.log(`Executing YieldStrategy block: ${nodeId}`);
    
    // Track execution
    const blockExecutionId = await this.startExecution(nodeId, executionId, blockType);
    
    try {
      // Validate configuration
      const validatedConfig = this.validateConfig(config);
      
      // Log the start of yield strategy search
      await this.trackLog(
        executionId, 
        nodeId, 
        'info', 
        `Finding yield strategies for ${validatedConfig.amount} ${validatedConfig.asset} with ${validatedConfig.riskTolerance} risk tolerance`
      );
      
      // Get available yield options
      const yieldOptions = await this.getYieldOptions(validatedConfig.asset);
      
      await this.trackLog(
        executionId,
        nodeId,
        'info',
        `Found ${yieldOptions.length} potential yield options`
      );
      
      // Filter options based on criteria
      const filteredOptions = this.filterYieldOptions(yieldOptions, validatedConfig);
      
      await this.trackLog(
        executionId,
        nodeId,
        'info',
        `${filteredOptions.length} options match criteria`
      );
      
      // Rank options by optimal strategy
      const rankedOptions = this.rankYieldOptions(filteredOptions, validatedConfig);
      
      // Generate allocation strategy
      const allocationStrategy = this.generateAllocationStrategy(
        rankedOptions,
        validatedConfig.amount,
        validatedConfig.riskTolerance
      );
      
      // Complete execution
      const result = {
        asset: validatedConfig.asset,
        amount: validatedConfig.amount,
        recommendedOptions: rankedOptions.slice(0, 5), // Top 5 options
        allocationStrategy,
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
        `Yield strategy calculation failed: ${error?.message || 'Unknown error'}`
      );
      
      // Complete execution with error
      await this.completeExecution(blockExecutionId, 'failed', null, error);
      
      throw error;
    }
  }
  
  /**
   * Validates the configuration for the yield strategy block
   */
  private validateConfig(config: Record<string, any>): YieldStrategyConfig {
    try {
      return YieldStrategyConfigSchema.parse(config);
    } catch (error: any) {
      throw new Error(`Invalid yield strategy configuration: ${error?.message || 'Unknown validation error'}`);
    }
  }
  
  /**
   * Gets available yield options for the specified asset
   */
  private async getYieldOptions(asset: string): Promise<ProtocolYieldOption[]> {
    try {
      // This would typically call an API or service to get real-time yield options
      // For now, we'll use the protocol service to get yield data
      const protocols = await this.protocolService.getProtocolsWithYieldForAsset(asset);
      
      return protocols.map(p => ({
        protocol: p.name,
        apy: p.apy,
        risk: p.riskScore,
        lockupPeriod: p.lockupPeriod,
        liquidityScore: p.liquidityScore,
        tvl: p.tvl,
        strategy: p.strategyType,
        asset: asset
      }));
    } catch (error: any) {
      throw new Error(`Failed to get yield options: ${error?.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Filters yield options based on configuration criteria
   */
  private filterYieldOptions(
    options: ProtocolYieldOption[],
    config: YieldStrategyConfig
  ): ProtocolYieldOption[] {
    return options.filter(option => {
      // Filter by minimum APY
      if (option.apy < config.minApy) {
        return false;
      }
      
      // Filter by maximum risk
      if (option.risk > config.maxRisk) {
        return false;
      }
      
      // Filter by lockup period if specified
      if (config.lockupPeriodMax !== undefined && option.lockupPeriod > config.lockupPeriodMax) {
        return false;
      }
      
      // Filter by protocol allow list if specified
      if (config.protocolAllowList && config.protocolAllowList.length > 0) {
        if (!config.protocolAllowList.includes(option.protocol)) {
          return false;
        }
      }
      
      // Filter by protocol deny list if specified
      if (config.protocolDenyList && config.protocolDenyList.length > 0) {
        if (config.protocolDenyList.includes(option.protocol)) {
          return false;
        }
      }
      
      return true;
    });
  }
  
  /**
   * Ranks yield options based on optimal strategy for the given risk tolerance
   */
  private rankYieldOptions(
    options: ProtocolYieldOption[],
    config: YieldStrategyConfig
  ): ProtocolYieldOption[] {
    // Create a scoring function based on risk tolerance
    const scoreOption = (option: ProtocolYieldOption): number => {
      let score = 0;
      
      // Base score is APY
      score += option.apy;
      
      // Adjust for risk tolerance
      switch (config.riskTolerance) {
        case 'low':
          // For low risk tolerance, penalize higher risk options
          score -= option.risk * 0.5;
          // Bonus for high liquidity
          score += option.liquidityScore * 0.3;
          // Penalize long lockup periods
          score -= (option.lockupPeriod / 30) * 0.2; // Convert days to months
          break;
          
        case 'medium':
          // For medium risk tolerance, balanced approach
          // Small penalty for risk
          score -= option.risk * 0.2;
          // Small bonus for liquidity
          score += option.liquidityScore * 0.2;
          // Small penalty for lockup
          score -= (option.lockupPeriod / 30) * 0.1;
          break;
          
        case 'high':
          // For high risk tolerance, prioritize APY
          // No penalty for risk
          // Small bonus for TVL (indicates established protocol)
          score += Math.log10(option.tvl) * 0.1;
          break;
      }
      
      return score;
    };
    
    // Score and sort options
    return [...options].sort((a, b) => scoreOption(b) - scoreOption(a));
  }
  
  /**
   * Generates an allocation strategy based on ranked options
   */
  private generateAllocationStrategy(
    rankedOptions: ProtocolYieldOption[],
    totalAmount: number,
    riskTolerance: 'low' | 'medium' | 'high'
  ): Array<{ protocol: string; amount: number; percentage: number }> {
    if (rankedOptions.length === 0) {
      return [];
    }
    
    let allocations: Array<{ protocol: string; amount: number; percentage: number }> = [];
    
    // Different allocation strategies based on risk tolerance
    switch (riskTolerance) {
      case 'low':
        // Conservative strategy: Allocate to top 3 options with higher weight to safer options
        if (rankedOptions.length >= 3) {
          allocations = [
            { protocol: rankedOptions[0].protocol, percentage: 50, amount: totalAmount * 0.5 },
            { protocol: rankedOptions[1].protocol, percentage: 30, amount: totalAmount * 0.3 },
            { protocol: rankedOptions[2].protocol, percentage: 20, amount: totalAmount * 0.2 },
          ];
        } else if (rankedOptions.length === 2) {
          allocations = [
            { protocol: rankedOptions[0].protocol, percentage: 60, amount: totalAmount * 0.6 },
            { protocol: rankedOptions[1].protocol, percentage: 40, amount: totalAmount * 0.4 },
          ];
        } else {
          allocations = [
            { protocol: rankedOptions[0].protocol, percentage: 100, amount: totalAmount },
          ];
        }
        break;
        
      case 'medium':
        // Balanced strategy: Allocate to top 4 options with balanced weights
        if (rankedOptions.length >= 4) {
          allocations = [
            { protocol: rankedOptions[0].protocol, percentage: 40, amount: totalAmount * 0.4 },
            { protocol: rankedOptions[1].protocol, percentage: 25, amount: totalAmount * 0.25 },
            { protocol: rankedOptions[2].protocol, percentage: 20, amount: totalAmount * 0.2 },
            { protocol: rankedOptions[3].protocol, percentage: 15, amount: totalAmount * 0.15 },
          ];
        } else if (rankedOptions.length === 3) {
          allocations = [
            { protocol: rankedOptions[0].protocol, percentage: 50, amount: totalAmount * 0.5 },
            { protocol: rankedOptions[1].protocol, percentage: 30, amount: totalAmount * 0.3 },
            { protocol: rankedOptions[2].protocol, percentage: 20, amount: totalAmount * 0.2 },
          ];
        } else if (rankedOptions.length === 2) {
          allocations = [
            { protocol: rankedOptions[0].protocol, percentage: 60, amount: totalAmount * 0.6 },
            { protocol: rankedOptions[1].protocol, percentage: 40, amount: totalAmount * 0.4 },
          ];
        } else {
          allocations = [
            { protocol: rankedOptions[0].protocol, percentage: 100, amount: totalAmount },
          ];
        }
        break;
        
      case 'high':
        // Aggressive strategy: Higher concentration in top performers
        if (rankedOptions.length >= 3) {
          allocations = [
            { protocol: rankedOptions[0].protocol, percentage: 60, amount: totalAmount * 0.6 },
            { protocol: rankedOptions[1].protocol, percentage: 30, amount: totalAmount * 0.3 },
            { protocol: rankedOptions[2].protocol, percentage: 10, amount: totalAmount * 0.1 },
          ];
        } else if (rankedOptions.length === 2) {
          allocations = [
            { protocol: rankedOptions[0].protocol, percentage: 70, amount: totalAmount * 0.7 },
            { protocol: rankedOptions[1].protocol, percentage: 30, amount: totalAmount * 0.3 },
          ];
        } else {
          allocations = [
            { protocol: rankedOptions[0].protocol, percentage: 100, amount: totalAmount },
          ];
        }
        break;
    }
    
    return allocations;
  }
  
  // Execution tracking methods
  public async startExecution(
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

  public async completeExecution(
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

  public async trackLog(
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
}
