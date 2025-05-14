/**
 * @zyra/wallet - Core Type Definitions
 *
 * This file contains all the type definitions used throughout the wallet library.
 * It's designed to be compatible with the existing @zyra/types library.
 */

/**
 * Supported blockchain types
 */
export enum ChainType {
  EVM = "evm",
  SOLANA = "solana",
}

/**
 * Supported wallet providers
 */
export enum WalletProvider {
  MAGIC = "magic",
  EXTERNAL = "external",
}

/**
 * Supported OAuth providers
 */
export enum OAuthProvider {
  GOOGLE = "google",
  APPLE = "apple",
  FACEBOOK = "facebook",
  TWITTER = "twitter",
  GITHUB = "github",
}

/**
 * Base chain configuration interface
 */
export interface ChainConfig {
  id: number | string;
  name: string;
  type: ChainType;
  rpcUrl: string;
  blockExplorerUrl: string;
  symbol: string;
  decimals: number;
  testnet: boolean;
}

/**
 * EVM-specific chain configuration
 */
export interface EVMChainConfig extends ChainConfig {
  type: ChainType.EVM;
  id: number;
  chainId: number; // For EVM compatibility
}

/**
 * Solana-specific chain configuration
 */
export interface SolanaChainConfig extends ChainConfig {
  type: ChainType.SOLANA;
  id: string;
}

/**
 * Wallet information
 */
export interface WalletInfo {
  address: string;
  provider: WalletProvider;
  chainType: ChainType;
  chainId: number | string;
  publicKey?: string; // For Solana
  userInfo?: {
    email?: string;
    phoneNumber?: string;
    oauthProvider?: OAuthProvider;
    name?: string;
    profileImage?: string;
  };
}

/**
 * Wallet balance information
 */
export interface WalletBalance {
  formatted: string;
  raw: string | bigint;
  symbol: string;
  decimals: number;
}

/**
 * Transaction parameters
 */
export interface BaseTransactionParams {
  chainType: ChainType;
  chainId: number | string;
}

/**
 * EVM transaction parameters
 */
export interface EVMTransactionParams extends BaseTransactionParams {
  chainType: ChainType.EVM;
  chainId: number;
  to: string;
  value?: string | bigint;
  data?: string;
  gasLimit?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
}

/**
 * Solana transaction parameters
 */
export interface SolanaTransactionParams extends BaseTransactionParams {
  chainType: ChainType.SOLANA;
  chainId: string;
  to: string;
  amount: number | bigint;
  splToken?: string; // Optional SPL token address
}

/**
 * Union type for all transaction parameters
 */
export type TransactionParams = EVMTransactionParams | SolanaTransactionParams;

/**
 * Transaction result
 */
export interface TransactionResult {
  hash: string;
  chainType: ChainType;
  chainId: number | string;
  from: string;
  to: string;
  value?: string;
  timestamp: number;
}

/**
 * Wallet storage data
 */
export interface WalletStorageData {
  userId: string;
  address: string;
  provider: WalletProvider;
  chainType: ChainType;
  chainId: number | string;
  metadata?: Record<string, any>;
}

/**
 * Storage adapter interface
 */
export interface StorageAdapter {
  saveWallet(data: WalletStorageData): Promise<any>;
  getWallet(userId: string, filters?: Partial<WalletStorageData>): Promise<any>;
  listWallets(userId: string): Promise<any[]>;
}

/**
 * Wallet provider interface
 */
export interface WalletProviderInterface {
  initialize(options?: any): Promise<void>;
  connect(email: string, chainId?: number | string): Promise<WalletInfo>;
  connectWithOAuth(
    provider: OAuthProvider,
    chainId?: number | string
  ): Promise<WalletInfo>;
  connectWithSMS(
    phoneNumber: string,
    chainId?: number | string
  ): Promise<WalletInfo>;
  handleOAuthCallback(chainId?: number | string): Promise<WalletInfo>;
  generateDIDToken(): Promise<string>;
  getUserInfo(): Promise<any>;
  disconnect(): Promise<void>;
  isConnected(): Promise<boolean>;
  getAddress(): Promise<string | null>;
  getBalance(
    address: string,
    chainId?: number | string
  ): Promise<WalletBalance>;
  sendTransaction(params: TransactionParams): Promise<TransactionResult>;
  signMessage(message: string): Promise<string>;
  switchChain(chainId: number | string): Promise<void>;
}
