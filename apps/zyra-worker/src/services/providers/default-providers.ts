import { Injectable, Logger } from '@nestjs/common';
import { getDefaultProvider } from 'ethers';

// Default protocol provider
@Injectable()
export class DefaultProtocolProvider {
  provider: any;
  logger: Logger;

  constructor(logger: Logger) {
    this.provider = getDefaultProvider();
    this.logger = logger;
  }

  async createWallet(privateKey: string) {
    return {};
  }

  async getHealth(protocol: string): Promise<number> {
    return 100;
  }

  async getMetrics(protocol: string): Promise<any> {
    return {};
  }

  async getAssetYield(protocol: string, asset: string): Promise<number> {
    return 0;
  }

  async getProtocolYields(protocol: string, assets: string[]): Promise<Record<string, number>> {
    return assets.reduce((acc, asset) => {
      acc[asset] = 0;
      return acc;
    }, {} as Record<string, number>);
  }

  async getPositions(protocol: string, assets: string[]): Promise<any[]> {
    return assets.map(asset => ({
      asset,
      value: 0,
      priceHistory: [],
      marketPriceHistory: [],
      returns: []
    }));
  }

  async optimizeYieldStrategy(params: any): Promise<any> {
    return {
      strategy: params.strategy,
      assets: params.assets || [],
      allocation: {}
    };
  }

  async provideLiquidity(params: any): Promise<any> {
    return {
      wait: async () => ({ hash: 'mock-tx-hash', status: 1 })
    };
  }

  async executeSwap(params: any): Promise<any> {
    return {
      wait: async () => ({ hash: 'mock-tx-hash', status: 1 })
    };
  }
}

// Default gas provider
@Injectable()
export class DefaultGasProvider {
  provider: any;
  logger: Logger;
  configService: any;

  constructor(logger: Logger, configService: any) {
    this.provider = getDefaultProvider();
    this.logger = logger;
    this.configService = configService;
  }

  async getGasPrice(): Promise<number> {
    return 20;
  }

  async getHistoricalPrices(timeframe: string): Promise<number[]> {
    return [20, 22, 18, 25, 19];
  }

  async getBlockTime(): Promise<number> {
    return 12;
  }

  async estimateGas(tx: any): Promise<number> {
    return 21000;
  }

  async optimizeGasFee(params: any): Promise<any> {
    return {
      maxFeePerGas: 30,
      maxPriorityFeePerGas: 2
    };
  }

  async getGasUsageStats(): Promise<any> {
    return {
      average: 21000,
      median: 21000,
      percentile95: 50000
    };
  }

  async predictGasPrice(timeframe: string): Promise<number> {
    return 22;
  }

  async getNetworkCongestion(): Promise<string> {
    return 'low';
  }

  async getOptimalGasSettings(): Promise<any> {
    return {
      maxFeePerGas: 30,
      maxPriorityFeePerGas: 2,
      gasLimit: 21000
    };
  }
}
