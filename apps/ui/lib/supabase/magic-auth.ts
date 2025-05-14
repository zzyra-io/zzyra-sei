/**
 * Magic Link + Supabase authentication integration
 *
 * This file provides integration between Magic Link wallet/auth and Supabase auth.
 * It allows users to authenticate with Magic Link and have their session seamlessly linked to Supabase.
 */

import { SupabaseClient, createClient } from "@supabase/supabase-js";
import { WalletInfo, ChainType } from "@zyra/wallet";
import { ZyraWallet } from "@zyra/wallet";
import { config } from "@/lib/config";

/**
 * Magic Link + Supabase auth configuration
 */
interface MagicAuthConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  magicPublishableKey: string;
}

/**
 * Manages authentication between Magic Link and Supabase
 */
export class MagicLinkAuth {
  private supabase: SupabaseClient;
  private wallet: ZyraWallet;
  private config: MagicAuthConfig;

  /**
   * Constructor
   */
  constructor(config: MagicAuthConfig) {
    this.config = config;
    // Initialize Supabase client
    this.supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);
    // Initialize Magic wallet
    this.wallet = new ZyraWallet(config.magicPublishableKey);
  }

  /**
   * Initialize Magic wallet
   */
  async initialize(): Promise<void> {
    await this.wallet.initialize();
    await this.wallet.setStorageAdapter(this.supabase);
  }

  /**
   * Login with Magic Link (email)
   *
   * @param email User's email address
   * @param chainId Optional blockchain chain ID
   * @returns Wallet info
   */
  async loginWithMagicLink(
    email: string,
    chainId?: number | string
  ): Promise<WalletInfo> {
    try {
      // First, connect with Magic Link
      const walletInfo = await this.wallet.connect(email, chainId);

      // Generate DID token for Supabase auth
      const didToken = await this.generateDIDToken();

      // Sign in to Supabase with Magic token
      const { data, error } = await this.supabase.auth.signInWithIdToken({
        provider: "magic_link",
        token: didToken,
        nonce: crypto.randomUUID(),
      });

      if (error) {
        console.error("Failed to sign in to Supabase:", error);
        throw error;
      }

      // Update user metadata with wallet info
      await this.updateUserWalletMetadata(walletInfo);

      return walletInfo;
    } catch (error) {
      console.error("Login with Magic Link failed:", error);
      throw error;
    }
  }

  /**
   * Login with OAuth provider (Google, Apple, etc.)
   *
   * @param provider OAuth provider name
   * @param chainId Optional blockchain chain ID
   */
  async loginWithOAuth(
    provider: string,
    chainId?: number | string
  ): Promise<void> {
    // Magic will handle the redirect flow automatically
    await this.wallet.connectWithOAuth(provider as any, chainId);

    // Note: The actual auth completion happens in handleOAuthCallback
  }

  /**
   * Handle OAuth callback after redirect
   *
   * @param chainId Optional blockchain chain ID
   * @returns Wallet info
   */
  async handleOAuthCallback(chainId?: number | string): Promise<WalletInfo> {
    try {
      // Complete the OAuth flow with Magic
      const walletInfo = await this.wallet.handleOAuthCallback(chainId);

      // Generate DID token for Supabase auth
      const didToken = await this.generateDIDToken();

      // Sign in to Supabase with Magic token
      const { data, error } = await this.supabase.auth.signInWithIdToken({
        provider: "magic_link",
        token: didToken,
        nonce: crypto.randomUUID(),
      });

      if (error) {
        console.error("Failed to sign in to Supabase:", error);
        throw error;
      }

      // Update user metadata with wallet info
      await this.updateUserWalletMetadata(walletInfo);

      return walletInfo;
    } catch (error) {
      console.error("OAuth callback handling failed:", error);
      throw error;
    }
  }

  /**
   * Login with SMS
   *
   * @param phoneNumber User's phone number
   * @param chainId Optional blockchain chain ID
   * @returns Wallet info
   */
  async loginWithSMS(
    phoneNumber: string,
    chainId?: number | string
  ): Promise<WalletInfo> {
    try {
      // Connect with SMS via Magic
      const walletInfo = await this.wallet.connectWithSMS(phoneNumber, chainId);

      // Generate DID token for Supabase auth
      const didToken = await this.generateDIDToken();

      // Sign in to Supabase with Magic token
      const { data, error } = await this.supabase.auth.signInWithIdToken({
        provider: "magic_link",
        token: didToken,
        nonce: crypto.randomUUID(),
      });

      if (error) {
        console.error("Failed to sign in to Supabase:", error);
        throw error;
      }

      // Update user metadata with wallet info
      await this.updateUserWalletMetadata(walletInfo);

      return walletInfo;
    } catch (error) {
      console.error("Login with SMS failed:", error);
      throw error;
    }
  }

  /**
   * Check if user is logged in
   *
   * @returns True if logged in, false otherwise
   */
  async isLoggedIn(): Promise<boolean> {
    // Check both Magic and Supabase sessions
    const [magicLoggedIn, supabaseSession] = await Promise.all([
      this.wallet.isConnected(),
      this.supabase.auth.getSession(),
    ]);

    return magicLoggedIn && !!supabaseSession.data.session;
  }

  /**
   * Logout from both Magic and Supabase
   */
  async logout(): Promise<void> {
    try {
      // Disconnect Magic wallet
      await this.wallet.disconnect();

      // Sign out from Supabase
      await this.supabase.auth.signOut();
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  }

  /**
   * Get Magic DID token for Supabase authentication
   *
   * @returns DID token string
   */
  private async generateDIDToken(): Promise<string> {
    return this.wallet.generateDIDToken();
  }

  /**
   * Update user metadata in Supabase with wallet info
   *
   * @param walletInfo Wallet information
   */
  private async updateUserWalletMetadata(
    walletInfo: WalletInfo
  ): Promise<void> {
    try {
      const { data: user } = await this.supabase.auth.getUser();

      if (!user?.user) {
        console.error("No authenticated user found");
        return;
      }

      // Prepare wallet metadata
      const walletMetadata: Record<string, any> = {
        wallet_address: walletInfo.address,
        wallet_type: walletInfo.provider,
        chain_type: walletInfo.chainType,
        chain_id: walletInfo.chainId,
        last_connected: new Date().toISOString(),
      };

      // Add public key for Solana wallets
      if (walletInfo.chainType === ChainType.SOLANA && walletInfo.publicKey) {
        walletMetadata["public_key"] = walletInfo.publicKey;
      }

      // Update user metadata
      const { error } = await this.supabase.auth.updateUser({
        data: {
          ...user.user.user_metadata,
          wallets: {
            ...(user.user.user_metadata?.wallets || {}),
            [walletInfo.address]: walletMetadata,
          },
        },
      });

      if (error) {
        console.error("Failed to update user metadata:", error);
        throw error;
      }
    } catch (error) {
      console.error("Error updating user wallet metadata:", error);
      throw error;
    }
  }

  /**
   * Get wallet instance for direct wallet operations
   *
   * @returns ZyraWallet instance
   */
  getWallet(): ZyraWallet {
    return this.wallet;
  }

  /**
   * Get Supabase client for direct DB operations
   *
   * @returns SupabaseClient instance
   */
  getSupabase(): SupabaseClient {
    return this.supabase;
  }
}

/**
 * Create a Magic Link + Supabase auth instance
 *
 * @returns MagicLinkAuth instance
 */
export function createMagicAuth(): MagicLinkAuth {
  const { supabaseUrl, supabaseAnonKey, magicPublishableKey } = config;

  if (!supabaseUrl || !supabaseAnonKey || !magicPublishableKey) {
    throw new Error(
      "Missing environment variables. Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY"
    );
  }

  return new MagicLinkAuth({
    supabaseUrl,
    supabaseAnonKey,
    magicPublishableKey,
  });
}
