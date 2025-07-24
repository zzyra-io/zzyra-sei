import { z } from 'zod';
import { seiSmartContractCallSchema } from '@zyra/types';
import { ethers } from 'ethers';
import { SeiWalletService } from './services/SeiWalletService';

// Explicit type definitions to avoid Zod inference issues
interface SeiSmartContractCallConfig {
  network: string;
  contractAddress: string;
  abi?: any[];
  method: string;
  params?: any[];
  value?: string | number;
  gasLimit?: string | number;
  gasPrice?: string | number;
  waitForConfirmation?: boolean;
  confirmations?: number;
}

interface SeiSmartContractCallInput {
  data?: Record<string, any>;
  context?: {
    workflowId?: string;
    executionId?: string;
    userId?: string;
    timestamp: string;
  };
  variables?: Record<string, any>;
  dynamicParams?: any[];
}

interface BlockExecutionContext {
  inputs?: Record<string, any>;
  previousOutputs?: Record<string, any>;
  variables?: Record<string, any>;
  workflowId?: string;
  executionId?: string;
  userId?: string;
}

/**
 * Sei Smart Contract Call Handler
 * Executes smart contract functions on Sei blockchain
 */
export class SeiSmartContractCallHandler {
  static readonly inputSchema = seiSmartContractCallSchema.inputSchema;
  static readonly outputSchema = seiSmartContractCallSchema.outputSchema;
  static readonly configSchema = seiSmartContractCallSchema.configSchema;

  private walletServices: Map<string, SeiWalletService> = new Map();

  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    try {
      const config = this.validateAndExtractConfig(node, ctx);
      const inputs = this.validateInputs(
        ctx.inputs || {},
        ctx.previousOutputs || {},
        ctx,
      );

      const walletService = this.getWalletService(config.network);

      // Validate contract address
      if (!ethers.isAddress(config.contractAddress)) {
        throw new Error(`Invalid contract address: ${config.contractAddress}`);
      }

      // Create contract interface
      const contractInterface = new ethers.Interface(config.abi || []);

      // Encode function call
      const encodedData = contractInterface.encodeFunctionData(
        config.method,
        inputs.dynamicParams || config.params || [],
      );

      // Prepare transaction
      const transaction = {
        to: config.contractAddress,
        data: encodedData,
        value: config.value ? BigInt(config.value) : BigInt(0),
        gasLimit: config.gasLimit ? BigInt(config.gasLimit) : undefined,
        gasPrice: config.gasPrice ? BigInt(config.gasPrice) : undefined,
      };

      // Execute transaction
      const result = await walletService.delegateTransaction(
        ctx.userId || 'unknown',
        transaction,
        config.network,
      );

      // Wait for confirmation if required
      let receipt = null;
      if (config.waitForConfirmation) {
        receipt = await walletService.waitForTransaction(
          result.txHash,
          config.confirmations || 1,
        );
      }

      return {
        success: true,
        transactionHash: result.txHash,
        contractAddress: config.contractAddress,
        method: config.method,
        network: config.network,
        gasUsed: receipt?.gasUsed?.toString(),
        blockNumber: receipt?.blockNumber,
        confirmations: receipt?.confirmations,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  private validateAndExtractConfig(
    node: any,
    ctx: BlockExecutionContext,
  ): SeiSmartContractCallConfig {
    if (!node.config) {
      throw new Error('Block configuration is missing');
    }

    try {
      const result = seiSmartContractCallSchema.configSchema.safeParse(node.config);
      if (!result.success) {
        throw new Error(`Configuration validation failed: ${result.error.message}`);
      }
      return result.data as SeiSmartContractCallConfig;
    } catch (error) {
      throw new Error(`Configuration validation failed: ${error}`);
    }
  }

  private validateInputs(
    inputs: Record<string, any>,
    previousOutputs: Record<string, any>,
    ctx: BlockExecutionContext,
  ): SeiSmartContractCallInput {
    try {
      const result = seiSmartContractCallSchema.inputSchema.safeParse({
        data: inputs,
        context: {
          workflowId: ctx.workflowId,
          executionId: ctx.executionId,
          userId: ctx.userId,
          timestamp: new Date().toISOString(),
        },
        variables: ctx.variables,
      });
      if (!result.success) {
        throw new Error(`Input validation failed: ${result.error.message}`);
      }
      return result.data as SeiSmartContractCallInput;
    } catch (error) {
      throw new Error(`Input validation failed: ${error}`);
    }
  }

  private getWalletService(network: string): SeiWalletService {
    if (!this.walletServices.has(network)) {
      const rpcUrl =
        network === 'sei-mainnet'
          ? process.env.SEI_MAINNET_RPC_URL || 'https://evm-rpc.sei-apis.com'
          : process.env.SEI_TESTNET_RPC_URL ||
            'https://evm-rpc-testnet.sei-apis.com';

      const provider = new ethers.JsonRpcProvider(rpcUrl);
      this.walletServices.set(network, new SeiWalletService(provider));
    }
    return this.walletServices.get(network)!;
  }
}
