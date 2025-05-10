import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';
import { DefaultPriceFeedProvider } from './providers/price-feed-provider';

@Injectable()
export class PriceFeedService {
  constructor(private priceFeedProvider: DefaultPriceFeedProvider) {}

  async getPrice(asset: string): Promise<number> {
    return this.priceFeedProvider.getPrice(asset);
  }

  async getPrices(assets: string[]): Promise<Record<string, number>> {
    return this.priceFeedProvider.getPrices(assets);
  }

  async getHistoricalPrices(asset: string, timeframe: string): Promise<number[]> {
    return this.priceFeedProvider.getHistoricalPrices(asset, timeframe);
  }

  async getVolatility(asset: string, timeframe: string): Promise<number> {
    const prices = await this.getHistoricalPrices(asset, timeframe);
    const returns = prices.map((price, i) => {
      if (i === 0) return 0;
      return (price - prices[i - 1]) / prices[i - 1];
    });
    
    const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  async getCorrelation(assetA: string, assetB: string, timeframe: string): Promise<number> {
    const pricesA = await this.getHistoricalPrices(assetA, timeframe);
    const pricesB = await this.getHistoricalPrices(assetB, timeframe);
    
    if (pricesA.length !== pricesB.length) {
      throw new Error('Price history lengths do not match');
    }
    
    const returnsA = pricesA.map((price, i) => {
      if (i === 0) return 0;
      return (price - pricesA[i - 1]) / pricesA[i - 1];
    });
    
    const returnsB = pricesB.map((price, i) => {
      if (i === 0) return 0;
      return (price - pricesB[i - 1]) / pricesB[i - 1];
    });
    
    const avgA = returnsA.reduce((sum, ret) => sum + ret, 0) / returnsA.length;
    const avgB = returnsB.reduce((sum, ret) => sum + ret, 0) / returnsB.length;
    
    const covariance = returnsA.reduce((sum, retA, i) => {
      return sum + (retA - avgA) * (returnsB[i] - avgB);
    }, 0) / returnsA.length;
    
    const varianceA = returnsA.reduce((sum, ret) => sum + Math.pow(ret - avgA, 2), 0) / returnsA.length;
    const varianceB = returnsB.reduce((sum, ret) => sum + Math.pow(ret - avgB, 2), 0) / returnsB.length;
    
    return covariance / (Math.sqrt(varianceA) * Math.sqrt(varianceB));
  }
}
