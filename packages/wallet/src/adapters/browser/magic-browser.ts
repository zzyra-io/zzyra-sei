/**
 * @zyra/wallet - Browser Magic Provider Implementation
 *
 * This file contains the browser-specific implementation of the Magic wallet provider.
 */

import { Magic, MagicUserMetadata } from "magic-sdk";
import { SDKBase, InstanceWithExtensions, MagicSDKExtensionsOption } from '@magic-sdk/provider';
import { SolanaExtension } from "@magic-ext/solana";
import { OAuthExtension } from "@magic-ext/oauth";
import { AuthExtension } from "@magic-ext/auth";
import {
  createWalletClient,
  custom,
  parseEther,
  formatEther,
  createPublicClient,
} from "viem";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

import { MagicWalletProvider } from "../../providers/magic-provider";
import {
  WalletInfo,
  WalletBalance,
  TransactionParams,
  TransactionResult,
  ChainType,
  WalletProvider,
  OAuthProvider,
  EVMChainConfig,
  SolanaChainConfig,
} from "../../core/types";
import { getChainById } from "../../core/chain-registry";

/**
 * Browser-specific implementation of Magic wallet provider
 */
export class BrowserMagicProvider extends MagicWalletProvider {
  /**
   * Magic SDK instance
   */
  private magic: InstanceWithExtensions<SDKBase, MagicSDKExtensionsOption<string>> | null = null;

  /**
   * EVM wallet client
   */
  private evmClient: any = null;

  /**
   * Solana connection
   */
  private solanaConnection: Connection | null = null;

  /**
   * Initialize the provider
   *
   * Note: For Magic, we don't fully initialize in this step because
   * we need chain-specific configuration. Actual initialization happens
   * during connect() or when switching chains.
   */
  async initialize(): Promise<void> {
    // No-op, as Magic initialization requires chain-specific config
  }

  /**
   * Initialize Magic SDK with chain-specific configuration
   *
   * @param chainType Chain type (EVM or Solana)
   * @param chainId Chain ID
   */
  private initializeMagic(chainType: ChainType, chainId: number | string) {
    const chain = this.getChainConfig(chainId);
    this.currentChain = chain;

    // Common configuration for Magic SDK
    // Domain allowlisting is handled on the Magic dashboard
    // The SDK will automatically respect the allowlist settings
    const magicOptions = {
      // No need to specify allowlisted domains here as they're configured in the Magic dashboard
    };

    if (chain.type === ChainType.EVM) {
      const evmChain = chain as EVMChainConfig;
      this.magic = new Magic(this.apiKey, {
        ...magicOptions,
        extensions: [new OAuthExtension(), new AuthExtension()],
        network: {
          rpcUrl: evmChain.rpcUrl,
          chainId: evmChain.chainId,
        },
      });
    } else if (chain.type === ChainType.SOLANA) {
      const solanaChain = chain as SolanaChainConfig;
      this.magic = new Magic(this.apiKey, {
        ...magicOptions,
        extensions: [
          new SolanaExtension({
            rpcUrl: solanaChain.rpcUrl,
          }),
          new OAuthExtension(),
          new AuthExtension(),
        ],
      });
      this.solanaConnection = new Connection(solanaChain.rpcUrl);
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
    const chain = this.getChainConfig(chainId);

    // Initialize Magic with the appropriate chain
    this.initializeMagic(chain.type, chain.id);

    if (!this.magic) {
      throw new Error("Magic SDK failed to initialize");
    }

    // Check if already logged in
    const isLoggedIn = await this.magic.user.isLoggedIn();

    if (!isLoggedIn) {
      // Login with email
      await this.magic.auth.loginWithMagicLink({ email });
    }

    // Get user info
    const magicUser = await this.magic.user.getMetadata();
    const userInfo = await this.getUserInfo(); // Keep this if it does more, otherwise magicUser has email etc.

    // Get wallet info based on chain type
    if (chain.type === ChainType.EVM) {
      // For EVM chains
      const provider = await this.magic.rpcProvider;
      this.evmClient = createWalletClient({
        transport: custom(provider),
      });

      const accounts = await this.evmClient.getAddresses();

      this.currentWallet = {
        address: accounts[0],
        provider: WalletProvider.MAGIC,
        chainType: ChainType.EVM,
        chainId: chain.id,
        userInfo: {
          email: userInfo?.email,
          name: userInfo?.name,
        },
      };
    } else if (chain.type === ChainType.SOLANA) {
      // For Solana
      const publicKey = await (this.magic.solana as SolanaExtension).getPublicKey();

      this.currentWallet = {
        address: publicKey.toString(),
        provider: WalletProvider.MAGIC,
        chainType: ChainType.SOLANA,
        chainId: chain.id,
        publicKey: publicKey.toString(),
        userInfo: {
          email: userInfo?.email,
          name: userInfo?.name,
        },
      };
    }

    return this.currentWallet!;
  }

  /**
   * Connect with OAuth provider
   *
   * @param provider OAuth provider (Google, Apple, etc.)
   * @param chainId Optional chain ID
   * @returns Wallet information
   */
  async connectWithOAuth(
    provider: OAuthProvider,
    chainId?: number | string
  ): Promise<WalletInfo> {
    const chain = this.getChainConfig(chainId);

    // Initialize Magic with the appropriate chain
    this.initializeMagic(chain.type, chain.id);

    if (!this.magic) {
      throw new Error("Magic SDK failed to initialize");
    }

    // Login with OAuth provider
    await (this.magic.oauth as OAuthExtension).loginWithRedirect({
      provider: provider as any, // Magic oauth types are string-based
      redirectURI: new URL("/callback", window.location.origin).href,
    });

    // The page will redirect, so this point shouldn't be reached during initial auth
    // For callback handling, we need to implement a separate method

    // In case we're already logged in (e.g. returning after redirect)
    const isLoggedIn = await this.magic.user.isLoggedIn();
    if (isLoggedIn) {
      // Get user info
      const magicUser = await this.magic.user.getMetadata();
    const userInfo = await this.getUserInfo(); // Keep this if it does more, otherwise magicUser has email etc.

      // Get wallet info based on chain type
      if (chain.type === ChainType.EVM) {
        const provider = await this.magic.rpcProvider;
        this.evmClient = createWalletClient({
          transport: custom(provider),
        });

        const accounts = await this.evmClient.getAddresses();

        this.currentWallet = {
          address: accounts[0],
          provider: WalletProvider.MAGIC,
          chainType: ChainType.EVM,
          chainId: chain.id,
          userInfo: {
            email: userInfo?.email,
            name: userInfo?.name,
            oauthProvider: provider,
            profileImage: userInfo?.profileImage,
          },
        };
      } else if (chain.type === ChainType.SOLANA) {
        const publicKey = await (this.magic.solana as SolanaExtension).getPublicKey();

        this.currentWallet = {
          address: publicKey.toString(),
          provider: WalletProvider.MAGIC,
          chainType: ChainType.SOLANA,
          chainId: chain.id,
          publicKey: publicKey.toString(),
          userInfo: {
            email: userInfo?.email,
            name: userInfo?.name,
            oauthProvider: provider,
            profileImage: userInfo?.profileImage,
          },
        };
      }

      return this.currentWallet!;
    }

    throw new Error("OAuth login failed or not completed");
  }

  /**
   * Handle OAuth callback
   * This should be called after redirecting back from OAuth provider
   *
   * @param chainId Optional chain ID
   * @returns Wallet information
   */
  async handleOAuthCallback(chainId?: number | string): Promise<WalletInfo> {
    const chain = this.getChainConfig(chainId);

    // Initialize Magic with the appropriate chain
    this.initializeMagic(chain.type, chain.id);

    if (!this.magic) {
      throw new Error("Magic SDK failed to initialize");
    }

    // Complete the OAuth login process
    const result = await (this.magic.oauth as OAuthExtension).getRedirectResult();

    // Get user info
    const magicUser = await this.magic.user.getMetadata();
    const userInfo = await this.getUserInfo(); // Keep this if it does more, otherwise magicUser has email etc.

    // Get wallet info based on chain type
    if (chain.type === ChainType.EVM) {
      const provider = await this.magic.rpcProvider;
      this.evmClient = createWalletClient({
        transport: custom(provider),
      });

      const accounts = await this.evmClient.getAddresses();

      this.currentWallet = {
        address: accounts[0],
        provider: WalletProvider.MAGIC,
        chainType: ChainType.EVM,
        chainId: chain.id,
        userInfo: {
          email: userInfo?.email,
          name: userInfo?.name,
          oauthProvider: result.oauth.provider as OAuthProvider,
          profileImage: userInfo?.profileImage,
        },
      };
    } else if (chain.type === ChainType.SOLANA) {
      const publicKey = await (this.magic.solana as SolanaExtension).getPublicKey();

      this.currentWallet = {
        address: publicKey.toString(),
        provider: WalletProvider.MAGIC,
        chainType: ChainType.SOLANA,
        chainId: chain.id,
        publicKey: publicKey.toString(),
        userInfo: {
          email: userInfo?.email,
          name: userInfo?.name,
          oauthProvider: result.oauth.provider as OAuthProvider,
          profileImage: userInfo?.profileImage,
        },
      };
    }

    return this.currentWallet!;
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
    const chain = this.getChainConfig(chainId);

    // Initialize Magic with the appropriate chain
    this.initializeMagic(chain.type, chain.id);

    if (!this.magic) {
      throw new Error("Magic SDK failed to initialize");
    }

    // Check if already logged in
    const isLoggedIn = await this.magic.user.isLoggedIn();

    if (!isLoggedIn) {
      // Login with SMS
      await this.magic.auth.loginWithSMS({ phoneNumber });
    }

    // Get wallet info based on chain type
    if (chain.type === ChainType.EVM) {
      // For EVM chains
      const provider = await this.magic.rpcProvider;
      this.evmClient = createWalletClient({
        transport: custom(provider),
      });

      const accounts = await this.evmClient.getAddresses();

      this.currentWallet = {
        address: accounts[0],
        provider: WalletProvider.MAGIC,
        chainType: ChainType.EVM,
        chainId: chain.id,
        userInfo: {
          phoneNumber,
        },
      };
    } else if (chain.type === ChainType.SOLANA) {
      // For Solana
      const publicKey = await (this.magic.solana as SolanaExtension).getPublicKey();

      this.currentWallet = {
        address: publicKey.toString(),
        provider: WalletProvider.MAGIC,
        chainType: ChainType.SOLANA,
        chainId: chain.id,
        publicKey: publicKey.toString(),
        userInfo: {
          phoneNumber,
        },
      };
    }

    return this.currentWallet!;
  }

  /**
   * Generate a Magic Link DID token for Supabase authentication
   *
   * @returns Promise resolving to DID token
   */
  async generateDIDToken(): Promise<string> {
    if (!this.magic) {
      throw new Error("Magic SDK not initialized");
    }

    const isLoggedIn = await this.magic.user.isLoggedIn();
    if (!isLoggedIn) {
      throw new Error("User not logged in with Magic");
    }

    // Generate a DID token with 7 day lifespan
    return this.magic.user.getIdToken({ lifespan: 60 * 60 * 24 * 7 });
  }

  /**
   * Get user info from Magic
   *
   * @returns Promise resolving to user metadata
   */
  async getUserInfo(): Promise<any> {
    if (!this.magic) {
      throw new Error("Magic SDK not initialized");
    }

    const isLoggedIn = await this.magic.user.isLoggedIn();
    if (!isLoggedIn) {
      return null;
    }

    return this.magic.user.getInfo();
  }

  /**
   * Disconnect from the current wallet
   */
  async disconnect(): Promise<void> {
    if (!this.magic) return;

    await this.magic.user.logout();
    this.currentWallet = null;
    this.evmClient = null;
    this.solanaConnection = null;
  }

  /**
   * Check if connected to a wallet
   *
   * @returns True if connected, false otherwise
   */
  async isConnected(): Promise<boolean> {
    if (!this.magic) return false;
    return this.magic.user.isLoggedIn();
  }

  /**
   * Get the current wallet address
   *
   * @returns Wallet address or null if not connected
   */
  async getAddress(): Promise<string | null> {
    if (this.currentWallet) return this.currentWallet.address;

    if (!this.magic) return null;

    const isLoggedIn = await this.magic.user.isLoggedIn();
    if (!isLoggedIn) return null;

    if (this.currentChain?.type === ChainType.EVM) {
      const provider = await this.magic.rpcProvider;
      this.evmClient = createWalletClient({
        transport: custom(provider),
      });

      const accounts = await this.evmClient.getAddresses();
      return accounts[0];
    } else if (this.currentChain?.type === ChainType.SOLANA) {
      const publicKey = await (this.magic.solana as SolanaExtension).getPublicKey();
      return publicKey.toString();
    }

    return null;
  }

  /**
   * Get balance for an address on the specified chain
   *
   * @param address Wallet address
   * @param chainId Optional chain ID
   * @returns Wallet balance
   */
  async getBalance(
    address: string,
    chainId?: number | string
  ): Promise<WalletBalance> {
    const chain = this.getChainConfig(chainId);

    if (chain.type === ChainType.EVM) {
      // For EVM chains
      const evmChain = chain as EVMChainConfig;

      // Initialize if not already
      if (!this.magic || !this.evmClient) {
        this.initializeMagic(ChainType.EVM, evmChain.id);
        const provider = await this.magic!.wallet.getProvider();
        this.evmClient = createWalletClient({
          transport: custom(provider),
        });
      }

      // Create public client for RPC calls
      const publicClient = createPublicClient({
        transport: custom(await this.magic!.wallet.getProvider()),
      });

      // Get balance as bigint
      const balance = await publicClient.getBalance({
        address: address as `0x${string}`,
      });

      return {
        formatted: formatEther(balance),
        raw: balance.toString(),
        symbol: evmChain.symbol,
        decimals: evmChain.decimals,
      };
    } else if (chain.type === ChainType.SOLANA) {
      // For Solana
      const solanaChain = chain as SolanaChainConfig;

      // Initialize if not already
      if (!this.solanaConnection) {
        this.initializeMagic(ChainType.SOLANA, solanaChain.id);
      }

      // Get balance in lamports
      const balance = await this.solanaConnection!.getBalance(
        new PublicKey(address)
      );

      return {
        formatted: (balance / LAMPORTS_PER_SOL).toString(),
        raw: balance.toString(),
        symbol: solanaChain.symbol,
        decimals: solanaChain.decimals,
      };
    }

    throw new Error(`Unsupported chain type: ${chain.type}`);
  }

  /**
   * Send a transaction
   *
   * @param params Transaction parameters
   * @returns Transaction result
   */
  async sendTransaction(params: TransactionParams): Promise<TransactionResult> {
    if (!this.magic) {
      throw new Error("Magic SDK not initialized");
    }

    if (params.chainType === ChainType.EVM) {
      // EVM transaction
      const evmParams = params as TransactionParams & {
        chainType: ChainType.EVM;
      };

      // Initialize if needed
      if (!this.evmClient) {
        this.initializeMagic(ChainType.EVM, evmParams.chainId);
        const provider = await this.magic!.wallet.getProvider();
        this.evmClient = createWalletClient({
          transport: custom(provider),
        });
      }

      // Get sender address
      const accounts = await this.evmClient.getAddresses();
      const from = accounts[0];

      // Submit transaction
      const hash = await this.evmClient.sendTransaction({
        account: from,
        to: evmParams.to as `0x${string}`,
        value: evmParams.value ? BigInt(evmParams.value.toString()) : undefined,
        data: evmParams.data as `0x${string}` | undefined,
      });

      return {
        hash,
        chainType: ChainType.EVM,
        chainId: evmParams.chainId,
        from,
        to: evmParams.to,
        value: evmParams.value?.toString(),
        timestamp: Date.now(),
      };
    } else if (params.chainType === ChainType.SOLANA) {
      // Solana transaction
      const solanaParams = params as TransactionParams & {
        chainType: ChainType.SOLANA;
      };

      // Initialize if needed
      if (!this.magic) {
        this.initializeMagic(ChainType.SOLANA, solanaParams.chainId);
      }

      // Get sender public key
      const publicKey = await (this.magic.solana as SolanaExtension).getPublicKey();

      // Create and send the transaction
      const tx = await (this.magic.solana as SolanaExtension).transferSOL({
        amount: Number(solanaParams.amount),
        recipient: solanaParams.to,
      });

      return {
        hash: tx,
        chainType: ChainType.SOLANA,
        chainId: solanaParams.chainId,
        from: publicKey.toString(),
        to: solanaParams.to,
        value: solanaParams.amount.toString(),
        timestamp: Date.now(),
      };
    }

    throw new Error(`Unsupported chain type: ${params.chainType}`);
  }

  /**
   * Sign a message
   *
   * @param message Message to sign
   * @returns Signature
   */
  async signMessage(message: string): Promise<string> {
    if (!this.magic) {
      throw new Error("Magic SDK not initialized");
    }

    if (!this.currentChain) {
      throw new Error("No active chain");
    }

    if (this.currentChain.type === ChainType.EVM) {
      // For EVM chains
      const provider = await this.magic.rpcProvider;
      this.evmClient = createWalletClient({
        transport: custom(provider),
      });

      const accounts = await this.evmClient.getAddresses();
      const from = accounts[0];

      // Sign the message
      return this.evmClient.signMessage({
        account: from,
        message,
      });
    } else if (this.currentChain.type === ChainType.SOLANA) {
      // For Solana
      const signedMessage = await (this.magic.solana as SolanaExtension).signMessage(
        Buffer.from(message)
      );

      return Buffer.from(signedMessage.signature).toString("hex");
    }

    throw new Error(`Unsupported chain type: ${this.currentChain.type}`);
  }

  /**
   * Switch to a different chain
   *
   * @param chainId Chain ID to switch to
   */
  async switchChain(chainId: number | string): Promise<void> {
    // Get chain configuration
    const chain = getChainById(chainId);
    if (!chain) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }

    // Need to disconnect and reconnect with the new chain
    const isConnected = await this.isConnected();

    if (isConnected) {
      // Get user information before disconnecting
      const userInfo = this.currentWallet?.userInfo;

      // Disconnect
      await this.disconnect();

      // Reconnect with the new chain
      if (userInfo?.email) {
        await this.connect(userInfo.email, chainId);
      } else if (userInfo?.phoneNumber) {
        await this.connectWithSMS(userInfo.phoneNumber, chainId);
      } else if (userInfo?.oauthProvider) {
        await this.connectWithOAuth(userInfo.oauthProvider, chainId);
      } else {
        throw new Error("No login information available for reconnection");
      }
    } else {
      // Just update the chain configuration without logging in
      this.initializeMagic(chain.type, chainId);
    }
  }
}

/**
 * Create a new browser Magic provider
 *
 * @param apiKey Magic API key
 * @returns Browser Magic provider instance
 */
export function createBrowserMagicProvider(
  apiKey: string
): BrowserMagicProvider {
  return new BrowserMagicProvider(apiKey);
}
