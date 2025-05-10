import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';
import { BigNumberish } from 'ethers';
import { PriceFeedService } from './price-feed.service';

@Injectable()
export class PortfolioService {
  constructor(private priceFeedService: PriceFeedService) {}

  async getAssetBalance(asset: string): Promise<{ asset: string; balance: string; value: number }> {
    const balance = ethers.parseEther('0').toString();
    return {
      asset,
      balance,
      value: 0
    };
  }

  async getAssetBalances(): Promise<{ asset: string; balance: string; value: number }[]> {
    const assets = ['ETH', 'USDC', 'DAI']; // Replace with actual asset list
    const balances = await Promise.all(assets.map(asset => this.getAssetBalance(asset)));
    return balances;
  }

  async calculateRiskMetrics(positions: Array<{ asset: string; value: number; priceHistory: number[]; marketPriceHistory: number[]; returns: number[] }>): Promise<{ riskMetrics: Array<{ asset: string; volatility: number; beta: number; sharpeRatio: number; weight: number }>; totalRisk: number; totalValue: number }> {
    const totalValue = positions.reduce((sum, pos) => sum + pos.value, 0);
    
    const riskMetrics = positions.map(pos => {
      const volatility = this.calculateVolatility(pos.priceHistory);
      const beta = this.calculateBeta(pos.priceHistory, pos.marketPriceHistory);
      const sharpeRatio = this.calculateSharpeRatio(pos.returns);
      
      return {
        asset: pos.asset,
        volatility,
        beta,
        sharpeRatio,
        weight: pos.value / totalValue
      };
    });
    
    const totalRisk = riskMetrics.reduce((sum, metrics) => 
      sum + (metrics.volatility * metrics.weight), 0
    );
    
    return {
      riskMetrics,
      totalRisk,
      totalValue
    };
  }

  private calculateVolatility(priceHistory: number[]): number {
    const returns = priceHistory.map((price, i) => {
      if (i === 0) return 0;
      return (price - priceHistory[i - 1]) / priceHistory[i - 1];
    });
    
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  private calculateBeta(assetReturns: number[], marketReturns: number[]): number {
    if (assetReturns.length !== marketReturns.length) {
      throw new Error('Return series must be of equal length');
    }
    
    const avgAsset = assetReturns.reduce((sum, ret) => sum + ret, 0) / assetReturns.length;
    const avgMarket = marketReturns.reduce((sum, ret) => sum + ret, 0) / marketReturns.length;
    
    const covariance = assetReturns.reduce((sum, ret, i) => {
      return sum + (ret - avgAsset) * (marketReturns[i] - avgMarket);
    }, 0) / assetReturns.length;
    
    const variance = marketReturns.reduce((sum, ret) => sum + Math.pow(ret - avgMarket, 2), 0) / marketReturns.length;
    
    return covariance / variance;
  }

  private calculateSharpeRatio(returns: number[]): number {
    const riskFreeRate = 0.02; // 2% annual risk-free rate
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const stdDev = Math.sqrt(
      returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length
    );
    
    return (avgReturn - riskFreeRate) / stdDev;
  }

  async rebalancePortfolio(currentBalances: Record<string, any>, targetWeights: Record<string, number>): Promise<any> {
    const totalValue = Object.values(currentBalances).reduce((sum, balance) => sum + balance.value, 0);
    
    const rebalances = Object.entries(currentBalances).map(([asset, balance]) => {
      const targetValue = totalValue * targetWeights[asset];
      const currentValue = balance.value;
      
      if (Math.abs(currentValue - targetValue) / targetValue > 0.05) { // 5% threshold
        return {
          asset,
          targetValue,
          currentValue,
          amountToRebalance: targetValue - currentValue
        };
      }
      
      return null;
    }).filter(Boolean);
    
    return {
      rebalances,
      totalValue,
      needsRebalance: rebalances.length > 0
    };
  }

  async getPortfolioValue(): Promise<number> {
    const balances = await this.getAssetBalances();
    return balances.reduce((sum, balance) => sum + Number(balance.value), 0);
  }

  async getPortfolioAllocation(): Promise<{ [key: string]: number }> {
    const balances = await this.getAssetBalances();
    const totalValue = await this.getPortfolioValue();
    
    const allocations: { [key: string]: number } = {};
    for (const balance of balances) {
      allocations[balance.asset] = Number(balance.value) / totalValue;
    }
    
    return allocations;
  }

  async calculatePortfolioValue(balances: Record<string, any>): Promise<number> {
    return Object.values(balances).reduce((sum, balance) => sum + balance.value, 0);
  }

  async calculatePortfolioAllocation(balances: Record<string, any>): Promise<Record<string, number>> {
    const totalValue = Number(this.calculatePortfolioValue(balances));
    return Object.entries(balances).reduce((allocations, [asset, balance]) => {
      allocations[asset] = Number(balance.value as string) / totalValue;
      return allocations;
    }, {} as Record<string, number>);
  }

  async calculatePortfolioPerformance(balances: Record<string, any>, timeframe: string): Promise<any> {
    const totalValue = this.calculatePortfolioValue(balances);
    const allocation = this.calculatePortfolioAllocation(balances);
    
    const performance = await Promise.all(
      Object.entries(balances).map(async ([asset, balance]) => {
        const priceHistory = await this.priceFeedService.getHistoricalPrices(asset, timeframe);
        const returns = priceHistory.map((price, i) => {
          if (i === 0) return 0;
          return (price - priceHistory[i - 1]) / priceHistory[i - 1];
        });
        
        const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
        const volatility = this.calculateVolatility(priceHistory);
        
        return {
          asset,
          avgReturn,
          volatility,
          weight: allocation[asset]
        };
      })
    );
    
    const portfolioReturn = performance.reduce((sum, perf) => 
      sum + (perf.avgReturn * perf.weight), 0
    );
    
    const portfolioVolatility = performance.reduce((sum, perf) => 
      sum + (perf.volatility * perf.weight), 0
    );
    
    return {
      performance,
      portfolioReturn,
      portfolioVolatility,
      totalValue
    };
  }
}
