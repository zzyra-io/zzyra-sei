/**
 * Magic Link + Supabase authentication integration
 *
 * This file provides integration between Magic Link wallet/auth and Supabase auth.
 * It allows users to authenticate with Magic Link and have their session seamlessly linked to Supabase.
 */

import { SupabaseClient, createClient } from "@supabase/supabase-js";
import { WalletInfo, ChainType, OAuthProvider } from "@zyra/wallet";
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
      console.log('Starting Magic Link authentication for:', email);
      
      // Step 1: Authenticate with Magic first
      // This will show the Magic UI for email verification
      console.log('Connecting to Magic wallet...');
      const magicResult = await this.wallet.connect(email, chainId);
      console.log('Successfully connected to Magic wallet');
      
      // Step 2: Get DID token from Magic for Supabase auth
      console.log('Generating DID token...');
      const didToken = await this.generateDIDToken();
      console.log('DID token generated successfully');
      
      // Step 3: Use our server-side API to handle the authentication with Supabase
      // This improves security by keeping the token exchange away from the client
      console.log('Calling server-side authentication API...');
      const response = await fetch('/api/auth/magic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ didToken }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server authentication error:', errorData);
        throw new Error(errorData.error || 'Authentication failed');
      }
      
      // Get the session data from the response
      const { session } = await response.json();
      console.log('Successfully authenticated with Supabase via server');
      
      // Set the session in the client
      await this.supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      
      // Step 4: Update user metadata with wallet info
      console.log('Updating user metadata...');
      await this.updateUserWalletMetadata(magicResult);
      console.log('User metadata updated successfully');
      
      return magicResult;
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
    provider: OAuthProvider | string,
    chainId?: number | string
  ): Promise<void> {
    // Magic will handle the redirect flow automatically
    await this.wallet.connectWithOAuth(provider, chainId);

    // Note: The actual auth completion happens in handleOAuthCallback
  }

  /**
   * Handle OAuth callback after redirect
   *
   * @param provider OAuth provider name
   * @returns Wallet info
   */
  async handleOAuthCallback(provider: OAuthProvider): Promise<WalletInfo> {
    try {
      console.log(`Processing OAuth callback for provider: ${provider}`);
      
      // Get the result from the OAuth login that Magic received
      console.log('Getting OAuth redirect result from Magic...');
      const result = await this.wallet.handleOAuthCallback();
      console.log('Successfully received OAuth result from Magic');
      
      // Extract email from the walletInfo if available
      const userEmail = result.userInfo?.email;
      if (!userEmail) {
        console.warn('No email found in OAuth result');
      } else {
        console.log(`OAuth user email: ${userEmail}`);
      }
      
      // Generate DID token for Supabase auth
      console.log('Generating DID token...');
      const didToken = await this.generateDIDToken();
      console.log('DID token generated successfully');
      
      // Use our server-side API to handle the authentication with Supabase
      // This improves security by keeping the token exchange away from the client
      console.log('Calling server-side authentication API...');
      const supabaseProvider = this.mapOAuthProviderToSupabaseProvider(provider);
      
      const response = await fetch('/api/auth/magic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          didToken,
          provider: supabaseProvider // Pass the provider information
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server authentication error:', errorData);
        throw new Error(errorData.error || 'Authentication failed');
      }
      
      // Get the session data from the response
      const { session } = await response.json();
      console.log('Successfully authenticated with Supabase via server');
      
      // Set the session in the client
      await this.supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      
      // Update user metadata with wallet info
      console.log('Updating user metadata with wallet info...');
      await this.updateUserWalletMetadata(result);
      console.log('User metadata updated successfully');
      
      return result;
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
      console.log('Starting SMS authentication for:', phoneNumber);
      
      // Connect with SMS via Magic
      console.log('Connecting to Magic wallet via SMS...');
      const walletInfo = await this.wallet.connectWithSMS(phoneNumber, chainId);
      console.log('Successfully connected to Magic wallet via SMS');

      // Generate DID token for Supabase auth
      console.log('Generating DID token...');
      const didToken = await this.generateDIDToken();
      console.log('DID token generated successfully');

      // Use our server-side API to handle the authentication with Supabase
      console.log('Calling server-side authentication API...');
      const response = await fetch('/api/auth/magic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          didToken,
          provider: 'magic', // Always use 'magic' for SMS auth
          phoneNumber // Include the phone number for traceability
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server authentication error:', errorData);
        throw new Error(errorData.error || 'Authentication failed');
      }
      
      // Get the session data from the response
      const { session } = await response.json();
      console.log('Successfully authenticated with Supabase via server');
      
      // Set the session in the client
      await this.supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      // Update user metadata with wallet info
      console.log('Updating user metadata...');
      await this.updateUserWalletMetadata(walletInfo);
      console.log('User metadata updated successfully');

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
   * Maps OAuth provider names to the exact string Supabase expects
   * 
   * @param provider The OAuth provider from OAuthProvider enum
   * @returns The provider string Supabase expects
   */
  private mapOAuthProviderToSupabaseProvider(provider: OAuthProvider | string): string {
    // Map the OAuthProvider enum values to the exact strings Supabase expects
    const providerMap: Record<string, string> = {
      'google': 'google',
      'facebook': 'facebook',
      'twitter': 'twitter',
      'github': 'github',
      'apple': 'apple',
      'linkedin': 'linkedin',
      'discord': 'discord'
    };
    
    // Convert provider to string safely
    const providerString = String(provider).toLowerCase();
    return providerMap[providerString] || providerString;
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
      const walletMetadata: Record<string, string> = {
        wallet_address: walletInfo.address,
        wallet_provider: walletInfo.provider,
        wallet_chain_type: walletInfo.chainType,
        wallet_chain_id: typeof walletInfo.chainId === 'number' ? walletInfo.chainId.toString() : (walletInfo.chainId || ""),
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
