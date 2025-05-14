/**
 * @zyra/wallet - Node.js Magic Provider Implementation
 *
 * This file contains the Node.js specific implementation of the Magic wallet provider.
 * This is used for server-side operations where browser APIs are not available.
 */

import { MagicWalletProvider } from "../../providers/magic-provider";
import {
  WalletInfo,
  WalletBalance,
  TransactionParams,
  TransactionResult,
  ChainType,
  WalletProvider,
  OAuthProvider,
} from "../../core/types";

/**
 * Node.js implementation of Magic wallet provider
 *
 * Note: This is a simplified implementation that only supports basic operations.
 * For true wallet functionality in a server context, you should use admin SDKs
 * or server-side signing keys rather than Magic wallet.
 */
export class NodeMagicProvider extends MagicWalletProvider {
  /**
   * Initialize the provider
   */
  async initialize(): Promise<void> {
    // No-op for Node.js implementation
    console.warn(
      "Magic wallet has limited functionality in Node.js environment"
    );
  }

  /**
   * Connect to a wallet using Magic Link
   *
   * Note: This is a stub method as Magic authentication requires browser interaction.
   * In a real implementation, you would receive authentication tokens or keys
   * from a previous browser session.
   */
  async connect(email: string): Promise<WalletInfo> {
    throw new Error(
      "Magic authentication requires browser interaction. Use admin SDK or server keys for Node.js applications."
    );
  }

  /**
   * Connect with OAuth provider
   *
   * @param provider OAuth provider
   * @param chainId Optional chain ID
   * @returns Promise resolving to wallet info
   */
  async connectWithOAuth(
    provider: OAuthProvider,
    chainId?: number | string
  ): Promise<WalletInfo> {
    throw new Error(
      "OAuth authentication requires browser interaction. Use admin SDK or server keys for Node.js applications."
    );
  }

  /**
   * Handle OAuth callback
   *
   * @param chainId Optional chain ID
   * @returns Promise resolving to wallet info
   */
  async handleOAuthCallback(chainId?: number | string): Promise<WalletInfo> {
    throw new Error(
      "OAuth authentication requires browser interaction. Use admin SDK or server keys for Node.js applications."
    );
  }

  /**
   * Connect with SMS
   *
   * @param phoneNumber User's phone number
   * @param chainId Optional chain ID
   * @returns Promise resolving to wallet info
   */
  async connectWithSMS(
    phoneNumber: string,
    chainId?: number | string
  ): Promise<WalletInfo> {
    throw new Error(
      "SMS authentication requires browser interaction. Use admin SDK or server keys for Node.js applications."
    );
  }

  /**
   * Generate a Magic DID token
   *
   * @returns Promise resolving to DID token
   */
  async generateDIDToken(): Promise<string> {
    throw new Error(
      "DID token generation requires browser interaction. Use admin SDK for Node.js applications."
    );
  }

  /**
   * Get user info from Magic
   *
   * @returns Promise resolving to user info
   */
  async getUserInfo(): Promise<any> {
    throw new Error(
      "User info retrieval requires browser interaction. Use admin SDK for Node.js applications."
    );
  }

  /**
   * Disconnect from the current wallet
   */
  async disconnect(): Promise<void> {
    // No-op for Node.js implementation
  }

  /**
   * Check if connected to a wallet
   *
   * @returns Always false for Node.js implementation
   */
  async isConnected(): Promise<boolean> {
    return false;
  }

  /**
   * Get the current wallet address
   *
   * @returns Always null for Node.js implementation
   */
  async getAddress(): Promise<string | null> {
    return null;
  }

  /**
   * Get balance for an address
   *
   * @param address Wallet address
   * @param chainId Optional chain ID
   * @returns Stub wallet balance
   */
  async getBalance(
    address: string,
    chainId?: number | string
  ): Promise<WalletBalance> {
    // In a real implementation, you would query a blockchain node or API
    return {
      formatted: "0.0",
      raw: "0",
      symbol: "ETH",
      decimals: 18,
    };
  }

  /**
   * Send a transaction
   *
   * @param params Transaction parameters
   * @returns Error as this method is not implemented
   */
  async sendTransaction(params: TransactionParams): Promise<TransactionResult> {
    throw new Error(
      "Transactions in Node.js require server private keys or admin SDK, not Magic wallet."
    );
  }

  /**
   * Sign a message
   *
   * @param message Message to sign
   * @returns Error as this method is not implemented
   */
  async signMessage(message: string): Promise<string> {
    throw new Error(
      "Message signing in Node.js requires server private keys or admin SDK, not Magic wallet."
    );
  }

  /**
   * Switch to a different chain
   *
   * @param chainId Chain ID to switch to
   */
  async switchChain(chainId: number | string): Promise<void> {
    // No-op for Node.js implementation
  }
}

/**
 * Create a Node.js Magic provider
 *
 * @param apiKey Magic API key
 * @returns Node Magic provider instance
 */
export function createNodeMagicProvider(apiKey: string): NodeMagicProvider {
  return new NodeMagicProvider(apiKey);
}
