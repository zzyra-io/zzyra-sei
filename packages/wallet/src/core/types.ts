/**
 * Core wallet types and interfaces
 *
 * This file contains the main type definitions for the wallet package,
 * including supported chains, wallet types, and provider interfaces.
 * Integrates Magic Link with Zyra's database models.
 */

import type { WalletService } from "../services/wallet.service";

// Using string type for Address since we're removing wagmi dependency
export type Address = string;

/**
 * Supported chain types
 */
export enum ChainType {
  ETHEREUM = "ethereum",
  POLYGON = "polygon",
  OPTIMISM = "optimism",
  ARBITRUM = "arbitrum",
  GOERLI = "goerli",
  MUMBAI = "mumbai",
}

/**
 * Supported wallet provider types
 */
export enum WalletType {
  MAGIC = "magic",
  METAMASK = "metamask",
  WALLET_CONNECT = "walletconnect",
  COINBASE = "coinbase",
  // Other wallet types can be added later
}

/**
 * Connection status for wallet
 */
export enum ConnectionStatus {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  ERROR = "error",
}

/**
 * Magic Link connection options
 */
export interface MagicConnectionOptions {
  email: string; // Make required to match usage in magic provider
  phone?: string;
  showUI?: boolean;
}

/**
 * Options for wallet connection
 */
export interface ConnectionOptions {
  chainId?: number;
  magic?: MagicConnectionOptions;
}

/**
 * Wallet connection result
 */
export interface WalletConnection {
  address: Address;
  chainId: number;
  connector: any;
  isConnected: boolean;
  isReconnecting: boolean;
  isConnecting: boolean;
  status: ConnectionStatus;
  isDisconnected: boolean;
}

/**
 * Transaction request parameters
 */
export interface TransactionRequest {
  to: Address;
  value: bigint | string;
  data?: string;
  gasLimit?: bigint | string;
  gasPrice?: bigint | string;
  nonce?: number;
}

/**
 * Transaction response data
 */
export interface TransactionResponse {
  hash: string;
  from: Address;
  to: Address;
  value: bigint | string;
  status: "pending" | "success" | "failed";
  blockNumber?: number;
  timestamp?: number;
}

/**
 * Chain configuration interface
 */
export interface ChainConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  symbol: string;
  decimals: number;
  blockExplorerUrl: string;
  getExplorerUrl: (txHash: string) => string;
  testnet?: boolean;
}

/**
 * Magic provider configuration
 */
export interface MagicProviderConfig {
  apiKey: string;
  accentColor?: string;
  oauthOptions?: {
    providers: string[];
    callbackUrl?: string;
  };
}

/**
 * Database model for user wallets
 */
export interface Wallet {
  id: string;
  userId: string;
  chainId: string;
  walletAddress: string;
  walletType: WalletType;
  chainType: ChainType;
  email?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Database model for wallet transactions
 */
export interface WalletTransaction {
  id: string;
  userId: string;
  walletId: string;
  txHash: string;
  txType: string;
  fromAddress: Address;
  toAddress: Address;
  amount: string;
  status: "pending" | "success" | "failed";
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Wallet context state for React context
 */
/**
 * Wallet provider interface
 * This interface defines the methods that must be implemented by all wallet providers
 */
export interface WalletProviderInterface {
  connect(options?: ConnectionOptions): Promise<WalletConnection | null>;
  disconnect(): Promise<void>;
  getAccounts(): Promise<Address[]>;
  signMessage(message: string): Promise<string>;
  sendTransaction(
    transaction: TransactionRequest
  ): Promise<TransactionResponse>;
  isConnected(): boolean;
  getChainId(): Promise<number>;
  getConnection(): WalletConnection | null;
}

/**
 * Wallet context state for React context
 */
export interface WalletContextState {
  // States from wagmi/useAccount can be used directly in components:
  // address?: Address;
  // isConnected?: boolean; // from wagmi
  // isConnecting?: boolean; // from wagmi (for the connector itself)
  // isReconnecting?: boolean; // from wagmi
  // isDisconnected?: boolean; // from wagmi
  // status?: "connected" | "reconnecting" | "connecting" | "disconnected"; // from wagmi
  // chainId?: number; // from wagmi

  // Application-specific state and service:
  walletService: WalletService | null; // Instance of our WalletService for DB operations
  persistedWallet: Wallet | null; // The wallet profile loaded from our database for the connected account (using Wallet type from this file)
  isLoadingPersistedWallet: boolean; // True when fetching wallet data from our DB
  // list of all persisted wallets for the user, could be useful
  persistedWallets: Wallet[];
  // Application specific error, e.g., DB operation error
  appError: Error | null;

  // Functions that might interact with WalletService and wagmi state:
  // This function would be called after wagmi successfully connects.
  // It uses wagmi's connected address and chainId to save/update in DB via WalletService.
  syncWalletWithDb: (wagmiWallet: {
    address: string;
    chainId: number;
    connectorId?: string; // e.g. 'magic', 'metaMask' from wagmi
  }) => Promise<void>;

  // Clears app-level persisted wallet state
  clearPersistedWallet: () => void;

  // Example of a function that uses WalletService
  fetchUserPersistedWallets: (userId: string) => Promise<Wallet[]>;

  // userId might be managed here or in a separate auth context
  // For now, assume WalletProvider handles it or receives it.
  userId?: string;
  setAppUserId?: (userId: string) => void; // If WalletProvider manages userId for the service

  // Wagmi actions like connect, disconnect, sign, sendTransaction are used directly via wagmi hooks in components.
  // We no longer provide connectMagic, disconnect etc. directly from this context if wagmi handles them.
}
