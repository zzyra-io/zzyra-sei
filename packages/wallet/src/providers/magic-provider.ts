/**
 * @zyra/wallet - Magic Wallet Provider Base Class
 *
 * This file contains the base implementation for Magic wallet providers.
 * Environment-specific implementations will extend this class.
 */

import { BaseWalletProvider } from "./base-provider";
import {
  WalletInfo,
  WalletBalance,
  TransactionParams,
  TransactionResult,
  ChainType,
  WalletProvider,
  OAuthProvider,
} from "../core/types";
import { getChainById, getDefaultChain } from "../core/chain-registry";

/**
 * Abstract base class for Magic wallet providers
 *
 * Contains shared functionality for Magic wallet integration across environments.
 * Browser and Node.js specific implementations will extend this class.
 */
export abstract class MagicWalletProvider extends BaseWalletProvider {
  /**
   * Magic API key
   */
  protected apiKey: string;

  /**
   * Current wallet information
   */
  protected currentWallet: WalletInfo | null = null;

  /**
   * Constructor
   *
   * @param apiKey Magic API key
   */
  constructor(apiKey: string) {
    super();
    this.apiKey = apiKey;
  }

  /**
   * Get chain configuration based on chain ID
   *
   * @param chainId Optional chain ID
   * @returns ChainConfig for the specified chain or current chain
   */
  protected getChainConfig(chainId?: number | string) {
    // Use current chain if no chain ID specified and current chain exists
    if (!chainId && this.currentChain) {
      return this.currentChain;
    }

    // Get chain by ID if specified
    if (chainId) {
      const chain = getChainById(chainId);
      if (chain) return chain;
    }

    // Default to Polygon Mumbai if no other chain found
    return getDefaultChain(ChainType.EVM);
  }

  /**
   * Connect with OAuth provider
   *
   * @param provider OAuth provider (Google, Apple, etc.)
   * @param chainId Optional chain ID
   * @returns Promise resolving to wallet info
   */
  abstract connectWithOAuth(
    provider: OAuthProvider,
    chainId?: number | string
  ): Promise<WalletInfo>;

  /**
   * Connect with SMS
   *
   * @param phoneNumber User's phone number
   * @param chainId Optional chain ID
   * @returns Promise resolving to wallet info
   */
  abstract connectWithSMS(
    phoneNumber: string,
    chainId?: number | string
  ): Promise<WalletInfo>;

  /**
   * Generate a Magic Link DID token for Supabase authentication
   *
   * @returns Promise resolving to DID token
   */
  abstract generateDIDToken(): Promise<string>;

  /**
   * Get user info from Magic
   *
   * @returns Promise resolving to user metadata
   */
  abstract getUserInfo(): Promise<any>;
}
