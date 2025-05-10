import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';
import { BigNumberish } from 'ethers';
import { DefaultProtocolProvider } from './providers/protocol-provider';

@Injectable()
export class ProtocolService {
  constructor(private protocolProvider: DefaultProtocolProvider) {}

  async getProtocolHealth(protocol: string): Promise<number> {
    const health = await this.protocolProvider.getHealth(protocol);
    return health;
  }

  async getProtocolYields(protocol: string, assets: string[]): Promise<Record<string, number>> {
    return this.protocolProvider.getProtocolYields(protocol, assets);
  }

  async getAssetYield(protocol: string, asset: string): Promise<number> {
    return this.protocolProvider.getAssetYield(protocol, asset);
  }

  async getProtocolPositions(protocol: string): Promise<any[]> {
    return this.protocolProvider.getPositions(protocol);
  }

  async getPositions(protocol: string, assets: string[]): Promise<any[]> {
    // The ProtocolProvider.getPositions expects (protocol, walletAddress?, assets?)
    // So we need to pass undefined as the walletAddress and the assets array as the third parameter
    return this.protocolProvider.getPositions(protocol, undefined, assets);
  }

  async executeSwap(params: {
    sourceAsset: string;
    targetAsset: string;
    amount: ethers.BigNumberish;
    slippage: number;
    gasLimit: number;
    maxFee: number;
  }): Promise<ethers.TransactionResponse> {
    const amount = ethers.parseEther(params.amount.toString());
    return this.protocolProvider.executeSwap({ ...params, amount });
  }

  async provideLiquidity(params: {
    poolAddress: string;
    tokenA: string;
    tokenB: string;
    amount: ethers.BigNumberish;
    slippage: number;
  }): Promise<ethers.TransactionResponse> {
    const amount = ethers.parseEther(params.amount.toString());
    return this.protocolProvider.provideLiquidity({ ...params, amount });
  }

  async removeLiquidity(params: {
    poolAddress: string;
    amount: ethers.BigNumberish;
    minAmountA: ethers.BigNumberish;
    minAmountB: ethers.BigNumberish;
  }): Promise<ethers.TransactionResponse> {
    const amount = ethers.parseEther(params.amount.toString());
    const minAmountA = ethers.parseEther(params.minAmountA.toString());
    const minAmountB = ethers.parseEther(params.minAmountB.toString());
    return this.protocolProvider.removeLiquidity({ ...params, amount, minAmountA, minAmountB });
  }

  async getProtocolMetrics(protocol: string, metrics?: string[]): Promise<any> {
    return this.protocolProvider.getMetrics(protocol);
  }

  /**
   * Stub: Get yield data for all protocols for a given asset
   */
  async getProtocolsWithYieldForAsset(asset: string): Promise<Array<{ name: string; apy: number; riskScore: number; lockupPeriod: number; liquidityScore: number; tvl: number; strategyType: string;}>> {
    // TODO: implement actual logic
    return [];
  }

  async optimizeYieldStrategy(params: {
    yields: Record<string, number>;
    strategy: string;
    optimizationGoal: string;
  }): Promise<any> {
    return this.protocolProvider.optimizeYieldStrategy(params);
  }

  async getProtocolEvents(protocol: string, timeframe: string): Promise<any[]> {
    return this.protocolProvider.getEvents(protocol, timeframe);
  }
}
