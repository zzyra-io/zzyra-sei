/**
 * @zyra/wallet - Base Wallet Provider
 * 
 * This file defines the abstract base class that all wallet providers must implement.
 */

import { 
  WalletProviderInterface,
  WalletInfo,
  WalletBalance,
  TransactionParams,
  TransactionResult,
  ChainConfig
} from '../core/types';

/**
 * Abstract base class for wallet providers
 * 
 * All wallet providers (Magic, etc.) must extend this class and implement
 * its abstract methods.
 */
export abstract class BaseWalletProvider implements WalletProviderInterface {
  /**
   * Configuration options for the provider
   */
  protected config: any = {};
  
  /**
   * Current active chain configuration
   */
  protected currentChain: ChainConfig | null = null;

  /**
   * Initialize the wallet provider with options
   */
  abstract initialize(options?: any): Promise<void>;
  
  /**
   * Connect to a wallet using email (for Magic) or other methods
   */
  abstract connect(email: string, chainId?: number | string): Promise<WalletInfo>;
  
  /**
   * Disconnect from the current wallet
   */
  abstract disconnect(): Promise<void>;
  
  /**
   * Check if connected to a wallet
   */
  abstract isConnected(): Promise<boolean>;
  
  /**
   * Get the current wallet address
   */
  abstract getAddress(): Promise<string | null>;
  
  /**
   * Get balance for an address on the specified chain
   */
  abstract getBalance(address: string, chainId?: number | string): Promise<WalletBalance>;
  
  /**
   * Send a transaction
   */
  abstract sendTransaction(params: TransactionParams): Promise<TransactionResult>;
  
  /**
   * Sign a message
   */
  abstract signMessage(message: string): Promise<string>;
  
  /**
   * Switch to a different chain
   */
  abstract switchChain(chainId: number | string): Promise<void>;
}
