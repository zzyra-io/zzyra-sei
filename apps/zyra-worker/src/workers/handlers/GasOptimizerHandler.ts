import { Injectable, Logger } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { ethers, Provider } from 'ethers';


import { BlockType, BlockExecutionContext, BlockHandler } from '@zyra/types';


// Define the configuration schema for gas optimization
const GasOptimizerConfigSchema = z.object({
  network: z.string().min(1, 'Network is required'),
  maxWaitTime: z.number().min(1).default(60), // Maximum wait time in minutes
  gasStrategy: z.enum(['aggressive', 'balanced', 'economic']).default('balanced'),
  maxGasPrice: z.number().optional(), // Optional max gas price in gwei
  priorityFee: z.number().optional(), // Optional priority fee in gwei for EIP-1559
  useEIP1559: z.boolean().default(true), // Whether to use EIP-1559 gas model
});

type GasOptimizerConfig = z.infer<typeof GasOptimizerConfigSchema>;

/**
 * Handler for optimizing gas prices for blockchain transactions
 */
@Injectable()
export class GasOptimizerHandler implements BlockHandler {
  private readonly logger = new Logger(GasOptimizerHandler.name);
  private readonly supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_KEY || '',
  );
  
  // Execution tracking methods
  public async startExecution(
    nodeId: string,
    executionId: string,
    blockType: string,
  ): Promise<string> {
    const blockExecutionId = `${executionId}_${nodeId}`;
    
    try {
      const { error } = await this.supabase
        .from('node_logs')
        .insert({
          id: blockExecutionId,
          node_id: nodeId,
          execution_id: executionId,
          block_type: blockType,
          status: 'running',
          started_at: new Date().toISOString(),
        });
      
      if (error) {
        this.logger.error(`Failed to insert execution record: ${error.message}`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to start execution tracking: ${error?.message || 'Unknown error'}`);
    }
    
    return blockExecutionId;
  }
  
  public async completeExecution(
    blockExecutionId: string,
    status: 'completed' | 'failed',
    result?: any,
    error?: any,
  ): Promise<void> {
    try {
      const { error: dbError } = await this.supabase
        .from('node_logs')
        .update({
          status,
          completed_at: new Date().toISOString(),
          result: result ? JSON.stringify(result) : null,
          error: error ? JSON.stringify(error) : null,
        })
        .eq('id', blockExecutionId);
      
      if (dbError) {
        this.logger.error(`Failed to update execution record: ${dbError.message}`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to complete execution tracking: ${error?.message || 'Unknown error'}`);
    }
  }
  
  public async trackLog(
    executionId: string,
    nodeId: string,
    level: 'info' | 'warn' | 'error',
    message: string,
  ): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('execution_logs')
        .insert({
          execution_id: executionId,
          node_id: nodeId,
          level,
          message,
          timestamp: new Date().toISOString(),
        });
      
      if (error) {
        this.logger.error(`Failed to insert log: ${error.message}`);
      }
    } catch (error: any) {
      this.logger.error(`Failed to track log: ${error?.message || 'Unknown error'}`);
    }
  }
  
  // RPC providers for different networks
  private providers: Record<string, Provider> = {};

  constructor() {
    // Initialize providers for common networks
    this.initializeProviders();
  }

  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    const { id: nodeId } = node;
    const { executionId } = ctx;
    const blockType = BlockType.DEFI_GAS;
    const inputs = ctx.workflowData || {};
    const config = node.data?.config || {};
    this.logger.log(`Executing GasOptimizer block: ${nodeId}`);
    
    // Track execution
    const blockExecutionId = await this.startExecution(nodeId, executionId, blockType);
    
    try {
      // Validate configuration
      const validatedConfig = this.validateConfig(config);
      
      // Log the start of gas optimization
      await this.trackLog(
        executionId, 
        nodeId, 
        'info', 
        `Starting gas optimization for ${validatedConfig.network} with ${validatedConfig.gasStrategy} strategy`
      );
      
      // Get provider for the specified network
      const provider = this.getProvider(validatedConfig.network);
      
      // Get current gas prices
      const currentGasPrices = await this.getCurrentGasPrices(provider, validatedConfig.useEIP1559);
      
      await this.trackLog(
        executionId,
        nodeId,
        'info',
        `Current gas prices: ${JSON.stringify(currentGasPrices)}`
      );
      
      // Calculate optimal gas price based on strategy
      const optimalGasPrice = this.calculateOptimalGasPrice(
        currentGasPrices,
        validatedConfig
      );
      
      await this.trackLog(
        executionId,
        nodeId,
        'info',
        `Calculated optimal gas price: ${JSON.stringify(optimalGasPrice)}`
      );
      
      // Check historical data to estimate wait time
      const estimatedWaitTime = await this.estimateWaitTime(
        provider,
        optimalGasPrice,
        validatedConfig.useEIP1559
      );
      
      // Complete execution
      const result = {
        network: validatedConfig.network,
        currentGasPrices,
        recommendedGasPrice: optimalGasPrice,
        estimatedWaitTimeMinutes: estimatedWaitTime,
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
        `Gas optimization failed: ${error?.message || 'Unknown error'}`
      );
      
      // Complete execution with error
      await this.completeExecution(blockExecutionId, 'failed', null, error);
      
      throw error;
    }
  }
  
  /**
   * Validates the configuration for the gas optimizer block
   */
  private validateConfig(config: Record<string, any>): GasOptimizerConfig {
    try {
      return GasOptimizerConfigSchema.parse(config);
    } catch (error: any) {
      throw new Error(`Invalid gas optimizer configuration: ${error?.message || 'Unknown validation error'}`);
    }
  }
  
  /**
   * Initializes providers for different networks
   */
  private initializeProviders(): void {
    // Initialize providers for common networks
    if (process.env.ETH_RPC_URL) {
      this.providers['ethereum'] = new ethers.JsonRpcProvider(process.env.ETH_RPC_URL);
    }
    if (process.env.POLYGON_RPC_URL) {
      this.providers['polygon'] = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL);
    }
    if (process.env.ARBITRUM_RPC_URL) {
      this.providers['arbitrum'] = new ethers.JsonRpcProvider(process.env.ARBITRUM_RPC_URL);
    }
    if (process.env.OPTIMISM_RPC_URL) {
      this.providers['optimism'] = new ethers.JsonRpcProvider(process.env.OPTIMISM_RPC_URL);
    }
    
    // Log initialized providers
    this.logger.log(`Initialized providers for networks: ${Object.keys(this.providers).join(', ')}`);
  }

  /**
   * Gets the provider for a specified network
   */
  private getProvider(network: string): Provider {
    const provider = this.providers[network.toLowerCase()];
    if (!provider) {
      throw new Error(`Provider not found for network: ${network}`);
    }
    return provider;
  }
  
  /**
   * Gets current gas prices from the network
   */
  private async getCurrentGasPrices(
    provider: Provider,
    useEIP1559: boolean
  ): Promise<any> {
    try {
      if (useEIP1559) {
        // For EIP-1559 transactions, get fee data
        const feeData = await provider.getFeeData();
        
        if (!feeData.maxFeePerGas || !feeData.maxPriorityFeePerGas) {
          throw new Error('Fee data is incomplete');
        }
        
        return {
          maxFeePerGas: ethers.formatUnits(feeData.maxFeePerGas, 'gwei'),
          maxPriorityFeePerGas: ethers.formatUnits(feeData.maxPriorityFeePerGas, 'gwei'),
          // In ethers v6, there's no baseFeePerGas in FeeData, we'll use a fallback
          baseFeePerGas: '0',
        };
      } else {
        // For legacy transactions, get fee data and use gasPrice
        const feeData = await provider.getFeeData();
        
        if (!feeData.gasPrice) {
          throw new Error('Gas price data is missing');
        }
        
        const gasPriceGwei = ethers.formatUnits(feeData.gasPrice, 'gwei');
        
        // Simulate different gas price tiers
        const parsedGasPrice = parseFloat(gasPriceGwei);
        return {
          slow: (parsedGasPrice * 0.8).toFixed(2),
          average: parsedGasPrice.toFixed(2),
          fast: (parsedGasPrice * 1.2).toFixed(2),
        };
      }
    } catch (error: any) {
      throw new Error(`Failed to get current gas prices: ${error?.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Calculates optimal gas price based on strategy and current prices
   */
  private calculateOptimalGasPrice(
    currentGasPrices: any,
    config: GasOptimizerConfig
  ): any {
    try {
      if (config.useEIP1559) {
        // For EIP-1559 transactions
        let maxPriorityFeePerGas = config.priorityFee ? 
          config.priorityFee : 
          parseFloat(currentGasPrices.maxPriorityFeePerGas);
        
        // Adjust priority fee based on strategy
        switch (config.gasStrategy) {
          case 'aggressive':
            maxPriorityFeePerGas *= 1.5;
            break;
          case 'economic':
            maxPriorityFeePerGas *= 0.8;
            break;
          // 'balanced' uses the current priority fee
        }
        
        // Calculate max fee per gas
        let maxFeePerGas = parseFloat(currentGasPrices.maxFeePerGas);
        
        // Apply max gas price cap if specified
        if (config.maxGasPrice && maxFeePerGas > config.maxGasPrice) {
          maxFeePerGas = config.maxGasPrice;
        }
        
        return {
          type: 'eip1559',
          maxFeePerGas: maxFeePerGas.toFixed(2),
          maxPriorityFeePerGas: maxPriorityFeePerGas.toFixed(2),
        };
      } else {
        // For legacy transactions
        let gasPrice: number;
        
        switch (config.gasStrategy) {
          case 'aggressive':
            gasPrice = parseFloat(currentGasPrices.fast);
            break;
          case 'economic':
            gasPrice = parseFloat(currentGasPrices.slow);
            break;
          default: // 'balanced'
            gasPrice = parseFloat(currentGasPrices.average);
        }
        
        // Apply max gas price cap if specified
        if (config.maxGasPrice && gasPrice > config.maxGasPrice) {
          gasPrice = config.maxGasPrice;
        }
        
        return {
          type: 'legacy',
          gasPrice: gasPrice.toFixed(2),
        };
      }
    } catch (error: any) {
      throw new Error(`Failed to calculate optimal gas price: ${error?.message || 'Unknown error'}`);
    }
  }
  
  /**
   * Estimates wait time for a transaction with the given gas price
   */
  private async estimateWaitTime(
    provider: Provider,
    gasPrice: any,
    useEIP1559: boolean
  ): Promise<number> {
    try {
      // This is a simplified implementation
      // In a production environment, this would use historical data and more complex models
      
      // Get recent blocks to analyze gas prices
      const latestBlockNumber = await provider.getBlockNumber();
      const blocks = await Promise.all(
        Array.from({ length: 10 }, (_, i) => provider.getBlock(latestBlockNumber - i))
      );
      
      // Calculate average gas prices in recent blocks
      const blockGasPrices = blocks.map(block => {
        if (!block) return 0;
        // In ethers v6, we need to check if the block has a baseFeePerGas property
        const baseFee = block.baseFeePerGas;
        if (!baseFee) return 0;
        return parseFloat(ethers.formatUnits(baseFee, 'gwei'));
      }).filter(price => price > 0);
      
      const avgBlockGasPrice = blockGasPrices.reduce((sum, price) => sum + price, 0) / blockGasPrices.length;
      
      // Calculate estimated wait time based on gas price difference
      let waitTimeMinutes: number;
      
      if (useEIP1559) {
        const userMaxFeePerGas = parseFloat(gasPrice.maxFeePerGas);
        const userPriorityFee = parseFloat(gasPrice.maxPriorityFeePerGas);
        
        if (userMaxFeePerGas > avgBlockGasPrice * 1.5 && userPriorityFee > 1.5) {
          waitTimeMinutes = 0.5; // Very fast: next block
        } else if (userMaxFeePerGas > avgBlockGasPrice * 1.2 && userPriorityFee > 1) {
          waitTimeMinutes = 2; // Fast: 2-3 blocks
        } else if (userMaxFeePerGas >= avgBlockGasPrice && userPriorityFee > 0.5) {
          waitTimeMinutes = 5; // Normal: 5-10 blocks
        } else {
          waitTimeMinutes = 15; // Slow: many blocks
        }
      } else {
        const userGasPrice = parseFloat(gasPrice.gasPrice);
        
        if (userGasPrice > avgBlockGasPrice * 1.5) {
          waitTimeMinutes = 0.5; // Very fast: next block
        } else if (userGasPrice > avgBlockGasPrice * 1.2) {
          waitTimeMinutes = 2; // Fast: 2-3 blocks
        } else if (userGasPrice >= avgBlockGasPrice) {
          waitTimeMinutes = 5; // Normal: 5-10 blocks
        } else {
          waitTimeMinutes = 15; // Slow: many blocks
        }
      }
      
      return waitTimeMinutes;
    } catch (error: any) {
      this.logger.warn(`Failed to estimate wait time: ${error?.message || 'Unknown error'}`);
      // Return a default estimate if calculation fails
      return 5;
    }
  }
}
