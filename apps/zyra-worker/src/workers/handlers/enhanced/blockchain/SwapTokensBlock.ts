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
 * Enhanced block for swapping tokens on decentralized exchanges
 * Supports multiple chains with SEI testnet focus
 */
@Injectable()
export class SwapTokensBlock implements EnhancedBlockHandler {
  private readonly logger = new Logger(SwapTokensBlock.name);

  definition: EnhancedBlockDefinition = {
    displayName: 'Swap Tokens',
    name: 'SWAP_TOKENS',
    version: 1,
    description:
      'Swap tokens on decentralized exchanges with slippage protection',
    icon: 'refresh',
    color: '#8B5CF6',
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
        description: 'Blockchain network to perform swap on',
      },
      {
        displayName: 'From Token',
        name: 'fromToken',
        type: PropertyType.STRING,
        required: true,
        description:
          'Token address to swap from (use "native" for chain native token)',
      },
      {
        displayName: 'To Token',
        name: 'toToken',
        type: PropertyType.STRING,
        required: true,
        description:
          'Token address to swap to (use "native" for chain native token)',
      },
      {
        displayName: 'Amount In',
        name: 'amountIn',
        type: PropertyType.STRING,
        required: true,
        description: 'Amount of input token to swap',
      },
      {
        displayName: 'Min Amount Out',
        name: 'minAmountOut',
        type: PropertyType.STRING,
        required: false,
        description:
          'Minimum amount of output token to receive (slippage protection)',
      },
      {
        displayName: 'Slippage Tolerance (%)',
        name: 'slippageTolerance',
        type: PropertyType.NUMBER,
        required: false,
        default: 1.0,
        description: 'Maximum acceptable slippage percentage (0.1-10%)',
      },
      {
        displayName: 'DEX Platform',
        name: 'dexPlatform',
        type: PropertyType.OPTIONS,
        required: false,
        default: 'auto',
        options: [
          { name: 'Auto (Best Price)', value: 'auto' },
          { name: 'Uniswap V3', value: 'uniswap-v3' },
          { name: 'SushiSwap', value: 'sushiswap' },
          { name: 'SEI DEX', value: 'sei-dex' },
        ],
        description: 'Decentralized exchange platform to use',
      },
      {
        displayName: 'Deadline (Minutes)',
        name: 'deadline',
        type: PropertyType.NUMBER,
        required: false,
        default: 20,
        description: 'Transaction deadline in minutes from now',
      },
    ],

    inputs: [ConnectionType.MAIN],
    outputs: [ConnectionType.MAIN],

    subtitle: '={{$parameter["fromToken"]}} → {{$parameter["toToken"]}}',
  };

  async execute(
    context: EnhancedBlockExecutionContext,
  ): Promise<ZyraNodeData[]> {
    try {
      const startTime = Date.now();

      context.logger.info('Starting token swap execution');

      // Validate blockchain authorization
      this.validateBlockchainAuthorization(context);

      // Get swap parameters
      const chainId = context.getNodeParameter('chainId') as string;
      const fromToken = context.getNodeParameter('fromToken') as string;
      const toToken = context.getNodeParameter('toToken') as string;
      const amountIn = context.getNodeParameter('amountIn') as string;
      const minAmountOut = context.getNodeParameter('minAmountOut') as string;
      const slippageTolerance =
        (context.getNodeParameter('slippageTolerance') as number) || 1.0;
      const dexPlatform =
        (context.getNodeParameter('dexPlatform') as string) || 'auto';
      const deadline = (context.getNodeParameter('deadline') as number) || 20;

      // Validate parameters
      this.validateSwapParameters({
        chainId,
        fromToken,
        toToken,
        amountIn,
        minAmountOut,
        slippageTolerance,
        deadline,
      });

      // Check spending limits against authorization
      this.checkSpendingLimits(context, chainId, amountIn, fromToken);

      // Get swap quote first
      const swapQuote = await this.getSwapQuote({
        chainId,
        fromToken,
        toToken,
        amountIn,
        slippageTolerance,
        dexPlatform,
        context,
      });

      // Validate minimum amount out
      if (
        minAmountOut &&
        parseFloat(swapQuote.amountOut) < parseFloat(minAmountOut)
      ) {
        throw new Error(
          `Expected output ${swapQuote.amountOut} is below minimum ${minAmountOut}`,
        );
      }

      // Execute swap
      const swapResult = await this.executeSwap({
        chainId,
        fromToken,
        toToken,
        amountIn,
        quote: swapQuote,
        deadline,
        context,
      });

      const executionTime = Date.now() - startTime;

      context.logger.info(
        `Token swap completed successfully in ${executionTime}ms`,
        {
          chainId,
          fromToken,
          toToken,
          amountIn,
          amountOut: swapResult.amountOut,
          txHash: swapResult.transactionHash,
        },
      );

      return [
        {
          json: {
            success: true,
            transactionHash: swapResult.transactionHash,
            chainId,
            fromToken,
            toToken,
            amountIn,
            amountOut: swapResult.amountOut,
            effectiveSlippage: swapResult.effectiveSlippage,
            gasUsed: swapResult.gasUsed,
            dexPlatform: swapResult.dexUsed,
            executionTime,
            timestamp: new Date().toISOString(),
          },
        },
      ];
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      context.logger.error(`Token swap failed: ${errorMessage}`, {
        stack: error instanceof Error ? error.stack : undefined,
      });

      return [
        {
          json: {
            success: false,
            error: errorMessage,
            chainId: context.getNodeParameter('chainId'),
            fromToken: context.getNodeParameter('fromToken'),
            toToken: context.getNodeParameter('toToken'),
            timestamp: new Date().toISOString(),
          },
        },
      ];
    }
  }

  /**
   * Validate blockchain authorization for swap operations
   */
  private validateBlockchainAuthorization(
    context: EnhancedBlockExecutionContext,
  ): void {
    const auth = context.blockchainAuthorization;

    if (!auth) {
      throw new Error('Blockchain authorization required for token swaps');
    }

    const chainId = context.getNodeParameter('chainId') as string;
    const chainAuth = auth.selectedChains?.find(
      (chain: any) => chain.chainId === chainId,
    );

    if (!chainAuth) {
      throw new Error(`No authorization found for chain: ${chainId}`);
    }

    if (chainAuth.enabled === false) {
      throw new Error(`Chain ${chainId} is not authorized for transactions`);
    }

    if (!chainAuth.allowedOperations?.includes('swap')) {
      throw new Error(`Swap operations not authorized for chain: ${chainId}`);
    }

    // Check authorization expiry
    const authAge = Date.now() - auth.timestamp;
    const maxAge = auth.duration * 60 * 60 * 1000;

    if (authAge > maxAge) {
      throw new Error('Blockchain authorization has expired');
    }
  }

  /**
   * Validate swap parameters
   */
  private validateSwapParameters(params: {
    chainId: string;
    fromToken: string;
    toToken: string;
    amountIn: string;
    minAmountOut?: string;
    slippageTolerance: number;
    deadline: number;
  }): void {
    const {
      chainId,
      fromToken,
      toToken,
      amountIn,
      minAmountOut,
      slippageTolerance,
      deadline,
    } = params;

    if (!chainId) {
      throw new Error('Chain ID is required');
    }

    if (!fromToken) {
      throw new Error('From token is required');
    }

    if (!toToken) {
      throw new Error('To token is required');
    }

    if (fromToken === toToken) {
      throw new Error('From token and to token cannot be the same');
    }

    if (!amountIn || isNaN(parseFloat(amountIn)) || parseFloat(amountIn) <= 0) {
      throw new Error('Valid positive amount is required');
    }

    if (
      minAmountOut &&
      (isNaN(parseFloat(minAmountOut)) || parseFloat(minAmountOut) < 0)
    ) {
      throw new Error('Minimum amount out must be a non-negative number');
    }

    if (slippageTolerance < 0.1 || slippageTolerance > 10) {
      throw new Error('Slippage tolerance must be between 0.1% and 10%');
    }

    if (deadline < 1 || deadline > 1440) {
      // 1 minute to 24 hours
      throw new Error('Deadline must be between 1 and 1440 minutes');
    }

    // Validate token addresses if not native
    if (fromToken !== 'native' && !this.isValidAddress(fromToken)) {
      throw new Error('Invalid from token address');
    }

    if (toToken !== 'native' && !this.isValidAddress(toToken)) {
      throw new Error('Invalid to token address');
    }
  }

  /**
   * Check spending limits for swap operations
   */
  private checkSpendingLimits(
    context: EnhancedBlockExecutionContext,
    chainId: string,
    amountIn: string,
    fromToken: string,
  ): void {
    const auth = context.blockchainAuthorization;
    const chainAuth = auth?.selectedChains?.find(
      (chain: any) => chain.chainId === chainId,
    );

    if (!chainAuth?.maxDailySpending) {
      context.logger.warn('No spending limit configured for swaps');
      return;
    }

    // For simplicity, treat all swaps as equivalent to native token value
    // In production, this would convert token amounts to USD/native equivalent
    const requestedAmount = parseFloat(amountIn);
    const maxSpending = parseFloat(chainAuth.maxDailySpending);

    if (requestedAmount > maxSpending) {
      throw new Error(
        `Swap amount (${amountIn}) exceeds daily limit (${chainAuth.maxDailySpending} ${chainAuth.tokenSymbol})`,
      );
    }
  }

  /**
   * Get swap quote from DEX
   */
  private async getSwapQuote(params: {
    chainId: string;
    fromToken: string;
    toToken: string;
    amountIn: string;
    slippageTolerance: number;
    dexPlatform: string;
    context: EnhancedBlockExecutionContext;
  }): Promise<{
    amountOut: string;
    priceImpact: number;
    route: string[];
    dex: string;
  }> {
    const { chainId, fromToken, toToken, amountIn, dexPlatform, context } =
      params;

    context.logger.info('Getting swap quote (MOCK)', {
      chainId,
      fromToken,
      toToken,
      amountIn,
      dexPlatform,
    });

    // Mock quote fetching delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock swap quote
    const exchangeRate = 0.95 + Math.random() * 0.1; // Random rate between 0.95-1.05
    const amountOut = (parseFloat(amountIn) * exchangeRate).toFixed(6);

    return {
      amountOut,
      priceImpact: Math.random() * 2, // 0-2% price impact
      route: [fromToken, toToken],
      dex: dexPlatform === 'auto' ? 'sei-dex' : dexPlatform,
    };
  }

  /**
   * Execute the token swap
   */
  private async executeSwap(params: {
    chainId: string;
    fromToken: string;
    toToken: string;
    amountIn: string;
    quote: any;
    deadline: number;
    context: EnhancedBlockExecutionContext;
  }): Promise<{
    transactionHash: string;
    amountOut: string;
    effectiveSlippage: number;
    gasUsed: number;
    dexUsed: string;
  }> {
    const { chainId, fromToken, toToken, amountIn, quote, context } = params;

    context.logger.info('Executing token swap (MOCK)', {
      chainId,
      fromToken,
      toToken,
      amountIn,
      expectedAmountOut: quote.amountOut,
    });

    // Mock swap execution delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Simulate actual slippage vs expected
    const slippageVariance = (Math.random() - 0.5) * 0.02; // ±1% variance
    const actualAmountOut = (
      parseFloat(quote.amountOut) *
      (1 + slippageVariance)
    ).toFixed(6);
    const effectiveSlippage = Math.abs(slippageVariance) * 100;

    return {
      transactionHash: `0x${Math.random().toString(16).substring(2, 66)}`,
      amountOut: actualAmountOut,
      effectiveSlippage,
      gasUsed: Math.floor(Math.random() * 100000) + 150000,
      dexUsed: quote.dex,
    };
  }

  /**
   * Validate if address format is correct
   */
  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Validate block configuration
   */
  async validate(config: Record<string, any>): Promise<ValidationResult> {
    const errors: string[] = [];

    if (!config.fromToken) {
      errors.push('From token is required');
    } else if (
      config.fromToken !== 'native' &&
      !this.isValidAddress(config.fromToken)
    ) {
      errors.push('Invalid from token address');
    }

    if (!config.toToken) {
      errors.push('To token is required');
    } else if (
      config.toToken !== 'native' &&
      !this.isValidAddress(config.toToken)
    ) {
      errors.push('Invalid to token address');
    }

    if (config.fromToken === config.toToken) {
      errors.push('From token and to token cannot be the same');
    }

    if (!config.amountIn) {
      errors.push('Amount is required');
    } else if (
      isNaN(parseFloat(config.amountIn)) ||
      parseFloat(config.amountIn) <= 0
    ) {
      errors.push('Amount must be a positive number');
    }

    if (
      config.slippageTolerance &&
      (config.slippageTolerance < 0.1 || config.slippageTolerance > 10)
    ) {
      errors.push('Slippage tolerance must be between 0.1% and 10%');
    }

    return {
      valid: errors.length === 0,
      isValid: errors.length === 0,
      errors,
    };
  }
}
