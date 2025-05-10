import { Injectable } from '@nestjs/common';

import { DefiBlockType, DefiBlockConfig } from '../../types/defi-blocks';

import { ethers } from 'ethers';
import { PriceFeedService } from '@/services/price-feed.service';

interface ProtocolPosition {
  asset: string;
  value: string | number;
  priceHistory?: number[];
  marketPriceHistory?: number[];
  returns?: number[];
}

interface RiskMetricsPosition {
  asset: string;
  value: number;
  priceHistory: number[];
  marketPriceHistory: number[];
  returns: number[];
}

interface Balance {
  value: number;
}

interface BalanceMap {
  [key: string]: Balance;
}
import { ProtocolService } from '@/services/protocol.service';
import { PortfolioService } from '@/services/portfolio.service';
import { GasService } from '@/services/gas.service';
import { ProtocolRegistryService } from '@/services/providers/protocol-registry.service';
import { BlockType, BlockExecutionContext, BlockHandler } from '@zyra/types';


@Injectable()
export class DefiBlockHandler implements BlockHandler {
  constructor(
    protected priceFeedService: PriceFeedService,
    protected protocolService: ProtocolService,
    protected portfolioService: PortfolioService,
    protected gasService: GasService,
    protected protocolRegistry: ProtocolRegistryService
  ) {}

  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    const config = node.data.config as DefiBlockConfig;
    
    switch (config.type) {
      case DefiBlockType.PRICE_MONITOR:
        return this.handlePriceMonitor(node, ctx);
      case DefiBlockType.YIELD_MONITOR:
        return this.handleYieldMonitor(node, ctx);
      case DefiBlockType.PORTFOLIO_BALANCE:
        return this.handlePortfolioBalance(node, ctx);
      case DefiBlockType.REBALANCE_CALCULATOR:
        return this.handleRebalanceCalculator(node, ctx);
      case DefiBlockType.SWAP_EXECUTOR:
        return this.handleSwapExecutor(node, ctx);
      case DefiBlockType.GAS_OPTIMIZER:
        return this.handleGasOptimizer(node, ctx);
      case DefiBlockType.PROTOCOL_MONITOR:
        return this.handleProtocolMonitor(node, ctx);
      case DefiBlockType.YIELD_STRATEGY:
        return this.handleYieldStrategy(node, ctx);
      case DefiBlockType.LIQUIDITY_PROVIDER:
        return this.handleLiquidityProvider(node, ctx);
      case DefiBlockType.POSITION_MANAGER:
        return this.handlePositionManager(node, ctx);
      default:
        throw new Error(`Unsupported DeFi block type: ${config.type}`);
    }
  }

  protected async handlePriceMonitor(node: any, ctx: BlockExecutionContext): Promise<any> {
    const config = node.data.config as DefiBlockConfig;
    const { assets, threshold, monitoringInterval } = config;
    
    const prices = await Promise.all(
      assets.map(asset => this.priceFeedService.getPrice(asset))
    );
    
    const priceChanges = prices.map((price, i) => ({
      asset: assets[i],
      currentPrice: price,
      change: ((price - ctx.previousOutputs?.lastPrices?.[assets[i]] || 0) / (ctx.previousOutputs?.lastPrices?.[assets[i]] || 1)) * 100
    }));
    
    const alert = priceChanges.some(change => Math.abs(change.change) >= threshold);
    
    return {
      prices,
      priceChanges,
      alert,
      monitoringInterval
    };
  }

  protected async handleYieldMonitor(node: any, ctx: BlockExecutionContext): Promise<any> {
    const config = node.data.config as DefiBlockConfig;
    const { protocol, assets, monitoringInterval, yieldThreshold } = config;
    
    const yields = await Promise.all(
      assets.map(asset => this.protocolService.getAssetYield(protocol, asset))
    );
    
    const totalYield = yields.reduce((sum, currentYield) => sum + currentYield, 0);
    const averageYield = totalYield / assets.length;
    
    const alert = averageYield < yieldThreshold;
    
    return {
      yields,
      totalYield,
      averageYield,
      alert,
      monitoringInterval
    };
  }

  protected async handlePortfolioBalance(node: any, ctx: BlockExecutionContext): Promise<any> {
    const config = node.data.config as DefiBlockConfig;
    const { assets, protocols, monitoringInterval } = config;
    
    const balances = await Promise.all(
      assets.map(asset => this.portfolioService.getAssetBalance(asset))
    );
    
    const protocolPositions = await Promise.all(
      protocols.map(protocol => this.protocolService.getProtocolPositions(protocol))
    );
    
    return {
      balances,
      protocolPositions,
      totalValue: balances.reduce((sum, balance) => sum + balance.value, 0),
      monitoringInterval
    };
  }

  protected async handleRebalanceCalculator(node: any, ctx: BlockExecutionContext): Promise<any> {
    const config = node.data.config as DefiBlockConfig;
    const { targetWeights, rebalanceThreshold, slippage } = config;
    
    const currentBalances = ctx.previousOutputs?.balances || {};
    // Fix the type issues with the reducer
    const totalValue = Object.values(currentBalances).reduce(
      (sum: number, balance: any) => sum + Number(balance.value), 
      0
    );
    
    const rebalances = Object.entries(currentBalances).map(([asset, balance]) => {
      const targetValue = Number(totalValue) * targetWeights[asset];
      const currentValue = Number((balance as any).value);
      const amountToRebalance = targetValue - currentValue;
      
      if (Math.abs(currentValue - targetValue) / targetValue > rebalanceThreshold) {
        return {
          asset,
          targetValue,
          currentValue,
          amountToRebalance
        };
      }
      
      return null;
    }).filter(Boolean);
    
    return {
      rebalances,
      totalValue,
      slippage,
      needsRebalance: rebalances.length > 0
    };
  }

  protected async handleSwapExecutor(node: any, ctx: BlockExecutionContext): Promise<any> {
    const config = node.data.config as DefiBlockConfig;
    const { sourceAsset, targetAsset, amount, slippage, gasLimit, maxFee, protocol } = config;
    
    // Get current source asset price for tracking
    const price = await this.priceFeedService.getPrice(sourceAsset);
    
    // Convert amount to proper format
    const value = ethers.parseEther(amount);
    
    try {
      // Get the appropriate protocol provider (defaults to uniswap if not specified)
      const swapProtocol = protocol || 'uniswap';
      const protocolProvider = this.protocolRegistry.getProvider(swapProtocol);
      
      // Execute the swap using the protocol provider
      const tx = await protocolProvider.executeSwap({
        sourceAsset,
        targetAsset,
        amount: value,
        slippage,
        gasLimit,
        maxFee
      });
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      return {
        txHash: receipt.hash,
        status: receipt.status === 1 ? 'success' : 'failed',
        gasUsed: receipt.gasUsed.toString(),
        effectivePrice: price,
        slippage,
        protocol: swapProtocol
      };
    } catch (error) {
      console.error('Error executing swap:', error);
      return {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        effectivePrice: price,
        slippage
      };
    }
  }

  protected async handleGasOptimizer(node: any, ctx: BlockExecutionContext): Promise<any> {
    const config = node.data.config as DefiBlockConfig;
    const { gasLimit, maxFee, optimizationStrategy } = config;
    
    const gasPrice = await this.gasService.getOptimizedGasPrice(optimizationStrategy);
    
    return {
      gasPrice,
      gasLimit,
      maxFee,
      optimizationStrategy,
      optimized: true
    };
  }

  protected async handleProtocolMonitor(node: any, ctx: BlockExecutionContext): Promise<any> {
    const config = node.data.config as DefiBlockConfig;
    const { protocol, monitoringInterval, healthThreshold } = config;
    
    // Get the specific protocol provider
    const protocolProvider = this.protocolRegistry.getProvider(protocol);
    
    // Get protocol health from the provider
    const health = await protocolProvider.getHealth(protocol);
    const alert = health < healthThreshold;
    
    // Get additional protocol metrics
    const metrics = await protocolProvider.getMetrics(protocol);
    
    return {
      health,
      alert,
      monitoringInterval,
      metrics
    };
  }

  protected async handleYieldStrategy(node: any, ctx: BlockExecutionContext): Promise<any> {
    const config = node.data.config as DefiBlockConfig;
    const { strategy, assets, protocols, optimizationGoal } = config;
    
    try {
      // Collect yield data from all requested protocols
      const yields: Record<string, number> = {};
      
      for (const protocol of protocols) {
        const protocolProvider = this.protocolRegistry.getProvider(protocol);
        const protocolYields = await protocolProvider.getProtocolYields(protocol, assets);
        
        // Merge with existing yields, keeping the higher yield rate if the asset exists in multiple protocols
        for (const [asset, yieldRate] of Object.entries(protocolYields)) {
          if (!yields[asset] || yieldRate > yields[asset]) {
            yields[asset] = yieldRate;
          }
        }
      }
      
      // Use the protocol with the most yield information for optimization
      // In a real implementation, we might have a dedicated optimization service
      const primaryProtocol = protocols[0];
      const protocolProvider = this.protocolRegistry.getProvider(primaryProtocol);
      
      const optimizedStrategy = await protocolProvider.optimizeYieldStrategy({
        yields,
        strategy,
        optimizationGoal
      });
      
      // Add timestamp for caching/expiration purposes
      const timestamp = new Date().toISOString();
      
      return {
        optimizedStrategy,
        yields,
        strategy,
        optimizationGoal,
        protocols,
        timestamp,
        status: 'success'
      };
    } catch (error) {
      console.error('Error optimizing yield strategy:', error);
      return {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
        strategy,
        optimizationGoal,
        protocols
      };
    }
  }

  protected async handleLiquidityProvider(node: any, ctx: BlockExecutionContext): Promise<any> {
    const config = node.data.config as DefiBlockConfig;
    const { poolAddress, tokenA, tokenB, amount, slippage } = config;
    
    const tx = await this.protocolService.provideLiquidity({
      poolAddress,
      tokenA,
      tokenB,
      amount,
      slippage
    });
    
    const receipt = await tx.wait();
    
    return {
      txHash: receipt.hash,
      status: receipt.status,
      poolAddress,
      tokenA,
      tokenB,
      amount
    };
  }

  protected async handlePositionManager(node: any, ctx: BlockExecutionContext): Promise<any> {
    const config = node.data.config as DefiBlockConfig;
    const { assets, protocols, riskThreshold, monitoringInterval } = config;
    
    const protocolPositions = await Promise.all(
      protocols.map(protocol => this.protocolService.getPositions(protocol, assets))
    ).then(results => {
      // Flatten the array of position arrays
      const allPositions = results.flat() as ProtocolPosition[];
      
      // Transform positions into the expected format for risk metrics
      const formattedPositions: RiskMetricsPosition[] = allPositions.map(position => ({
        asset: position.asset,
        value: Number(position.value),
        priceHistory: position.priceHistory || [],
        marketPriceHistory: position.marketPriceHistory || [],
        returns: position.returns || []
      }));
      
      return formattedPositions;
    });
    
    const riskMetrics = await this.portfolioService.calculateRiskMetrics(protocolPositions);
    const alert = riskMetrics.totalRisk > riskThreshold;
    
    return {
      positions: protocolPositions,
      riskMetrics,
      alert,
      monitoringInterval
    };
  }
}
