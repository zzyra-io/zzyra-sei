/**
 * Base wallet provider implementation
 *
 * Abstract class that implements common functionality for all wallet providers
 * and defines the structure that concrete providers should follow.
 */

import {
  WalletProviderInterface,
  ConnectionOptions,
  WalletConnection,
  TransactionRequest,
  TransactionResponse,
  Address,
} from "../core/types";
import { NotConnectedError } from "../core/errors";

/**
 * Abstract base provider that implements common functionality
 */
export abstract class BaseWalletProvider implements WalletProviderInterface {
  /**
   * Current wallet connection
   */
  protected connection: WalletConnection | null = null;

  /**
   * Connect to the wallet
   * This method must be implemented by subclasses
   */
  abstract connect(options?: ConnectionOptions): Promise<WalletConnection>;

  /**
   * Disconnect from the wallet
   */
  async disconnect(): Promise<void> {
    this.connection = null;
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this.connection !== null;
  }

  /**
   * Get wallet address
   */
  async getAddress(): Promise<string | null> {
    if (!this.connection) {
      return null;
    }
    return this.connection.address;
  }

  /**
   * Get connected accounts
   */
  async getAccounts(): Promise<Address[]> {
    if (!this.connection) {
      return [];
    }
    return [this.connection.address];
  }

  /**
   * Get current chain ID
   */
  async getChainId(): Promise<number> {
    if (!this.connection) {
      throw new NotConnectedError();
    }
    return this.connection.chainId;
  }

  /**
   * Get current connection
   */
  getConnection(): WalletConnection | null {
    return this.connection;
  }

  /**
   * Sign a message with the wallet
   * This method must be implemented by subclasses
   */
  abstract signMessage(message: string): Promise<string>;

  /**
   * Send a transaction
   * This method must be implemented by subclasses
   */
  abstract sendTransaction(
    transaction: TransactionRequest
  ): Promise<TransactionResponse>;

  /**
   * Ensure wallet is connected
   * Utility method to check connection status and throw if not connected
   */
  protected ensureConnected(): void {
    if (!this.connection) {
      throw new NotConnectedError();
    }
  }
}
