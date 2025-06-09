import { Injectable, Logger } from '@nestjs/common';
import { BlockHandler, BlockExecutionContext } from '@zyra/types';
import { MagicAdminService } from '../../services/magic-admin.service';
import { DatabaseService } from '../../services/database.service';
import { ethers } from 'ethers';
import * as z from 'zod';

/**
 * Magic Wallet Handler
 * Handles operations related to Magic Link wallets in workflows
 * Supports wallet balance retrieval and transaction preparation
 */
@Injectable()
export class MagicWalletHandler implements BlockHandler {
  private readonly logger = new Logger(MagicWalletHandler.name);

  constructor(
    private readonly magicAdminService: MagicAdminService,
    private readonly databaseService: DatabaseService,
  ) {}

  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    const cfg = (node.data as any).config;
    const { operation, parameters } = cfg;

    this.logger.log(`Executing Magic Wallet operation: ${operation}`);

    try {
      switch (operation) {
        case 'get_balance':
          return this.getBalance(parameters, ctx.inputs || {});
        case 'prepare_transaction':
          return this.prepareTransaction(parameters, ctx.inputs || {});
        default:
          throw new Error(`Unsupported operation: ${operation}`);
      }
    } catch (error) {
      this.logger.error(
        `Magic Wallet operation failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
      throw error;
    }
  }

  /**
   * Get wallet balance for a user
   */
  private async getBalance(
    parameters: any,
    inputs: Record<string, any>,
  ): Promise<any> {
    const { userId, asset, chainId } = this.resolveParams(parameters, inputs);

    this.logger.log(
      `Getting ${asset} balance for user ${userId} on chain ${chainId}`,
    );

    // Get user's Magic wallet info from database
    const userWallet = await this.databaseService.prisma.userWallet.findFirst({
      where: { userId },
    });

    if (!userWallet) {
      throw new Error(`No wallet found for user ${userId}`);
    }

    // Extract Magic issuer from wallet metadata
    const metadata = userWallet.metadata as Record<string, any>;
    const magicIssuer = metadata?.magicIssuer;
    
    if (!magicIssuer) {
      throw new Error(`No Magic issuer found for user ${userId}`);
    }

    // Get wallet metadata from Magic
    const walletInfo = await this.magicAdminService.getUserWallet(
      magicIssuer,
      asset,
    );

    // Connect to provider based on chain ID
    const provider = this.getProviderForChain(chainId);

    // Get balance
    const balance = await provider.getBalance(walletInfo.publicAddress);
    const formattedBalance = ethers.formatEther(balance);

    return {
      balance: formattedBalance,
      balanceWei: balance.toString(),
      address: walletInfo.publicAddress,
      asset,
      chainId,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Prepare transaction data for a user's wallet
   * Note: This doesn't execute the transaction, just prepares the data
   */
  private async prepareTransaction(
    parameters: any,
    inputs: Record<string, any>,
  ): Promise<any> {
    const { 
      userId, 
      asset, 
      chainId,
      to,
      value,
      data,
      gasLimit,
    } = this.resolveParams(parameters, inputs);

    this.logger.log(
      `Preparing ${asset} transaction for user ${userId} on chain ${chainId}`,
    );

    // Get user's Magic wallet info from database
    const userWallet = await this.databaseService.prisma.userWallet.findFirst({
      where: { userId },
    });

    if (!userWallet) {
      throw new Error(`No wallet found for user ${userId}`);
    }

    // Extract Magic issuer from wallet metadata
    const metadata = userWallet.metadata as Record<string, any>;
    const magicIssuer = metadata?.magicIssuer;
    
    if (!magicIssuer) {
      throw new Error(`No Magic issuer found for user ${userId}`);
    }

    // Get wallet metadata from Magic
    const walletInfo = await this.magicAdminService.getUserWallet(
      magicIssuer,
      asset,
    );

    // Connect to provider based on chain ID
    const provider = this.getProviderForChain(chainId);

    // Prepare transaction data
    const valueWei = ethers.parseEther(value.toString());
    const nonce = await provider.getTransactionCount(walletInfo.publicAddress);
    // Get fee data instead of gas price directly
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice;

    // For actual execution, this would be handled by a secure transaction service
    // that integrates with Magic's Admin SDK
    return {
      from: walletInfo.publicAddress,
      to,
      value: valueWei.toString(),
      valueFormatted: value,
      nonce,
      gasPrice: gasPrice.toString(),
      gasLimit: gasLimit || '21000',
      data: data || '0x',
      chainId,
      asset,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Helper method to get provider for a specific chain
   */
  private getProviderForChain(chainId: string | number): ethers.Provider {
    // Convert chainId to number if it's a string
    const chainIdNum = typeof chainId === 'string' ? parseInt(chainId, 10) : chainId;

    // Get RPC URL from environment variables based on chain ID
    let rpcUrl: string;
    switch (chainIdNum) {
      case 1: // Ethereum Mainnet
        rpcUrl = process.env.ETH_MAINNET_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo';
        break;
      case 5: // Goerli Testnet
        rpcUrl = process.env.ETH_GOERLI_RPC_URL || 'https://eth-goerli.g.alchemy.com/v2/demo';
        break;
      case 137: // Polygon Mainnet
        rpcUrl = process.env.POLYGON_MAINNET_RPC_URL || 'https://polygon-mainnet.g.alchemy.com/v2/demo';
        break;
      case 80001: // Mumbai Testnet
        rpcUrl = process.env.POLYGON_MUMBAI_RPC_URL || 'https://polygon-mumbai.g.alchemy.com/v2/demo';
        break;
      default:
        rpcUrl = process.env.ETH_MAINNET_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo';
    }

    return new ethers.JsonRpcProvider(rpcUrl);
  }

  /**
   * Helper method to resolve parameters from config and inputs
   */
  private resolveParams(
    parameters: Record<string, any>,
    inputs: Record<string, any>,
  ): Record<string, any> {
    const result: Record<string, any> = {};

    // Process each parameter, checking for template variables
    for (const [key, value] of Object.entries(parameters)) {
      if (typeof value === 'string' && value.match(/^\{\{.+\}\}$/)) {
        // Extract variable name from {{varName}}
        const varName = value.slice(2, -2).trim();
        result[key] = inputs[varName];
        
        if (result[key] === undefined) {
          this.logger.warn(`Variable ${varName} not found in inputs`);
        }
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  /**
   * Validate the configuration schema
   */
  validate(config: any): any {
    const schema = z.object({
      operation: z.enum(['get_balance', 'prepare_transaction']),
      parameters: z.object({
        userId: z.string(),
        asset: z.string(),
        chainId: z.union([z.string(), z.number()]),
        // Additional parameters for prepare_transaction
        to: z.string().optional(),
        value: z.union([z.string(), z.number()]).optional(),
        data: z.string().optional(),
        gasLimit: z.union([z.string(), z.number()]).optional(),
      }),
    });

    return schema.safeParse(config);
  }
}
