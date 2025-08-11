/**
 * Base interface for all blockchain services
 * Defines common operations that all blockchain services must implement
 */

import {
  TransactionRequest,
  TransactionResult,
  GasEstimate,
  ChainConfig,
  BlockchainServiceConfig,
} from '../types/blockchain.types';

export interface IBlockchainService {
  /**
   * Get supported chain configurations
   */
  getSupportedChains(): ChainConfig[];

  /**
   * Check if a chain is supported by this service
   */
  isChainSupported(chainId: number): boolean;

  /**
   * Execute a standard blockchain transaction
   */
  executeTransaction(
    transaction: TransactionRequest,
    walletConfig: { privateKey: string; address: string },
  ): Promise<TransactionResult>;

  /**
   * Estimate gas for a transaction
   */
  estimateGas(transaction: TransactionRequest): Promise<GasEstimate>;

  /**
   * Get current gas prices for the network
   */
  getCurrentGasPrices(chainId: number): Promise<{
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
  }>;

  /**
   * Get native token balance for an address
   */
  getNativeBalance(address: string, chainId: number): Promise<string>;

  /**
   * Get ERC20 token balance for an address
   */
  getTokenBalance(
    tokenAddress: string,
    walletAddress: string,
    chainId: number,
  ): Promise<string>;

  /**
   * Validate a transaction before execution
   */
  validateTransaction(transaction: TransactionRequest): Promise<{
    valid: boolean;
    errors: string[];
  }>;

  /**
   * Health check for the service
   */
  healthCheck(chainId: number): Promise<{
    healthy: boolean;
    latency?: number;
    blockNumber?: number;
    error?: string;
  }>;
}

export interface IAccountAbstractionService extends IBlockchainService {
  /**
   * Create a smart account
   */
  createSmartAccount(config: {
    ownerPrivateKey: string;
    chainId: number;
    delegationMode?: 'immediate' | 'delegated' | 'hybrid';
  }): Promise<{
    smartAccountAddress: string;
    ownerAddress: string;
    chainId: number;
    delegationMode: string;
    deploymentRequired: boolean;
  }>;

  /**
   * Execute transaction using session key (Account Abstraction)
   */
  executeWithSessionKey(
    sessionConfig: {
      sessionPrivateKey: string;
      smartWalletAddress: string;
      chainId: number;
      permissions: {
        operations: string[];
        maxAmountPerTx: string;
        maxDailyAmount: string;
        validUntil: Date;
      };
    },
    transaction: TransactionRequest,
  ): Promise<TransactionResult>;

  /**
   * Deploy smart wallet if needed
   */
  deploySmartWalletIfNeeded(
    smartWalletAddress: string,
    ownerPrivateKey: string,
    chainId: number,
  ): Promise<{
    deployed: boolean;
    deploymentHash?: string;
    error?: string;
  }>;

  /**
   * Execute ERC20 token transfer using Account Abstraction
   */
  executeERC20Transfer(
    sessionConfig: {
      sessionPrivateKey: string;
      smartWalletAddress: string;
      chainId: number;
      permissions: {
        operations: string[];
        maxAmountPerTx: string;
        maxDailyAmount: string;
        validUntil: Date;
      };
    },
    tokenAddress: string,
    toAddress: string,
    amount: string,
    decimals?: number,
  ): Promise<TransactionResult>;
}
