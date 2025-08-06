import { Injectable, Logger } from '@nestjs/common';
import {
  EnhancedBlockHandler,
  EnhancedBlockExecutionContext,
  ZyraNodeData,
  EnhancedBlockDefinition,
  BlockGroup,
  PropertyType,
  ConnectionType,
  ValidationResult,
} from '@zyra/types';

/**
 * Enhanced block for checking blockchain wallet balances
 * Supports multiple chains with SEI testnet focus
 */
@Injectable()
export class CheckBalanceBlock implements EnhancedBlockHandler {
  private readonly logger = new Logger(CheckBalanceBlock.name);

  definition: EnhancedBlockDefinition = {
    displayName: 'Check Balance',
    name: 'CHECK_BALANCE',
    version: 1,
    description: 'Check wallet balance for native currency or specific tokens',
    icon: 'wallet',
    color: '#3B82F6',
    group: [BlockGroup.BLOCKCHAIN, BlockGroup.ACTION],

    properties: [
      {
        displayName: 'Chain',
        name: 'chainId',
        type: PropertyType.OPTIONS,
        required: true,
        default: 'sei-testnet',
        options: [
          { name: 'SEI Testnet', value: 'sei-testnet' },
          { name: 'Ethereum Sepolia', value: 'ethereum-sepolia' },
          { name: 'Base Sepolia', value: 'base-sepolia' },
        ],
        description: 'Blockchain network to check balance on',
      },
      {
        displayName: 'Wallet Address',
        name: 'walletAddress',
        type: PropertyType.STRING,
        required: true,
        description: 'Wallet address to check balance for',
      },
      {
        displayName: 'Token Addresses (Optional)',
        name: 'tokenAddresses',
        type: PropertyType.STRING,
        required: false,
        description:
          'Comma-separated token contract addresses (leave empty for native balance only)',
      },
      {
        displayName: 'Include USD Value',
        name: 'includeUsdValue',
        type: PropertyType.BOOLEAN,
        required: false,
        default: false,
        description: 'Fetch USD value for balances using price data',
      },
    ],

    inputs: [ConnectionType.MAIN],
    outputs: [ConnectionType.MAIN],

    subtitle: '={{$parameter["chainId"]}} balance',
  };

  async execute(
    context: EnhancedBlockExecutionContext,
  ): Promise<ZyraNodeData[]> {
    try {
      const startTime = Date.now();

      context.logger.info('Starting balance check execution');

      // Get parameters
      const chainId = context.getNodeParameter('chainId') as string;
      const walletAddress = context.getNodeParameter('walletAddress') as string;
      const tokenAddressesParam =
        (context.getNodeParameter('tokenAddresses') as string) || '';
      const includeUsdValue =
        (context.getNodeParameter('includeUsdValue') as boolean) || false;

      // Parse token addresses
      const tokenAddresses = tokenAddressesParam
        .split(',')
        .map((addr) => addr.trim())
        .filter((addr) => addr.length > 0);

      // Validate parameters
      this.validateBalanceParameters({
        chainId,
        walletAddress,
        tokenAddresses,
      });

      // Check blockchain authorization (read-only operations may have lighter requirements)
      this.validateBlockchainAuthorization(context, chainId);

      // Get balances
      const balanceResult = await this.getBalances({
        chainId,
        walletAddress,
        tokenAddresses,
        includeUsdValue,
        context,
      });

      const executionTime = Date.now() - startTime;

      context.logger.info(
        `Balance check completed successfully in ${executionTime}ms`,
        {
          chainId,
          walletAddress,
          tokenCount: tokenAddresses.length,
        },
      );

      return [
        {
          json: {
            success: true,
            chainId,
            walletAddress,
            nativeBalance: balanceResult.nativeBalance,
            tokenBalances: balanceResult.tokenBalances,
            totalUsdValue: balanceResult.totalUsdValue,
            executionTime,
            timestamp: new Date().toISOString(),
          },
        },
      ];
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      context.logger.error(`Balance check failed: ${errorMessage}`, {
        stack: error instanceof Error ? error.stack : undefined,
      });

      return [
        {
          json: {
            success: false,
            error: errorMessage,
            chainId: context.getNodeParameter('chainId'),
            walletAddress: context.getNodeParameter('walletAddress'),
            timestamp: new Date().toISOString(),
          },
        },
      ];
    }
  }

  /**
   * Validate blockchain authorization for balance checking
   * Read operations typically have lighter authorization requirements
   */
  private validateBlockchainAuthorization(
    context: EnhancedBlockExecutionContext,
    chainId: string,
  ): void {
    const auth = context.blockchainAuthorization;

    // Balance checking might be allowed without full authorization
    // but we still want to check if authorization exists for the chain
    if (auth && auth.selectedChains) {
      const chainAuth = auth.selectedChains.find(
        (chain: any) => chain.chainId === chainId,
      );

      if (chainAuth) {
        context.logger.warn(
          `Chain ${chainId} authorization status checked for read-only operation`,
        );
      }

      // Check authorization expiry (less strict for read operations)
      const authAge = Date.now() - auth.timestamp;
      const maxAge = auth.duration * 60 * 60 * 1000; // Convert hours to milliseconds

      if (authAge > maxAge) {
        context.logger.warn(
          'Blockchain authorization expired, but allowing read-only operation',
        );
      }
    }
  }

  /**
   * Validate balance check parameters
   */
  private validateBalanceParameters(params: {
    chainId: string;
    walletAddress: string;
    tokenAddresses: string[];
  }): void {
    const { chainId, walletAddress, tokenAddresses } = params;

    if (!chainId) {
      throw new Error('Chain ID is required');
    }

    if (!walletAddress || !this.isValidAddress(walletAddress)) {
      throw new Error('Valid wallet address is required');
    }

    // Validate token addresses if provided
    for (const tokenAddress of tokenAddresses) {
      if (!this.isValidAddress(tokenAddress)) {
        throw new Error(`Invalid token address: ${tokenAddress}`);
      }
    }
  }

  /**
   * Get balances for native currency and tokens
   */
  private async getBalances(params: {
    chainId: string;
    walletAddress: string;
    tokenAddresses: string[];
    includeUsdValue: boolean;
    context: EnhancedBlockExecutionContext;
  }): Promise<{
    nativeBalance: {
      balance: string;
      symbol: string;
      decimals: number;
      usdValue?: number;
    };
    tokenBalances: Array<{
      address: string;
      balance: string;
      symbol: string;
      decimals: number;
      usdValue?: number;
    }>;
    totalUsdValue?: number;
  }> {
    const { chainId, walletAddress, tokenAddresses, includeUsdValue, context } =
      params;

    context.logger.info('Fetching balances (MOCK)', {
      chainId,
      walletAddress,
      tokenCount: tokenAddresses.length,
      includeUsdValue,
    });

    // Mock balance fetching delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Get chain info
    const chainInfo = this.getChainInfo(chainId);

    // Mock native balance
    const nativeBalance = {
      balance: (Math.random() * 10).toFixed(6),
      symbol: chainInfo.symbol,
      decimals: chainInfo.decimals,
      usdValue: includeUsdValue ? Math.random() * 1000 : undefined,
    };

    // Mock token balances
    const tokenBalances = tokenAddresses.map((address, index) => ({
      address,
      balance: (Math.random() * 1000).toFixed(6),
      symbol: `TOKEN${index + 1}`,
      decimals: 18,
      usdValue: includeUsdValue ? Math.random() * 100 : undefined,
    }));

    // Calculate total USD value if requested
    let totalUsdValue: number | undefined;
    if (includeUsdValue) {
      totalUsdValue =
        (nativeBalance.usdValue || 0) +
        tokenBalances.reduce((sum, token) => sum + (token.usdValue || 0), 0);
    }

    return {
      nativeBalance,
      tokenBalances,
      totalUsdValue,
    };
  }

  /**
   * Get chain information
   */
  private getChainInfo(chainId: string): { symbol: string; decimals: number } {
    const chainMap = {
      'sei-testnet': { symbol: 'SEI', decimals: 18 },
      'ethereum-sepolia': { symbol: 'ETH', decimals: 18 },
      'base-sepolia': { symbol: 'ETH', decimals: 18 },
    };

    return (
      chainMap[chainId as keyof typeof chainMap] || {
        symbol: 'UNKNOWN',
        decimals: 18,
      }
    );
  }

  /**
   * Validate if address format is correct
   */
  private isValidAddress(address: string): boolean {
    // Basic validation for EVM addresses
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Validate block configuration
   */
  async validate(config: Record<string, any>): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!config.walletAddress) {
      errors.push('Wallet address is required');
    } else if (!this.isValidAddress(config.walletAddress)) {
      errors.push('Invalid wallet address format');
    }

    if (config.tokenAddresses) {
      const tokenAddresses = config.tokenAddresses
        .split(',')
        .map((addr: string) => addr.trim())
        .filter((addr: string) => addr.length > 0);

      for (const tokenAddress of tokenAddresses) {
        if (!this.isValidAddress(tokenAddress)) {
          errors.push(`Invalid token address format: ${tokenAddress}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      isValid: errors.length === 0,
      errors,
    };
  }
}
