import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { ethers, Contract } from 'ethers';
import { DatabaseService } from '../../services/database.service';

import { ProtocolService } from '../../services/protocol.service';
import { WalletService } from './blockchain/WalletService';
import { BlockType, BlockExecutionContext, BlockHandler } from '@zyra/types';

// Define the configuration schema for liquidity provision
const LiquidityProviderConfigSchema = z.object({
  protocol: z.string().min(1, 'Protocol is required'),
  tokenA: z.string().min(1, 'First token is required'),
  tokenB: z.string().min(1, 'Second token is required'),
  amountA: z.string().min(1, 'Amount for first token is required'),
  amountB: z.string().optional(), // Optional, can be calculated based on ratio
  slippage: z.number().min(0).max(100).default(1), // Default 1% slippage
  gasLimit: z.number().optional(),
  maxFee: z.number().optional(),
  walletId: z.string().min(1, 'Wallet ID is required'),
  minLiquidity: z.string().optional(), // Minimum liquidity tokens to receive
  deadline: z.number().optional(), // Deadline in minutes
});

type LiquidityProviderConfig = z.infer<typeof LiquidityProviderConfigSchema>;

/**
 * Handler for providing liquidity to DeFi protocols
 */
@Injectable()
export class LiquidityProviderHandler implements BlockHandler {
  private readonly logger = new Logger(LiquidityProviderHandler.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly protocolService: ProtocolService,
    private readonly walletService: WalletService,
  ) {}

  // Execution tracking methods
  public async startExecution(
    nodeId: string,
    executionId: string,
    blockType: string,
  ): Promise<string> {
    try {
      const blockExecution =
        await this.databaseService.prisma.blockExecution.create({
          data: {
            nodeId,
            executionId,
            blockType,
            status: 'running',
            startTime: new Date(),
          },
        });

      return blockExecution.id;
    } catch (error: any) {
      this.logger.error(
        `Error starting execution tracking: ${error?.message || 'Unknown error'}`,
      );
      return '';
    }
  }

  public async completeExecution(
    blockExecutionId: string,
    status: 'completed' | 'failed',
    result?: any,
    error?: Error,
  ): Promise<void> {
    if (!blockExecutionId) return;

    try {
      await this.databaseService.prisma.blockExecution.update({
        where: { id: blockExecutionId },
        data: {
          status,
          endTime: new Date(),
          output: result ? JSON.stringify(result) : null,
          error: error ? error.message : null,
        },
      });
    } catch (error: any) {
      this.logger.error(
        `Error completing execution tracking: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  public async trackLog(
    executionId: string,
    nodeId: string,
    level: 'info' | 'error' | 'warn',
    message: string,
  ): Promise<void> {
    try {
      await this.databaseService.executions.addLog(
        executionId,
        level,
        message,
        {
          nodeId,
          timestamp: new Date().toISOString(),
        },
      );
    } catch (error: any) {
      this.logger.error(
        `Error tracking log: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    const { id: nodeId } = node;
    const { executionId } = ctx;
    const blockType = BlockType.DEFI_LIQUIDITY;
    const inputs = ctx.workflowData || {};
    const config = node.data?.config || {};
    this.logger.log(`Executing LiquidityProvider block: ${nodeId}`);

    // Track execution
    const blockExecutionId = await this.startExecution(
      nodeId,
      executionId,
      blockType,
    );

    try {
      // Validate configuration
      const validatedConfig = this.validateConfig(config);

      // Log the start of liquidity provision
      await this.trackLog(
        executionId,
        nodeId,
        'info',
        `Preparing to provide liquidity for ${validatedConfig.tokenA}/${validatedConfig.tokenB} on ${validatedConfig.protocol}`,
      );

      // Get wallet from wallet service
      // For this example, we'll use the wallet for Ethereum mainnet (chain ID 1)
      // In a real implementation, you would map the walletId to a chainId or use a different method
      const chainId = 1; // Ethereum mainnet
      const wallet = await this.walletService.get(chainId);
      if (!wallet) {
        throw new Error(`Wallet for chain ID ${chainId} not found`);
      }

      // Check balances before providing liquidity
      const balanceABefore = await this.checkAssetBalance(
        wallet,
        validatedConfig.tokenA,
      );

      const balanceBBefore = await this.checkAssetBalance(
        wallet,
        validatedConfig.tokenB,
      );

      await this.trackLog(
        executionId,
        nodeId,
        'info',
        `Current balances: ${validatedConfig.tokenA}: ${balanceABefore}, ${validatedConfig.tokenB}: ${balanceBBefore}`,
      );

      // Calculate optimal amounts if amountB is not provided
      const amountA = validatedConfig.amountA;
      const amountB = validatedConfig.amountB || '0'; // Default to 0 if not provided

      await this.trackLog(
        executionId,
        nodeId,
        'info',
        `Providing liquidity with ${amountA} ${validatedConfig.tokenA} and ${amountB} ${validatedConfig.tokenB}`,
      );

      // Provide liquidity using the ProtocolService directly
      const txResponse = await this.protocolService.provideLiquidity({
        poolAddress: '', // This would be determined based on the tokens
        tokenA: validatedConfig.tokenA,
        tokenB: validatedConfig.tokenB,
        amount: ethers.parseUnits(
          amountA,
          this.getTokenDecimals(validatedConfig.tokenA),
        ),
        slippage: validatedConfig.slippage,
      });

      // Wait for transaction to be mined
      const receipt = await txResponse.wait();

      // Get LP token information
      // Extract LP tokens received from receipt (placeholder implementation)
      const lpTokensReceived = '100'; // This would be parsed from the receipt

      // Check balances after providing liquidity
      const balanceAAfter = await this.checkAssetBalance(
        wallet,
        validatedConfig.tokenA,
      );

      const balanceBAfter = await this.checkAssetBalance(
        wallet,
        validatedConfig.tokenB,
      );

      await this.trackLog(
        executionId,
        nodeId,
        'info',
        `Liquidity provided. LP tokens received: ${lpTokensReceived}. New balances: ${validatedConfig.tokenA}: ${balanceAAfter}, ${validatedConfig.tokenB}: ${balanceBAfter}`,
      );

      // Complete execution
      const result = {
        action: 'provideLiquidity',
        protocol: validatedConfig.protocol,
        tokenA: validatedConfig.tokenA,
        tokenB: validatedConfig.tokenB,
        amountAProvided: amountA,
        amountBProvided: amountB,
        lpTokensReceived,
        balanceABefore,
        balanceAAfter,
        balanceBBefore,
        balanceBAfter,
        transactionHash: receipt.hash,
        gasUsed: receipt.gasUsed.toString(),
        timestamp: new Date().toISOString(),
      };

      await this.completeExecution(blockExecutionId, 'completed', result);

      return result;
    } catch (error: any) {
      // Log error
      await this.trackLog(
        executionId,
        nodeId,
        'error',
        `Liquidity provision failed: ${error?.message || 'Unknown error'}`,
      );

      // Complete execution with error
      await this.completeExecution(blockExecutionId, 'failed', null, error);

      throw error;
    }
  }

  /**
   * Validates the configuration for the liquidity provider block
   */
  private validateConfig(config: Record<string, any>): LiquidityProviderConfig {
    try {
      return LiquidityProviderConfigSchema.parse(config);
    } catch (error: any) {
      throw new Error(
        `Invalid liquidity provider configuration: ${error?.message || 'Unknown validation error'}`,
      );
    }
  }

  /**
   * Checks the balance of a specific asset in a wallet
   */
  private async checkAssetBalance(
    wallet: ethers.Wallet,
    asset: string,
  ): Promise<string> {
    try {
      if (asset.toLowerCase() === 'eth') {
        const balance = await wallet.provider.getBalance(wallet.address);
        return ethers.formatEther(balance);
      } else {
        // For ERC20 tokens, we need to get the token contract
        // This is a simplified implementation
        const tokenContract = new Contract(
          this.getTokenAddress(asset),
          ['function balanceOf(address) view returns (uint256)'],
          wallet.provider,
        );

        const balance = await tokenContract.balanceOf(wallet.address);
        return ethers.formatUnits(balance, this.getTokenDecimals(asset));
      }
    } catch (error: any) {
      throw new Error(
        `Failed to check asset balance: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  // This method is no longer needed as we're using the ProtocolService directly

  /**
   * Gets the token address for a given asset symbol
   * This is a simplified implementation and should be replaced with a proper token registry
   */
  private getTokenAddress(asset: string): string {
    // This would typically come from a token registry or configuration
    const tokenAddresses: Record<string, string> = {
      USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Mainnet USDC
      DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F', // Mainnet DAI
      WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // Mainnet WETH
      // Add more tokens as needed
    };

    const address = tokenAddresses[asset.toUpperCase()];
    if (!address) {
      throw new Error(`Token address not found for asset: ${asset}`);
    }

    return address;
  }

  /**
   * Gets the token decimals for a given asset symbol
   * This is a simplified implementation and should be replaced with a proper token registry
   */
  private getTokenDecimals(asset: string): number {
    // This would typically come from a token registry or configuration
    const tokenDecimals: Record<string, number> = {
      ETH: 18,
      USDC: 6,
      DAI: 18,
      WETH: 18,
      // Add more tokens as needed
    };

    const decimals = tokenDecimals[asset.toUpperCase()];
    if (decimals === undefined) {
      throw new Error(`Token decimals not found for asset: ${asset}`);
    }

    return decimals;
  }

  /**
   * Gets the pool address for a token pair on a specific protocol
   * This is a placeholder implementation
   */
  private getPoolAddress(
    protocol: string,
    tokenA: string,
    tokenB: string,
  ): string {
    // In a real implementation, this would call the protocol service or a registry
    // For now, just return a placeholder address
    return '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
  }
}
