/**
 * @zyra/wallet - Main Entry Point
 *
 * This file exports the main wallet functionality and provides a unified interface
 * for both browser and Node.js environments.
 */

import {
  ChainType,
  WalletProvider,
  WalletInfo,
  WalletBalance,
  TransactionParams,
  TransactionResult,
  ChainConfig,
  EVMChainConfig,
  SolanaChainConfig,
  WalletProviderInterface,
  StorageAdapter,
  WalletStorageData,
  OAuthProvider,
} from "./core/types";

import {
  BASE_SEPOLIA,
  SOLANA_DEVNET,
  SOLANA_MAINNET,
  POLYGON_MUMBAI,
  getChainById,
  getChainsByType,
  getDefaultChain,
  SUPPORTED_CHAINS,
} from "./core/chain-registry";

import {
  isBrowser,
  isNode,
  getEnvironment,
  getImplementation,
} from "./utils/environment";
import { BaseWalletProvider } from "./providers/base-provider";

/**
 * Wallet configuration interface
 */
export interface ZyraWalletConfig {
  supabaseClient?: any; // Allow passing an existing Supabase client
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  [key: string]: any; // Allow arbitrary additional configuration
}

/**
 * ZyraWallet - Main wallet management class
 *
 * This class provides a unified interface for wallet management across environments.
 * It dynamically loads the appropriate implementation based on the runtime environment.
 */
export class ZyraWallet {
  /**
   * Magic API key
   */
  private apiKey: string;

  /**
   * Wallet configuration
   */
  private config: ZyraWalletConfig;

  /**
   * Current wallet provider
   */
  private walletProvider: WalletProviderInterface | null = null;

  /**
   * Storage adapter
   */
  private storageAdapter: StorageAdapter | null = null;

  /**
   * Constructor
   *
   * @param apiKey Magic API key
   * @param config Optional wallet configuration
   */
  constructor(apiKey: string, config: ZyraWalletConfig = {}) {
    this.apiKey = apiKey;
    this.config = config;
  }

  /**
   * Initialize the wallet system
   *
   * @param options Optional initialization options
   */
  async initialize(options?: any): Promise<void> {
    // Dynamically import the appropriate implementation
    try {
      const magicProvider = await this.getMagicProvider();

      // Initialize the provider
      await magicProvider.initialize(options);
      this.walletProvider = magicProvider;

      // If a Supabase client is provided directly, use it
      if (this.config.supabaseClient) {
        await this.setStorageAdapter(this.config.supabaseClient);
      }
      // Otherwise if Supabase credentials are provided in config, create a new instance
      else if (this.config.supabaseUrl && this.config.supabaseAnonKey) {
        try {
          // Dynamically import Supabase client
          const { createClient } = await import("@supabase/supabase-js");
          const supabaseClient = createClient(
            this.config.supabaseUrl,
            this.config.supabaseAnonKey
          );
          await this.setStorageAdapter(supabaseClient);
        } catch (error) {
          console.warn("Failed to initialize Supabase storage adapter:", error);
          // Continue without storage adapter
        }
      }
    } catch (error) {
      console.error("Failed to initialize ZyraWallet:", error);
      throw error;
    }
  }

  /**
   * Get the appropriate Magic provider based on environment
   *
   * @returns Magic provider implementation
   */
  private async getMagicProvider(): Promise<WalletProviderInterface> {
    return getImplementation(
      // Browser implementation
      async () => {
        const { createBrowserMagicProvider } = await import(
          "./adapters/browser/magic-browser"
        );
        return createBrowserMagicProvider(this.apiKey);
      },
      // Node.js implementation
      async () => {
        const { createNodeMagicProvider } = await import(
          "./adapters/node/magic-node"
        );
        return createNodeMagicProvider(this.apiKey);
      }
    );
  }

  /**
   * Set the storage adapter
   *
   * @param supabaseClient Supabase client instance
   */
  async setStorageAdapter(supabaseClient: any): Promise<void> {
    try {
      this.storageAdapter = await getImplementation<StorageAdapter>(
        // Browser implementation
        async () => {
          const { createBrowserStorageAdapter } = await import(
            "./adapters/browser/storage-browser"
          );
          return createBrowserStorageAdapter(supabaseClient);
        },
        // Node.js implementation
        async () => {
          const { createNodeStorageAdapter } = await import(
            "./adapters/node/storage-node"
          );
          return createNodeStorageAdapter(supabaseClient);
        }
      );
    } catch (error) {
      console.error("Failed to set storage adapter:", error);
      throw error;
    }
  }

  /**
   * Connect to a wallet using Magic Link
   *
   * @param email User's email address
   * @param chainId Optional chain ID
   * @returns Wallet information
   */
  async connect(email: string, chainId?: number | string): Promise<WalletInfo> {
    if (!this.walletProvider) {
      throw new Error("Wallet provider not initialized");
    }

    try {
      const walletInfo = await this.walletProvider.connect(email, chainId);

      // Save wallet to storage if storage adapter is available
      if (this.storageAdapter) {
        await this.storageAdapter.saveWallet({
          userId: email,
          address: walletInfo.address,
          provider: walletInfo.provider,
          chainType: walletInfo.chainType,
          chainId: walletInfo.chainId,
        });
      }

      return walletInfo;
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      throw error;
    }
  }

  /**
   * Connect to a wallet using OAuth provider
   *
   * @param provider OAuth provider
   * @param chainId Optional chain ID
   * @returns Promise that resolves when OAuth redirect is initiated
   */
  async connectWithOAuth(
    provider: OAuthProvider | string,
    chainId?: number | string
  ): Promise<any> {
    if (!this.walletProvider) {
      throw new Error("Wallet provider not initialized");
    }

    try {
      return await this.walletProvider.connectWithOAuth(
        provider as OAuthProvider,
        chainId
      );
    } catch (error) {
      console.error("Failed to connect with OAuth:", error);
      throw error;
    }
  }

  /**
   * Handle OAuth callback
   *
   * @param chainId Optional chain ID
   * @returns Wallet information
   */
  async handleOAuthCallback(chainId?: number | string): Promise<WalletInfo> {
    if (!this.walletProvider) {
      throw new Error("Wallet provider not initialized");
    }

    try {
      const walletInfo = await (this.walletProvider as any).handleOAuthCallback(
        chainId
      );

      // Save wallet to storage if storage adapter is available
      if (this.storageAdapter && walletInfo.userInfo?.email) {
        await this.storageAdapter.saveWallet({
          userId: walletInfo.userInfo.email,
          address: walletInfo.address,
          provider: walletInfo.provider,
          chainType: walletInfo.chainType,
          chainId: walletInfo.chainId,
          metadata: {
            userInfo: walletInfo.userInfo,
          },
        });
      }

      return walletInfo;
    } catch (error) {
      console.error("Failed to handle OAuth callback:", error);
      throw error;
    }
  }

  /**
   * Connect with SMS
   *
   * @param phoneNumber User's phone number
   * @param chainId Optional chain ID
   * @returns Wallet information
   */
  async connectWithSMS(
    phoneNumber: string,
    chainId?: number | string
  ): Promise<WalletInfo> {
    if (!this.walletProvider) {
      throw new Error("Wallet provider not initialized");
    }

    try {
      const walletInfo = await this.walletProvider.connectWithSMS(
        phoneNumber,
        chainId
      );

      // Save wallet to storage if storage adapter is available
      if (this.storageAdapter) {
        await this.storageAdapter.saveWallet({
          userId: phoneNumber,
          address: walletInfo.address,
          provider: walletInfo.provider,
          chainType: walletInfo.chainType,
          chainId: walletInfo.chainId,
        });
      }

      return walletInfo;
    } catch (error) {
      console.error("Failed to connect with SMS:", error);
      throw error;
    }
  }

  /**
   * Generate Magic DID token for authentication with Supabase
   *
   * @returns DID token string
   */
  async generateDIDToken(): Promise<string> {
    if (!this.walletProvider) {
      throw new Error("Wallet provider not initialized");
    }

    try {
      return await (this.walletProvider as any).generateDIDToken();
    } catch (error) {
      console.error("Failed to generate DID token:", error);
      throw error;
    }
  }

  /**
   * Get the wallet info for a user
   *
   * @param userId User ID (email)
   * @param filters Optional filters
   * @returns Wallet info or null if not found
   */
  async getWalletForUser(
    userId: string,
    filters?: Partial<WalletStorageData>
  ): Promise<WalletInfo | null> {
    if (!this.storageAdapter) {
      throw new Error("Storage adapter not set");
    }

    try {
      const walletData = await this.storageAdapter.getWallet(userId, filters);

      if (!walletData) return null;

      return {
        address: walletData.wallet_address,
        provider: walletData.wallet_type,
        chainType: walletData.chain_type,
        chainId: walletData.chain_id,
        publicKey: walletData.metadata?.publicKey,
      };
    } catch (error) {
      console.error("Failed to get wallet for user:", error);
      throw error;
    }
  }

  /**
   * List all wallets for a user
   *
   * @param userId User ID (email)
   * @returns Array of wallet info
   */
  async listWalletsForUser(userId: string): Promise<WalletInfo[]> {
    if (!this.storageAdapter) {
      throw new Error("Storage adapter not set");
    }

    try {
      const wallets = await this.storageAdapter.listWallets(userId);

      return wallets.map((wallet) => ({
        address: wallet.wallet_address,
        provider: wallet.wallet_type,
        chainType: wallet.chain_type,
        chainId: wallet.chain_id,
        publicKey: wallet.metadata?.publicKey,
      }));
    } catch (error) {
      console.error("Failed to list wallets for user:", error);
      throw error;
    }
  }

  /**
   * Disconnect from the current wallet
   */
  async disconnect(): Promise<void> {
    if (!this.walletProvider) return;

    try {
      await this.walletProvider.disconnect();
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
      throw error;
    }
  }

  /**
   * Check if connected to a wallet
   *
   * @returns True if connected, false otherwise
   */
  async isConnected(): Promise<boolean> {
    if (!this.walletProvider) return false;

    try {
      return await this.walletProvider.isConnected();
    } catch (error) {
      console.error("Failed to check if connected:", error);
      return false;
    }
  }

  /**
   * Get the current wallet address
   *
   * @returns Wallet address or null if not connected
   */
  async getAddress(): Promise<string | null> {
    if (!this.walletProvider) return null;

    try {
      return await this.walletProvider.getAddress();
    } catch (error) {
      console.error("Failed to get address:", error);
      return null;
    }
  }

  /**
   * Get balance for an address
   *
   * @param address Address to get balance for
   * @param chainId Optional chain ID
   * @returns Balance information
   */
  async getBalance(
    address: string,
    chainId?: number | string
  ): Promise<WalletBalance> {
    if (!this.walletProvider) {
      throw new Error("Wallet provider not initialized");
    }

    try {
      return await this.walletProvider.getBalance(address, chainId);
    } catch (error) {
      console.error("Failed to get balance:", error);
      throw error;
    }
  }

  /**
   * Send a transaction
   *
   * @param params Transaction parameters
   * @returns Transaction result
   */
  async sendTransaction(params: TransactionParams): Promise<TransactionResult> {
    if (!this.walletProvider) {
      throw new Error("Wallet provider not initialized");
    }

    try {
      return await this.walletProvider.sendTransaction(params);
    } catch (error) {
      console.error("Failed to send transaction:", error);
      throw error;
    }
  }

  /**
   * Sign a message
   *
   * @param message Message to sign
   * @returns Signature
   */
  async signMessage(message: string): Promise<string> {
    if (!this.walletProvider) {
      throw new Error("Wallet provider not initialized");
    }

    try {
      return await this.walletProvider.signMessage(message);
    } catch (error) {
      console.error("Failed to sign message:", error);
      throw error;
    }
  }

  /**
   * Switch to a different chain
   *
   * @param chainId Chain ID to switch to
   */
  async switchChain(chainId: number | string): Promise<void> {
    if (!this.walletProvider) {
      throw new Error("Wallet provider not initialized");
    }

    try {
      await this.walletProvider.switchChain(chainId);
    } catch (error) {
      console.error("Failed to switch chain:", error);
      throw error;
    }
  }
}

// Export chain configurations
export {
  BASE_SEPOLIA,
  SOLANA_DEVNET,
  SOLANA_MAINNET,
  POLYGON_MUMBAI,
  SUPPORTED_CHAINS,
};

// Export enums
export { ChainType, WalletProvider, OAuthProvider };

// Export types
export type {
  WalletInfo,
  WalletBalance,
  TransactionParams,
  TransactionResult,
  ChainConfig,
  EVMChainConfig,
  SolanaChainConfig,
};

// Export environment utilities
export { isBrowser, isNode, getEnvironment };
