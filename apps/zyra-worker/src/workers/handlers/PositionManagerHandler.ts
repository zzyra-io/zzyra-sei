import { Injectable } from '@nestjs/common';
import { z } from 'zod';
import { ethers } from 'ethers';
import { AbstractBlockHandler } from './AbstractBlockHandler';
import { DatabaseService } from '../../services/database.service';

import { ProtocolService } from '../../services/protocol.service';
import { WalletService } from './blockchain/WalletService';
import { BlockType, BlockExecutionContext, BlockHandler } from '@zyra/types';

// Define the configuration schema for position management
const PositionManagerConfigSchema = z.object({
  protocol: z.string().min(1, 'Protocol is required'),
  positionId: z.string().optional(), // Required for existing positions
  action: z.enum(['create', 'adjust', 'close', 'monitor']),
  tokenA: z.string().min(1, 'First token is required'),
  tokenB: z.string().min(1, 'Second token is required'),
  amountA: z.string().optional(),
  amountB: z.string().optional(),
  priceRange: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
    })
    .optional(),
  slippage: z.number().min(0).max(100).default(1), // Default 1% slippage
  gasLimit: z.number().optional(),
  maxFee: z.number().optional(),
  walletId: z.string().min(1, 'Wallet ID is required'),
  deadline: z.number().optional(), // Deadline in minutes
});

type PositionManagerConfig = z.infer<typeof PositionManagerConfigSchema>;

/**
 * Handler for managing DeFi positions (e.g., Uniswap V3 positions)
 */
@Injectable()
export class PositionManagerHandler extends AbstractBlockHandler {
  constructor(
    databaseService: DatabaseService,
    private readonly protocolService: ProtocolService,
    private readonly walletService: WalletService,
  ) {
    super(databaseService);
  }

  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    const { id: nodeId } = node;
    const { executionId } = ctx;
    const blockType = BlockType.DEFI_POSITION;
    const inputs = ctx.workflowData || {};
    const config = node.data?.config || {};
    // Track execution
    const blockExecutionId = await this.startExecution(
      nodeId,
      executionId,
      blockType,
    );

    try {
      // Validate configuration
      const validatedConfig = this.validateConfig(config);

      // Log the start of position management
      await this.trackLog(
        executionId,
        nodeId,
        'info',
        `${validatedConfig.action.charAt(0).toUpperCase() + validatedConfig.action.slice(1)}ing position for ${validatedConfig.tokenA}/${validatedConfig.tokenB} on ${validatedConfig.protocol}`,
      );

      // Get wallet from wallet service
      // For this example, we'll use the wallet for Ethereum mainnet (chain ID 1)
      // In a real implementation, you would map the walletId to a chainId or use a different method
      const chainId = 1; // Ethereum mainnet
      const wallet = await this.walletService.get(chainId);
      if (!wallet) {
        throw new Error(`Wallet for chain ID ${chainId} not found`);
      }

      // Get protocol provider
      // Since getProtocolProvider doesn't exist, we'll use a simple placeholder
      // In a real implementation, this would be a service call to get the provider
      const protocolProvider = { name: validatedConfig.protocol };

      // Execute the appropriate action based on configuration
      let result: Record<string, any>;

      switch (validatedConfig.action) {
        case 'create':
          result = await this.createPosition(
            protocolProvider,
            validatedConfig,
            wallet,
            executionId,
            nodeId,
          );
          break;
        case 'adjust':
          result = await this.adjustPosition(
            protocolProvider,
            validatedConfig,
            wallet,
            executionId,
            nodeId,
          );
          break;
        case 'close':
          result = await this.closePosition(
            protocolProvider,
            validatedConfig,
            wallet,
            executionId,
            nodeId,
          );
          break;
        case 'monitor':
          result = await this.monitorPosition(
            protocolProvider,
            validatedConfig,
            wallet,
            executionId,
            nodeId,
          );
          break;
        default:
          throw new Error(`Unsupported action: ${validatedConfig.action}`);
      }

      // Complete execution
      await this.completeExecution(blockExecutionId, 'completed', result);

      return result;
    } catch (error: any) {
      // Log error
      await this.trackLog(
        executionId,
        nodeId,
        'error',
        `Position management failed: ${error?.message || 'Unknown error'}`,
      );

      // Complete execution with error
      await this.completeExecution(blockExecutionId, 'failed', null, error);

      throw error;
    }
  }

  /**
   * Validates the configuration for the position manager block
   */
  protected validateConfig(config: Record<string, any>): PositionManagerConfig {
    try {
      const parsedConfig = PositionManagerConfigSchema.parse(config);

      // Additional validation based on action
      switch (parsedConfig.action) {
        case 'create':
          if (!parsedConfig.amountA || !parsedConfig.amountB) {
            throw new Error(
              'Both amountA and amountB are required for creating a position',
            );
          }
          if (!parsedConfig.priceRange) {
            throw new Error('Price range is required for creating a position');
          }
          break;
        case 'adjust':
        case 'close':
          if (!parsedConfig.positionId) {
            throw new Error(
              'Position ID is required for adjusting or closing a position',
            );
          }
          break;
        case 'monitor':
          if (!parsedConfig.positionId) {
            throw new Error(
              'Position ID is required for monitoring a position',
            );
          }
          break;
      }

      return parsedConfig;
    } catch (error: any) {
      throw new Error(
        `Invalid position manager configuration: ${error?.message || 'Unknown validation error'}`,
      );
    }
  }

  /**
   * Creates a new position
   */
  private async createPosition(
    protocolProvider: any,
    config: PositionManagerConfig,
    wallet: ethers.Wallet,
    executionId: string,
    nodeId: string,
  ): Promise<Record<string, any>> {
    try {
      // Check balances before creating position
      const balanceABefore = await this.checkAssetBalance(
        wallet,
        config.tokenA,
      );
      const balanceBBefore = await this.checkAssetBalance(
        wallet,
        config.tokenB,
      );

      await this.trackLog(
        executionId,
        nodeId,
        'info',
        `Current balances: ${config.tokenA}: ${balanceABefore}, ${config.tokenB}: ${balanceBBefore}`,
      );

      // Convert amounts to BigNumber
      const amountA = ethers.parseUnits(
        config.amountA || '0',
        this.getTokenDecimals(config.tokenA),
      );

      const amountB = ethers.parseUnits(
        config.amountB || '0',
        this.getTokenDecimals(config.tokenB),
      );

      // Calculate deadline if provided
      const deadline = config.deadline
        ? Math.floor(Date.now() / 1000) + config.deadline * 60 // Convert minutes to seconds
        : Math.floor(Date.now() / 1000) + 30 * 60; // Default 30 minutes

      // Create the position
      const createResult = await protocolProvider.createPosition({
        tokenA: config.tokenA,
        tokenB: config.tokenB,
        amountA,
        amountB,
        fee: 3000, // Default fee tier (0.3%)
        tickLower: this.priceToTick(config.priceRange!.min || 0),
        tickUpper: this.priceToTick(config.priceRange!.max || 0),
        slippage: config.slippage,
        gasLimit: config.gasLimit,
        maxFee: config.maxFee,
        wallet,
        deadline,
      });

      // Wait for transaction to be mined
      const receipt = await createResult.tx.wait();

      // Parse position ID from receipt
      const positionId = this.parsePositionIdFromReceipt(receipt);

      // Check balances after creating position
      const balanceAAfter = await this.checkAssetBalance(wallet, config.tokenA);
      const balanceBAfter = await this.checkAssetBalance(wallet, config.tokenB);

      await this.trackLog(
        executionId,
        nodeId,
        'info',
        `Position created with ID: ${positionId}. New balances: ${config.tokenA}: ${balanceAAfter}, ${config.tokenB}: ${balanceBAfter}`,
      );

      // Store position in database for future reference
      await this.storePosition({
        positionId,
        protocol: config.protocol,
        tokenA: config.tokenA,
        tokenB: config.tokenB,
        amountA: config.amountA!,
        amountB: config.amountB!,
        priceRangeMin: config.priceRange!.min,
        priceRangeMax: config.priceRange!.max,
        walletId: config.walletId,
        createdAt: new Date().toISOString(),
        transactionHash: receipt.transactionHash,
      });

      return {
        action: 'create',
        positionId,
        tokenA: config.tokenA,
        tokenB: config.tokenB,
        amountAProvided: config.amountA,
        amountBProvided: config.amountB,
        priceRange: config.priceRange,
        balanceABefore,
        balanceAAfter,
        balanceBBefore,
        balanceBAfter,
        transactionHash: receipt.transactionHash,
        gasUsed: receipt.gasUsed.toString(),
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new Error(
        `Failed to create position: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Adjusts an existing position
   */
  private async adjustPosition(
    protocolProvider: any,
    config: PositionManagerConfig,
    wallet: ethers.Wallet,
    executionId: string,
    nodeId: string,
  ): Promise<Record<string, any>> {
    try {
      // Get position details
      const position = await this.getPositionDetails(
        protocolProvider,
        config.positionId!,
      );

      await this.trackLog(
        executionId,
        nodeId,
        'info',
        `Adjusting position ${config.positionId}: Current liquidity: ${position.liquidity}, Tokens: ${position.tokenA}/${position.tokenB}`,
      );

      // Check if we're adding or removing liquidity
      const isAdding =
        config.amountA !== undefined || config.amountB !== undefined;

      let adjustResult;
      if (isAdding) {
        // Adding liquidity
        const amountA = config.amountA
          ? ethers.parseUnits(
              config.amountA,
              this.getTokenDecimals(config.tokenA),
            )
          : ethers.ZeroAddress;

        const amountB = config.amountB
          ? ethers.parseUnits(
              config.amountB,
              this.getTokenDecimals(config.tokenB),
            )
          : ethers.ZeroAddress;

        adjustResult = await protocolProvider.increaseLiquidity({
          positionId: config.positionId,
          amountA,
          amountB,
          slippage: config.slippage,
          gasLimit: config.gasLimit,
          maxFee: config.maxFee,
          wallet,
          deadline:
            Math.floor(Date.now() / 1000) + (config.deadline || 30) * 60,
        });
      } else {
        // Removing liquidity (partial)
        adjustResult = await protocolProvider.decreaseLiquidity({
          positionId: config.positionId,
          liquidity: position.liquidity.div(2), // Remove 50% of liquidity by default
          slippage: config.slippage,
          gasLimit: config.gasLimit,
          maxFee: config.maxFee,
          wallet,
          deadline:
            Math.floor(Date.now() / 1000) + (config.deadline || 30) * 60,
        });
      }

      // Wait for transaction to be mined
      const receipt = await adjustResult.tx.wait();

      // Get updated position details
      const updatedPosition = await this.getPositionDetails(
        protocolProvider,
        config.positionId!,
      );

      await this.trackLog(
        executionId,
        nodeId,
        'info',
        `Position adjusted. New liquidity: ${updatedPosition.liquidity}`,
      );

      return {
        action: 'adjust',
        positionId: config.positionId,
        tokenA: config.tokenA,
        tokenB: config.tokenB,
        liquidityBefore: position.liquidity.toString(),
        liquidityAfter: updatedPosition.liquidity.toString(),
        amountAAdded: config.amountA || '0',
        amountBAdded: config.amountB || '0',
        transactionHash: receipt.transactionHash,
        gasUsed: receipt.gasUsed.toString(),
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new Error(
        `Failed to adjust position: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Closes an existing position
   */
  private async closePosition(
    protocolProvider: any,
    config: PositionManagerConfig,
    wallet: ethers.Wallet,
    executionId: string,
    nodeId: string,
  ): Promise<Record<string, any>> {
    try {
      // Get position details
      const position = await this.getPositionDetails(
        protocolProvider,
        config.positionId!,
      );

      await this.trackLog(
        executionId,
        nodeId,
        'info',
        `Closing position ${config.positionId}: Current liquidity: ${position.liquidity}, Tokens: ${position.tokenA}/${position.tokenB}`,
      );

      // Check balances before closing position
      const balanceABefore = await this.checkAssetBalance(
        wallet,
        config.tokenA,
      );
      const balanceBBefore = await this.checkAssetBalance(
        wallet,
        config.tokenB,
      );

      // First, remove all liquidity
      const removeLiquidityResult = await protocolProvider.decreaseLiquidity({
        positionId: config.positionId,
        liquidity: position.liquidity, // Remove all liquidity
        slippage: config.slippage,
        gasLimit: config.gasLimit,
        maxFee: config.maxFee,
        wallet,
        deadline: Math.floor(Date.now() / 1000) + (config.deadline || 30) * 60,
      });

      // Wait for transaction to be mined
      await removeLiquidityResult.tx.wait();

      // Then, collect all fees and tokens
      const collectResult = await protocolProvider.collect({
        positionId: config.positionId,
        recipient: wallet.address,
        amountAMax: ethers.MaxUint256,
        amountBMax: ethers.MaxUint256,
        gasLimit: config.gasLimit,
        maxFee: config.maxFee,
        wallet,
      });

      // Wait for transaction to be mined
      const collectReceipt = await collectResult.tx.wait();

      // Check balances after closing position
      const balanceAAfter = await this.checkAssetBalance(wallet, config.tokenA);
      const balanceBAfter = await this.checkAssetBalance(wallet, config.tokenB);

      await this.trackLog(
        executionId,
        nodeId,
        'info',
        `Position closed. Received: ${config.tokenA}: ${parseFloat(balanceAAfter) - parseFloat(balanceABefore)}, ${config.tokenB}: ${parseFloat(balanceBAfter) - parseFloat(balanceBBefore)}`,
      );

      // Update position in database
      await this.updatePositionStatus(config.positionId!, 'closed');

      return {
        action: 'close',
        positionId: config.positionId,
        tokenA: config.tokenA,
        tokenB: config.tokenB,
        amountAReceived: (
          parseFloat(balanceAAfter) - parseFloat(balanceABefore)
        ).toString(),
        amountBReceived: (
          parseFloat(balanceBAfter) - parseFloat(balanceBBefore)
        ).toString(),
        balanceABefore,
        balanceAAfter,
        balanceBBefore,
        balanceBAfter,
        transactionHash: collectReceipt.transactionHash,
        gasUsed: collectReceipt.gasUsed.toString(),
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new Error(
        `Failed to close position: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Monitors an existing position
   */
  private async monitorPosition(
    protocolProvider: any,
    config: PositionManagerConfig,
    wallet: ethers.Wallet,
    executionId: string,
    nodeId: string,
  ): Promise<Record<string, any>> {
    try {
      // Get position details
      const position = await this.getPositionDetails(
        protocolProvider,
        config.positionId!,
      );

      await this.trackLog(
        executionId,
        nodeId,
        'info',
        `Monitoring position ${config.positionId}: Current liquidity: ${position.liquidity}, Tokens: ${position.tokenA}/${position.tokenB}`,
      );

      // Get current price
      const currentPrice = await protocolProvider.getPrice(
        config.tokenA,
        config.tokenB,
      );

      // Calculate position value
      const positionValue = await protocolProvider.getPositionValue(
        config.positionId!,
      );

      // Calculate uncollected fees
      const uncollectedFees = await protocolProvider.getUncollectedFees(
        config.positionId!,
      );

      // Check if position is in range
      const inRange = this.isPositionInRange(position, currentPrice);

      await this.trackLog(
        executionId,
        nodeId,
        'info',
        `Position status: In range: ${inRange}, Current price: ${currentPrice}, Value: ${positionValue.totalValue}, Uncollected fees: ${uncollectedFees.tokenA} ${position.tokenA}, ${uncollectedFees.tokenB} ${position.tokenB}`,
      );

      return {
        action: 'monitor',
        positionId: config.positionId,
        tokenA: config.tokenA,
        tokenB: config.tokenB,
        liquidity: position.liquidity.toString(),
        tickLower: position.tickLower,
        tickUpper: position.tickUpper,
        priceLower: this.tickToPrice(position.tickLower),
        priceUpper: this.tickToPrice(position.tickUpper),
        currentPrice,
        inRange,
        positionValue: {
          amountA: positionValue.amountA,
          amountB: positionValue.amountB,
          totalValue: positionValue.totalValue,
        },
        uncollectedFees: {
          tokenA: uncollectedFees.tokenA,
          tokenB: uncollectedFees.tokenB,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new Error(
        `Failed to monitor position: ${error?.message || 'Unknown error'}`,
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
        const tokenContract = new ethers.Contract(
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

  /**
   * Gets details of an existing position
   */
  private async getPositionDetails(
    protocolProvider: any,
    positionId: string,
  ): Promise<any> {
    try {
      return await protocolProvider.getPosition(positionId);
    } catch (error: any) {
      throw new Error(
        `Failed to get position details: ${error?.message || 'Unknown error'}`,
      );
    }
  }

  /**
   * Stores position details in the database
   */
  private async storePosition(position: any): Promise<void> {
    try {
      // Store position data using a generic approach since position model may not exist
      await this.trackLog(
        position.executionId || 'unknown',
        position.nodeId || 'unknown',
        'info',
        `Position stored: ${JSON.stringify(position)}`,
      );
    } catch (error: any) {
      this.logger.error(`Failed to store position: ${error.message}`);
    }
  }

  /**
   * Updates position status in the database
   */
  private async updatePositionStatus(
    positionId: string,
    status: string,
  ): Promise<void> {
    try {
      // Update position status using logging since position model may not exist
      this.logger.log(`Position ${positionId} status updated to: ${status}`);
    } catch (error: any) {
      this.logger.error(`Failed to update position status: ${error.message}`);
    }
  }

  /**
   * Parses position ID from transaction receipt
   * This is a simplified implementation and would need to be adapted for each protocol
   */
  private parsePositionIdFromReceipt(
    receipt: ethers.TransactionReceipt,
  ): string {
    try {
      // This is a simplified implementation
      // In a real implementation, we would look for specific events in the receipt
      // For example, for Uniswap V3, we would look for the "IncreaseLiquidity" event

      // For now, return a placeholder
      return `${receipt.hash.substring(0, 10)}-${Date.now()}`;
    } catch (error: any) {
      this.logger.warn(
        `Failed to parse position ID from receipt: ${error?.message || 'Unknown error'}`,
      );
      return `unknown-${Date.now()}`;
    }
  }

  /**
   * Converts price to tick (for Uniswap V3)
   * This is a simplified implementation
   */
  private priceToTick(price: number): number {
    if (price <= 0) return 0;
    return Math.floor(Math.log(price) / Math.log(1.0001));
  }

  /**
   * Converts tick to price (for Uniswap V3)
   * This is a simplified implementation
   */
  private tickToPrice(tick: number): number {
    return Math.pow(1.0001, tick);
  }

  /**
   * Checks if a position is in the current price range
   */
  private isPositionInRange(position: any, currentPrice: number): boolean {
    const lowerPrice = this.tickToPrice(position.tickLower);
    const upperPrice = this.tickToPrice(position.tickUpper);
    return currentPrice >= lowerPrice && currentPrice <= upperPrice;
  }

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
}
