/**
 * Type definitions for wallet integration in Zyra
 * These types are used across UI and worker components for consistency
 */

/**
 * Supported blockchain types
 */
export enum ChainType {
  EVM = 'evm',
  SOLANA = 'solana'
}

/**
 * Wallet information including address and chain details
 */
export interface WalletInfo {
  // Standard fields used by the wallet adapter
  address: string;
  chainType: ChainType;
  chainId: string | number;
  provider: string;
  
  // Database compatibility fields
  network_id?: string;          // Maps to chain_id in database
  smart_wallet_address?: string; // Maps to address in database
  userInfo?: {
    email?: string;
    name?: string;
    profileImage?: string;
    oauthProvider?: string;
    phoneNumber?: string;
  };
}

/**
 * Wallet balance information
 */
export interface WalletBalance {
  raw: string;
  formatted: string;
  symbol: string;
}

/**
 * Transaction parameters for sending transactions
 */
export interface TransactionParams {
  to: string;
  value: string;
  data?: string;
}

/**
 * Common interface for all wallet providers
 */
export interface WalletProvider {
  connect(email: string): Promise<WalletInfo>;
  getBalance(address: string): Promise<WalletBalance>;
  sendTransaction(params: TransactionParams): Promise<string>;
  disconnect(): Promise<void>;
  isConnected(): Promise<boolean>;
}
