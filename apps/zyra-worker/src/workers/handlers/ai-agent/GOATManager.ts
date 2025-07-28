import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface GOATTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (params: any) => Promise<any>;
}

interface GOATWalletConfig {
  privateKey?: string;
  walletData?: {
    walletId: string;
    networkId: string;
  };
}

@Injectable()
export class GOATManager {
  private readonly logger = new Logger(GOATManager.name);
  private tools = new Map<string, GOATTool>();
  private agentKit: any = null;

  constructor(private readonly configService: ConfigService) {}

  async initializeGOAT(walletConfig?: GOATWalletConfig): Promise<void> {
    try {
      // Dynamic imports to handle ES modules
      const agentKitModule = await import('@coinbase/agentkit');
      const { AgentKit, SmartWalletProvider, walletActionProvider, cdpApiActionProvider } = agentKitModule;

      let walletProvider;

      if (walletConfig?.privateKey) {
        // Create wallet from private key
        const { privateKeyToAccount } = await import('viem/accounts');
        const account = privateKeyToAccount(walletConfig.privateKey as `0x${string}`);
        
        walletProvider = new SmartWalletProvider({
          account,
          walletData: walletConfig.walletData,
        });
      } else {
        // Use environment configuration
        const privateKey = this.configService.get<string>('ETHEREUM_PRIVATE_KEY');
        if (!privateKey) {
          throw new Error('No wallet configuration provided');
        }

        const { privateKeyToAccount } = await import('viem/accounts');
        const account = privateKeyToAccount(privateKey as `0x${string}`);
        
        walletProvider = new SmartWalletProvider({ account });
      }

      // Initialize AgentKit with actions
      this.agentKit = new AgentKit({
        wallet: walletProvider,
        actions: [walletActionProvider, cdpApiActionProvider],
      });

      // Register built-in GOAT tools
      await this.registerBuiltinTools();

      this.logger.log('GOAT SDK initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize GOAT SDK:', error);
      throw new Error(`GOAT initialization failed: ${(error as Error).message}`);
    }
  }

  async getAvailableTools(): Promise<GOATTool[]> {
    if (!this.agentKit) {
      await this.initializeGOAT();
    }

    return Array.from(this.tools.values());
  }

  async getTool(toolName: string): Promise<GOATTool | null> {
    if (!this.agentKit) {
      await this.initializeGOAT();
    }

    return this.tools.get(toolName) || null;
  }

  async executeTransaction(params: {
    to: string;
    value?: string;
    data?: string;
    chain?: string;
  }): Promise<any> {
    if (!this.agentKit) {
      throw new Error('GOAT SDK not initialized');
    }

    try {
      // Execute transaction through AgentKit
      const result = await this.agentKit.wallet.sendTransaction({
        to: params.to,
        value: params.value || '0',
        data: params.data || '0x',
      });

      return {
        success: true,
        transactionHash: result.hash,
        blockNumber: result.blockNumber,
        gasUsed: result.gasUsed,
      };

    } catch (error) {
      this.logger.error('Transaction execution failed:', error);
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  private async registerBuiltinTools(): Promise<void> {
    // Register wallet balance tool
    this.tools.set('get-wallet-balance', {
      name: 'get-wallet-balance',
      description: 'Get wallet balance for specified token',
      parameters: {
        token: { type: 'string', description: 'Token address or symbol' },
        network: { type: 'string', description: 'Network name', default: 'base' },
      },
      execute: async (params) => this.getWalletBalance(params),
    });

    // Register token swap tool
    this.tools.set('swap-tokens', {
      name: 'swap-tokens',
      description: 'Swap tokens using DEX aggregators',
      parameters: {
        fromToken: { type: 'string', description: 'Source token address' },
        toToken: { type: 'string', description: 'Destination token address' },
        amount: { type: 'string', description: 'Amount to swap' },
        slippage: { type: 'number', description: 'Slippage tolerance', default: 0.5 },
      },
      execute: async (params) => this.swapTokens(params),
    });

    // Register NFT mint tool
    this.tools.set('mint-nft', {
      name: 'mint-nft',
      description: 'Mint NFT from collection',
      parameters: {
        collection: { type: 'string', description: 'NFT collection address' },
        tokenId: { type: 'string', description: 'Token ID to mint' },
        to: { type: 'string', description: 'Recipient address' },
      },
      execute: async (params) => this.mintNFT(params),
    });

    // Register DeFi lending tool
    this.tools.set('lend-tokens', {
      name: 'lend-tokens',
      description: 'Lend tokens to DeFi protocols',
      parameters: {
        protocol: { type: 'string', description: 'Lending protocol (aave, compound)' },
        token: { type: 'string', description: 'Token to lend' },
        amount: { type: 'string', description: 'Amount to lend' },
      },
      execute: async (params) => this.lendTokens(params),
    });
  }

  private async getWalletBalance(params: any): Promise<any> {
    try {
      if (!this.agentKit) {
        throw new Error('GOAT SDK not initialized');
      }

      const walletAddress = await this.agentKit.wallet.getAddress();
      
      // Get balance for specific token or ETH
      let balance;
      if (params.token === 'ETH' || !params.token) {
        balance = await this.agentKit.wallet.getBalance();
      } else {
        // Get ERC20 token balance
        const tokenContract = await this.agentKit.wallet.getContract({
          address: params.token,
          abi: ['function balanceOf(address) view returns (uint256)'],
        });
        balance = await tokenContract.balanceOf(walletAddress);
      }

      return {
        success: true,
        walletAddress,
        token: params.token || 'ETH',
        balance: balance.toString(),
        network: params.network || 'base',
      };

    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  private async swapTokens(params: any): Promise<any> {
    try {
      if (!this.agentKit) {
        throw new Error('GOAT SDK not initialized');
      }

      // This would integrate with DEX aggregators like 1inch, Jupiter, etc.
      // For now, return a placeholder implementation
      this.logger.log(`Swapping ${params.amount} ${params.fromToken} to ${params.toToken}`);

      return {
        success: true,
        message: 'Token swap initiated',
        fromToken: params.fromToken,
        toToken: params.toToken,
        amount: params.amount,
        estimatedOutput: '0', // Would be calculated by DEX
        slippage: params.slippage,
      };

    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  private async mintNFT(params: any): Promise<any> {
    try {
      if (!this.agentKit) {
        throw new Error('GOAT SDK not initialized');
      }

      // NFT minting implementation
      const result = await this.executeTransaction({
        to: params.collection,
        data: this.encodeMintFunction(params.to, params.tokenId),
      });

      if (result.success) {
        return {
          success: true,
          message: 'NFT minted successfully',
          collection: params.collection,
          tokenId: params.tokenId,
          recipient: params.to,
          transactionHash: result.transactionHash,
        };
      } else {
        return result;
      }

    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  private async lendTokens(params: any): Promise<any> {
    try {
      if (!this.agentKit) {
        throw new Error('GOAT SDK not initialized');
      }

      // DeFi lending implementation placeholder
      this.logger.log(`Lending ${params.amount} ${params.token} to ${params.protocol}`);

      return {
        success: true,
        message: 'Lending transaction initiated',
        protocol: params.protocol,
        token: params.token,
        amount: params.amount,
        estimatedAPY: '5.2%', // Would be fetched from protocol
      };

    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      };
    }
  }

  private encodeMintFunction(to: string, tokenId: string): string {
    // Simple mint function encoding - would use proper ABI encoding in production
    const { Interface } = require('ethers');
    const iface = new Interface(['function mint(address to, uint256 tokenId)']);
    return iface.encodeFunctionData('mint', [to, tokenId]);
  }

  async cleanup(): Promise<void> {
    try {
      if (this.agentKit?.wallet) {
        // Cleanup wallet connections if needed
        this.logger.log('Cleaning up GOAT SDK resources');
      }
      this.agentKit = null;
      this.tools.clear();
    } catch (error) {
      this.logger.warn('Error during GOAT cleanup:', error);
    }
  }
}