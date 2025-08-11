/**
 * Base implementation for blockchain services
 * Provides common functionality that all blockchain services can use
 */

import { Logger } from '@nestjs/common';
import {
  createPublicClient,
  http,
  Address,
  parseEther,
  parseUnits,
} from 'viem';
import { seiTestnet, sepolia, base, baseSepolia } from 'viem/chains';
import {
  TransactionRequest,
  TransactionResult,
  ChainConfig,
  GasEstimate,
} from '../types/blockchain.types';
import { IBlockchainService } from './IBlockchainService';

export abstract class BaseBlockchainService implements IBlockchainService {
  protected readonly logger = new Logger(this.constructor.name);
  protected readonly supportedChains = [seiTestnet, sepolia, base, baseSepolia];

  /**
   * Get supported chain configurations
   */
  getSupportedChains(): ChainConfig[] {
    return this.supportedChains.map((chain) => ({
      id: chain.id,
      name: chain.name,
      rpcUrl: chain.rpcUrls.default.http[0],
      explorerUrl: chain.blockExplorers?.default?.url || '',
      nativeCurrency: chain.nativeCurrency,
      testnet: 'testnet' in chain ? chain.testnet : false,
    }));
  }

  /**
   * Check if a chain is supported by this service
   */
  isChainSupported(chainId: number): boolean {
    return this.supportedChains.some((chain) => chain.id === chainId);
  }

  /**
   * Get chain configuration by chain ID
   */
  protected getChainConfig(chainId: number) {
    const chain = this.supportedChains.find((c) => c.id === chainId);
    if (!chain) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }
    return chain;
  }

  /**
   * Create a public client for blockchain interactions
   */
  protected createPublicClient(chainId: number): any {
    const chain = this.getChainConfig(chainId);
    return createPublicClient({
      transport: http(chain.rpcUrls.default.http[0]),
      chain,
    });
  }

  /**
   * Validate transaction parameters
   */
  protected validateTransactionParameters(transaction: TransactionRequest): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validate chain ID
    if (!this.isChainSupported(transaction.chainId)) {
      errors.push(`Unsupported chain ID: ${transaction.chainId}`);
    }

    // Validate recipient address
    if (!this.isValidAddress(transaction.to)) {
      errors.push(`Invalid recipient address: ${transaction.to}`);
    }

    // Validate amount
    if (!this.isValidAmount(transaction.value)) {
      errors.push(`Invalid amount: ${transaction.value}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate and normalize transaction value
   */
  protected validateAndNormalizeValue(value: string): string {
    if (!value && value !== '0') {
      throw new Error('Transaction value is required');
    }

    // Handle empty or null values
    if (value === '' || value === null || value === undefined) {
      return '0';
    }

    // Convert to string and trim whitespace
    const valueStr = String(value).trim();

    // Handle empty string after trim
    if (valueStr === '') {
      return '0';
    }

    // Check if it's a valid number
    const numValue = parseFloat(valueStr);
    if (isNaN(numValue)) {
      throw new Error(
        `Invalid transaction value: ${valueStr}. Must be a valid number.`,
      );
    }

    // Check for negative values
    if (numValue < 0) {
      throw new Error(
        `Invalid transaction value: ${valueStr}. Cannot be negative.`,
      );
    }

    // Return normalized value as string
    return numValue.toString();
  }

  /**
   * Check if an address is valid
   */
  protected isValidAddress(address: string): boolean {
    if (!address || typeof address !== 'string') {
      return false;
    }

    // Basic Ethereum address validation
    const addressRegex = /^0x[a-fA-F0-9]{40}$/;
    return addressRegex.test(address);
  }

  /**
   * Check if an amount is valid
   */
  protected isValidAmount(amount: string): boolean {
    if (!amount && amount !== '0') {
      return false;
    }

    const numValue = parseFloat(amount);
    return !isNaN(numValue) && numValue >= 0;
  }

  /**
   * Get explorer URL for a transaction
   */
  protected getExplorerUrl(chainId: number, transactionHash: string): string {
    const chain = this.getChainConfig(chainId);
    const baseUrl = chain.blockExplorers?.default?.url;

    if (!baseUrl) {
      return '';
    }

    return `${baseUrl}/tx/${transactionHash}`;
  }

  /**
   * Convert wei to ether string representation
   */
  protected weiToEther(wei: bigint): string {
    return (Number(wei) / 1e18).toString();
  }

  /**
   * Convert ether to wei
   */
  protected etherToWei(ether: string): bigint {
    return parseEther(this.validateAndNormalizeValue(ether));
  }

  /**
   * Convert token amount to smallest unit
   */
  protected tokenToSmallestUnit(amount: string, decimals: number): bigint {
    return parseUnits(this.validateAndNormalizeValue(amount), decimals);
  }

  // Abstract methods that must be implemented by concrete services
  abstract executeTransaction(
    transaction: TransactionRequest,
    walletConfig: { privateKey: string; address: string },
  ): Promise<TransactionResult>;

  abstract estimateGas(transaction: TransactionRequest): Promise<GasEstimate>;

  abstract getCurrentGasPrices(chainId: number): Promise<{
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
  }>;

  abstract getNativeBalance(address: string, chainId: number): Promise<string>;

  abstract getTokenBalance(
    tokenAddress: string,
    walletAddress: string,
    chainId: number,
  ): Promise<string>;

  abstract validateTransaction(transaction: TransactionRequest): Promise<{
    valid: boolean;
    errors: string[];
  }>;

  abstract healthCheck(chainId: number): Promise<{
    healthy: boolean;
    latency?: number;
    blockNumber?: number;
    error?: string;
  }>;
}
