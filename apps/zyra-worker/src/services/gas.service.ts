import { Injectable, Logger } from '@nestjs/common';
import { TransactionRequest, BigNumberish } from 'ethers';
import { DefaultGasProvider } from './providers/gas-provider';

@Injectable()
export class GasService {
  constructor(
    private gasProvider: DefaultGasProvider,
    private readonly logger: Logger
  ) {
    this.logger.log('GasService initialized');
  }

  async getGasPrice(): Promise<number> {
    const gasPrice = await this.gasProvider.getGasPrice();
    return Number(gasPrice);
  }

  async getOptimizedGasPrice(strategy: string): Promise<number> {
    const currentPrice = await this.getGasPrice();
    
    switch (strategy) {
      case 'gas_price':
        return await this.optimizeByGasPrice(currentPrice);
      case 'block_time':
        return await this.optimizeByBlockTime(currentPrice);
      case 'network_load':
        return await this.optimizeByNetworkLoad(currentPrice);
      default:
        return currentPrice;
    }
  }

  private async getHistoricalPrices(timeframe: string): Promise<number[]> {
    const prices = await this.gasProvider.getHistoricalPrices(timeframe);
    const avgPrice = Number(prices.reduce((sum, price) => sum + price, 0n) / BigInt(prices.length));
    return [avgPrice];
  }

  private async optimizeByGasPrice(currentPrice: number): Promise<number> {
    const historicalPrices = await this.getHistoricalPrices('1d');
    const avgPrice = historicalPrices[0];
    
    // If current price is significantly higher than average, wait for better price
    if (currentPrice > avgPrice * 1.2) {
      return avgPrice * 1.1; // Target 10% above average
    }
    
    return currentPrice;
  }

  private async optimizeByBlockTime(currentPrice: number): Promise<number> {
    const blockTime = await this.gasProvider.getBlockTime();
    
    // If block time is low (network is fast), use lower gas price
    if (blockTime < 12) {
      return currentPrice * 0.9;
    }
    // If block time is high (network is congested), use higher gas price
    else if (blockTime > 15) {
      return currentPrice * 1.2;
    }
    
    return currentPrice;
  }

  private async optimizeByNetworkLoad(currentPrice: number): Promise<number> {
    const load = await this.gasProvider.getNetworkLoad();
    
    // If network load is low, use lower gas price
    if (load < 0.7) {
      return currentPrice * 0.8;
    }
    // If network load is high, use higher gas price
    else if (load > 0.9) {
      return currentPrice * 1.3;
    }
    
    return currentPrice;
  }

  async estimateGas(transaction: TransactionRequest): Promise<bigint> {
    const gasEstimate = await this.gasProvider.estimateGas(transaction);
    return BigInt(gasEstimate);
  }

  async simulateTransaction(transaction: TransactionRequest): Promise<string> {
    return this.gasProvider.simulateTransaction(transaction);
  }

  async getGasEstimates(transaction: TransactionRequest): Promise<{ fast: number; average: number; slow: number; recommended: number }> {
    const estimates = await this.gasProvider.getGasEstimates(transaction);
    return {
      fast: Number(estimates.fast),
      average: Number(estimates.average),
      slow: Number(estimates.slow),
      recommended: Number(estimates.recommended)
    };
  }

  async getGasUsage(transaction: TransactionRequest): Promise<bigint> {
    return this.gasProvider.getGasUsage(transaction);
  }

  async getGasCost(transaction: TransactionRequest): Promise<bigint> {
    const gasPrice = await this.getGasPrice();
    const gasLimit = await this.estimateGas(transaction);
    return BigInt(gasPrice) * BigInt(gasLimit);
  }

  async getGasHistory(timeframe: string): Promise<number[]> {
    return this.gasProvider.getGasHistory(timeframe).then(prices => prices.map(price => Number(price)));
  }

  async getGasTrends(): Promise<{ average: number; max: number; min: number; current: number }> {
    const history = await this.getGasHistory('7d');
    const avg = history.reduce((sum, price) => sum + price, 0) / history.length;
    const max = Math.max(...history);
    const min = Math.min(...history);
    
    return {
      average: avg,
      max,
      min,
      current: history[history.length - 1]
    };
  }
}
