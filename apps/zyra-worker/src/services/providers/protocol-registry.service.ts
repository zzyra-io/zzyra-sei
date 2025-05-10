import { Injectable } from '@nestjs/common';
import { ProtocolProvider } from './protocol-provider';
import { AaveProtocolProvider } from './protocols/aave-provider';
import { UniswapProtocolProvider } from './protocols/uniswap-provider';
import { ethers } from 'ethers';

/**
 * Registry service for protocol providers
 * Acts as a factory to get the correct protocol provider instance
 */
@Injectable()
export class ProtocolRegistryService {
  private providers: Map<string, ProtocolProvider> = new Map();
  private defaultProvider: ProtocolProvider;
  
  constructor() {
    // Initialize RPC provider
    const rpcUrl = process.env.RPC_URL || 'https://eth.llamarpc.com';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    // Initialize protocol-specific providers
    this.registerProvider('aave', new AaveProtocolProvider());
    this.registerProvider('uniswap', new UniswapProtocolProvider());
    
    // Set up default provider for fallback
    this.defaultProvider = new DefaultProtocolProvider(provider);
  }
  
  /**
   * Register a protocol provider
   * @param name Protocol name (lowercase)
   * @param provider Protocol provider instance
   */
  registerProvider(name: string, provider: ProtocolProvider): void {
    this.providers.set(name.toLowerCase(), provider);
  }
  
  /**
   * Get a protocol provider by name
   * @param name Protocol name
   * @returns Protocol provider instance
   */
  getProvider(name: string): ProtocolProvider {
    const provider = this.providers.get(name.toLowerCase());
    return provider || this.defaultProvider;
  }
  
  /**
   * Alias for getProvider to maintain compatibility with existing code
   * @param name Protocol name
   * @returns Protocol provider instance
   */
  getProtocolProvider(name: string): ProtocolProvider {
    return this.getProvider(name);
  }
  
  /**
   * Get all available protocol names
   */
  getAvailableProtocols(): string[] {
    return Array.from(this.providers.keys());
  }
}

/**
 * Default protocol provider implementation from protocol-provider.ts
 * Used as a fallback when a specific provider is not found
 */
class DefaultProtocolProvider implements ProtocolProvider {
  constructor(private provider: ethers.JsonRpcProvider) {}

  async getHealth(protocol: string): Promise<number> {
    // Implementation depends on protocol
    return 100;
  }

  async getProtocolYields(protocol: string, assets: string[]): Promise<Record<string, number>> {
    return assets.reduce((yields, asset) => {
      yields[asset] = 0;
      return yields;
    }, {} as Record<string, number>);
  }

  async getAssetYield(protocol: string, asset: string): Promise<number> {
    // Implementation depends on protocol
    return 0;
  }

  async getPositions(protocol: string, walletAddress?: string, assets?: string[]): Promise<any[]> {
    // Implementation depends on protocol and wallet
    return [];
  }

  async executeSwap(params: {
    sourceAsset: string;
    targetAsset: string;
    amount: ethers.BigNumberish;
    slippage: number;
    gasLimit: number;
    maxFee: number;
  }): Promise<ethers.TransactionResponse> {
    const transaction: ethers.TransactionRequest = {
      to: params.targetAsset,
      value: ethers.parseEther(params.amount.toString()),
      gasLimit: params.gasLimit,
      maxFeePerGas: params.maxFee
    };
    
    const wallet = new ethers.Wallet(process.env.ETHEREUM_PRIVATE_KEY || '', this.provider);
    const tx = await wallet.sendTransaction(transaction);
    return tx;
  }

  async provideLiquidity(params: {
    poolAddress: string;
    tokenA: string;
    tokenB: string;
    amount: ethers.BigNumberish;
    slippage: number;
  }): Promise<ethers.TransactionResponse> {
    const amountBN = ethers.parseEther(params.amount.toString());
    const transaction: ethers.TransactionRequest = {
      to: params.poolAddress,
      value: amountBN,
      data: '0x' // Replace with actual encoded data
    };
    
    const wallet = new ethers.Wallet(process.env.ETHEREUM_PRIVATE_KEY || '', this.provider);
    return await wallet.sendTransaction(transaction);
  }

  async removeLiquidity(params: {
    poolAddress: string;
    amount: ethers.BigNumberish;
    minAmountA: ethers.BigNumberish;
    minAmountB: ethers.BigNumberish;
  }): Promise<ethers.TransactionResponse> {
    const amountBN = ethers.parseEther(params.amount.toString());
    const minAmountABN = ethers.parseEther(params.minAmountA.toString());
    const minAmountBBN = ethers.parseEther(params.minAmountB.toString());
    
    const transaction: ethers.TransactionRequest = {
      to: params.poolAddress,
      value: amountBN,
      data: '0x' // Replace with actual encoded data
    };
    
    const wallet = new ethers.Wallet(process.env.ETHEREUM_PRIVATE_KEY || '', this.provider);
    return await wallet.sendTransaction(transaction);
  }

  async getMetrics(protocol: string): Promise<any> {
    // Implementation depends on protocol
    return {};
  }

  async optimizeYieldStrategy(params: {
    yields: Record<string, number>;
    strategy: string;
    optimizationGoal: string;
  }): Promise<any> {
    // Implementation depends on strategy
    return {};
  }

  async getEvents(protocol: string, timeframe: string): Promise<any[]> {
    // Implementation depends on protocol
    return [];
  }
}
