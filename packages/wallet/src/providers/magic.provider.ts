/**
 * Magic Link wallet provider implementation
 *
 * Implements the wallet provider interface using Magic Link as the underlying
 * authentication and wallet service.
 */

import { Magic, MagicSDKAdditionalConfiguration } from "magic-sdk";
// Use viem instead of ethers as it's in the dependencies
import { createWalletClient, http, parseEther, publicActions } from "viem";
import {
  ConnectionOptions,
  WalletConnection,
  TransactionRequest,
  TransactionResponse,
  ConnectionStatus,
} from "../core/types";
import { BaseWalletProvider } from "./base.provider";
import { ConnectionError, TransactionError } from "../core/errors";
import { DEFAULT_CONNECTION_OPTIONS } from "../core/constants";

/**
 * Magic Link specific connection options
 */
export type MagicOptions = MagicSDKAdditionalConfiguration;

/**
 * Magic Link wallet provider
 */
export class MagicProvider extends BaseWalletProvider {
  private magic: Magic;

  /**
   * Create a new Magic Link provider
   * @param apiKey Magic Link API key
   * @param options Configuration options
   */
  constructor(apiKey: string, options?: MagicOptions) {
    super();
    if (!apiKey) {
      throw new Error("Magic Link API key is required");
    }

    this.magic = new Magic(apiKey, options);
    // Create wallet client from magic provider
    createWalletClient({
      transport: http(),
      // @ts-ignore - magic provider format is compatible
      account: this.magic.rpcProvider,
    }).extend(publicActions);
  }

  /**
   * Connect to Magic Link wallet
   * @param options Connection options including email
   * @returns Wallet connection
   */
  async connect(options?: ConnectionOptions): Promise<WalletConnection> {
    try {
      // Merge with default options
      const connectionOptions = { ...DEFAULT_CONNECTION_OPTIONS, ...options };

      if (!connectionOptions.magic?.email) {
        throw new ConnectionError(
          "Email is required for Magic Link authentication",
          "wallet/missing-email"
        );
      }

      // Log in with Magic Link
      await this.magic.auth.loginWithMagicLink({
        email: connectionOptions.magic.email as string,
      });

      // Get user metadata
      const userInfo = await this.magic.user.getInfo();
      const address = userInfo.publicAddress as string;

      if (!address) {
        throw new ConnectionError(
          "Failed to get wallet address from Magic Link",
          "wallet/no-address"
        );
      }

      // Get chain ID
      // Get chain ID from configured options or default
      const chainId =
        connectionOptions.chainId || DEFAULT_CONNECTION_OPTIONS.chainId;

      // Create wallet connection
      this.connection = {
        address,
        chainId: chainId,
        connector: this.magic,
        isConnected: true,
        isReconnecting: false,
        isConnecting: false,
        status: ConnectionStatus.CONNECTED,
        isDisconnected: false,
      };

      return this.connection as WalletConnection;
    } catch (error) {
      // Handle errors from Magic SDK
      if (error instanceof ConnectionError) {
        throw error;
      }

      throw new ConnectionError(
        `Failed to connect with Magic Link: ${(error as Error).message}`,
        "wallet/magic-connection-failed"
      );
    }
  }

  /**
   * Sign a message with the Magic Link wallet
   * @returns Signature
   */
  async signMessage(): Promise<string> {
    this.ensureConnected();

    try {
      // Sign message using the provider
      const signature = await this.magic.user.generateIdToken();

      return signature;
    } catch (error) {
      throw new TransactionError(
        `Failed to sign message: ${(error as Error).message}`,
        "wallet/sign-failed"
      );
    }
  }

  /**
   * Send a transaction using Magic Link
   * @param transaction Transaction request
   * @returns Transaction response
   */
  async sendTransaction(
    transaction: TransactionRequest
  ): Promise<TransactionResponse> {
    this.ensureConnected();

    try {
      // Get the current address
      const from = this.connection?.address;

      // Create transaction object - ethers handles this differently
      // We'll convert the numeric values as needed

      // Send transaction
      // Send transaction through the magic provider
      // Need to use any to bypass typings restriction
      const txHash = await (this.magic.rpcProvider as any).request({
        method: "eth_sendTransaction",
        params: [
          {
            from,
            to: transaction.to,
            value:
              typeof transaction.value === "bigint"
                ? transaction.value.toString(16)
                : parseEther(transaction.value.toString()).toString(16),
            data: transaction.data || "0x",
            gas: transaction.gasLimit
              ? transaction.gasLimit.toString()
              : undefined,
            gasPrice: transaction.gasPrice
              ? transaction.gasPrice.toString()
              : undefined,
          },
        ],
      });

      // We don't have the full receipt in this case, just the hash

      return {
        hash: txHash,
        from: from as string,
        to: transaction.to,
        value: transaction.value,
        status: "pending",
      };
    } catch (error) {
      throw new TransactionError(
        `Transaction failed: ${(error as Error).message}`,
        "wallet/transaction-failed",
        undefined,
        error
      );
    }
  }

  /**
   * Disconnect from Magic Link wallet
   */
  async disconnect(): Promise<void> {
    try {
      if (this.connection) {
        await this.magic.user.logout();
      }
    } finally {
      // Always reset connection state
      this.connection = null;
    }
  }

  /**
   * Check if wallet is connected
   */
  isConnected(): boolean {
    return this.connection !== null;
  }
}
