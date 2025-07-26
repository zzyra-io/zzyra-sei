import { z } from 'zod';
import { ethers } from 'ethers';
import { seiPaymentSchema } from '@zyra/types';
import { SeiRpcClient } from './services/SeiRpcClient';
import { SeiWalletService } from './services/SeiWalletService';

interface BlockExecutionContext {
  inputs?: Record<string, any>;
  previousOutputs?: Record<string, any>;
  variables?: Record<string, any>;
  workflowId?: string;
  executionId?: string;
  userId?: string;
}

/**
 * Sei Payment Handler
 * Executes payments on Sei blockchain using delegation pattern
 */
export class SeiPaymentHandler {
  static readonly inputSchema = seiPaymentSchema.inputSchema;
  static readonly outputSchema = seiPaymentSchema.outputSchema;
  static readonly configSchema = seiPaymentSchema.configSchema;

  private rpcClients: Map<string, SeiRpcClient> = new Map();
  private walletServices: Map<string, SeiWalletService> = new Map();

  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    const startTime = Date.now();

    try {
      // Validate user context
      if (!ctx.userId) {
        throw new Error('User ID is required for payment operations');
      }

      const config = this.validateAndExtractConfig(node, ctx);
      const inputs = this.validateInputs(
        ctx.inputs || {},
        ctx.previousOutputs || {},
        ctx,
      );

      // Get wallet service for the network
      const walletService = this.getWalletService(config.network);

      // Validate user session before proceeding
      const isValidSession = await walletService.validateUserSession(
        ctx.userId,
      );
      if (!isValidSession) {
        throw new Error('Invalid user session. Please log in again.');
      }

      // Get user's wallet address
      const userAddress = await walletService.getUserWalletAddress(ctx.userId);
      if (!userAddress) {
        throw new Error('No wallet found for user');
      }

      // Check if user has sufficient balance
      const requiredAmount = BigInt(inputs.amount || '0');
      const hasSufficientBalance = await walletService.checkSufficientBalance(
        ctx.userId,
        requiredAmount,
        inputs.tokenAddress,
      );

      if (!hasSufficientBalance) {
        throw new Error('Insufficient balance for payment');
      }

      // For high-value transactions, request approval
      const highValueThreshold = BigInt('1000000000000000000'); // 1 ETH
      if (requiredAmount > highValueThreshold) {
        const approved = await walletService.requestTransactionApproval(
          ctx.userId,
          {
            to: inputs.recipientAddress,
            value: inputs.amount,
            data: inputs.data || '0x',
          },
          `Payment of ${inputs.amount} to ${inputs.recipientAddress}`,
        );

        if (!approved) {
          throw new Error('Transaction approval denied by user');
        }
      }

      // Prepare transaction
      const transaction = {
        to: inputs.recipientAddress,
        value: BigInt(inputs.amount),
        data: inputs.data || '0x',
        gasLimit: config.gasLimit ? BigInt(config.gasLimit) : undefined,
        gasPrice: config.gasPrice ? BigInt(config.gasPrice) : undefined,
      };

      // Estimate gas if not provided
      if (!transaction.gasLimit) {
        const gasEstimate = await walletService.estimateGasForUser(
          ctx.userId,
          transaction,
        );
        transaction.gasLimit = gasEstimate.gasLimit;
        transaction.gasPrice = gasEstimate.gasPrice;
      }

      // Execute transaction through Magic delegation
      const result = await walletService.delegateTransaction(
        ctx.userId,
        transaction,
        config.network,
      );

      // Wait for confirmation if configured
      let receipt = null;
      if (config.waitForConfirmation) {
        receipt = await walletService.waitForTransaction(
          result.txHash,
          config.confirmations || 1,
        );
      }

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        txHash: result.txHash,
        status: result.status,
        recipientAddress: inputs.recipientAddress,
        amount: inputs.amount,
        network: config.network,
        executionTime,
        receipt,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      return {
        success: false,
        error: error.message,
        network: node.data?.config?.network || 'sei-testnet',
        executionTime,
        timestamp: new Date().toISOString(),
      };
    }
  }

  private validateAndExtractConfig(node: any, ctx: BlockExecutionContext): any {
    const config = node.data?.config || {};
    return SeiPaymentHandler.configSchema.parse(config);
  }

  private validateInputs(
    inputs: Record<string, any>,
    previousOutputs: Record<string, any>,
    ctx: BlockExecutionContext,
  ): Record<string, any> {
    return SeiPaymentHandler.inputSchema.parse({
      ...inputs,
      ...previousOutputs,
    });
  }

  private getRpcClient(network: string): SeiRpcClient {
    if (!this.rpcClients.has(network)) {
      const rpcUrl =
        network === 'sei-mainnet'
          ? process.env.SEI_MAINNET_RPC_URL || 'https://evm-rpc.sei-apis.com'
          : process.env.SEI_TESTNET_RPC_URL ||
            'https://evm-rpc-testnet.sei-apis.com';

      const restUrl =
        network === 'sei-mainnet'
          ? process.env.SEI_MAINNET_REST_URL || 'https://rest.sei-apis.com'
          : process.env.SEI_TESTNET_REST_URL ||
            'https://rest-testnet.sei-apis.com';

      this.rpcClients.set(network, new SeiRpcClient(rpcUrl, restUrl));
    }

    return this.rpcClients.get(network)!;
  }

  private getWalletService(network: string): SeiWalletService {
    if (!this.walletServices.has(network)) {
      const client = this.getRpcClient(network);
      this.walletServices.set(
        network,
        new SeiWalletService(client.getProvider()),
      );
    }

    return this.walletServices.get(network)!;
  }
}
