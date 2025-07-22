import { z } from 'zod';
import { ethers } from 'ethers';
import { seiSmartContractCallSchema } from '@zyra/types';
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
 * Sei Smart Contract Call Handler
 * Executes smart contract functions using delegation pattern
 */
export class SeiSmartContractCallHandler {
  static readonly inputSchema = seiSmartContractCallSchema.inputSchema;
  static readonly outputSchema = seiSmartContractCallSchema.outputSchema;
  static readonly configSchema = seiSmartContractCallSchema.configSchema;

  private rpcClients: Map<string, SeiRpcClient> = new Map();
  private walletServices: Map<string, SeiWalletService> = new Map();

  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    const startTime = Date.now();

    try {
      const config = this.validateAndExtractConfig(node, ctx);
      const inputs = this.validateInputs(
        ctx.inputs || {},
        ctx.previousOutputs || {},
        ctx,
      );

      if (!ctx.userId) {
        throw new Error('User ID is required for contract execution');
      }

      const client = this.getRpcClient(config.network);
      const walletService = this.getWalletService(config.network);

      // Build transaction object
      const transaction = await this.buildContractTransaction(
        config,
        inputs,
        client,
        ctx.userId,
      );

      // Validate transaction
      walletService.validateTransaction(transaction);

      // Check user balance
      const hasBalance = await walletService.checkSufficientBalance(
        ctx.userId,
        BigInt(transaction.value || 0) +
          BigInt(transaction.gasLimit || 0) * BigInt(transaction.gasPrice || 0),
      );

      if (!hasBalance) {
        throw new Error('Insufficient balance for contract execution');
      }

      // Delegate transaction execution
      const result = await walletService.delegateTransaction(
        ctx.userId,
        transaction,
        config.network,
      );

      // Wait for confirmation if configured
      let receipt = null;
      if (config.waitForConfirmation && result.txHash) {
        receipt = await walletService.waitForTransactionConfirmation(
          result.txHash,
          config.confirmationTimeout,
        );
      }

      // Log successful execution
      await walletService.logTransactionAttempt(
        ctx.userId,
        transaction,
        'success',
      );

      const executionTime = Date.now() - startTime;

      return {
        success: true,
        transaction: {
          txHash: result.txHash,
          status: result.status,
          blockNumber: receipt?.blockNumber,
          gasUsed: receipt?.gasUsed?.toString(),
          fees:
            receipt?.gasUsed && receipt?.gasPrice
              ? (BigInt(receipt.gasUsed) * BigInt(receipt.gasPrice)).toString()
              : undefined,
        },
        contractAddress: config.contractAddress,
        functionName: config.functionName,
        returnData: receipt?.logs?.length
          ? 'Contract execution completed'
          : undefined,
        events: this.parseContractEvents(receipt?.logs || []),
        executionTime,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      // Log failed execution
      if (ctx.userId) {
        const walletService = this.getWalletService(
          node.config?.network || 'sei-testnet',
        );
        await walletService.logTransactionAttempt(
          ctx.userId,
          {},
          'failure',
          error.message,
        );
      }

      return {
        success: false,
        transaction: {
          txHash: '',
          status: 'failed' as const,
        },
        contractAddress: node.config?.contractAddress || '',
        functionName: node.config?.functionName || '',
        error: error.message,
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      };
    }
  }

  private validateAndExtractConfig(
    node: any,
    ctx: BlockExecutionContext,
  ): z.infer<typeof seiSmartContractCallSchema.configSchema> {
    if (!node.config) {
      throw new Error('Block configuration is missing');
    }

    try {
      return seiSmartContractCallSchema.configSchema.parse(node.config);
    } catch (error) {
      throw new Error(`Configuration validation failed: ${error}`);
    }
  }

  private validateInputs(
    inputs: Record<string, any>,
    previousOutputs: Record<string, any>,
    ctx: BlockExecutionContext,
  ): any {
    try {
      // Structure the data according to the schema
      const structuredInputs = {
        data: { ...previousOutputs, ...inputs },
        context: {
          workflowId: ctx.workflowId || 'unknown',
          executionId: ctx.executionId || 'unknown',
          userId: ctx.userId || 'unknown',
          timestamp: new Date().toISOString(),
        },
        variables: {}, // Add any workflow variables if available
        dynamicParams: inputs.dynamicParams,
        gasOverride: inputs.gasOverride,
      };

      return seiSmartContractCallSchema.inputSchema.parse(structuredInputs);
    } catch (error) {
      console.warn('Input validation warning:', error);
      return inputs;
    }
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

  private async buildContractTransaction(
    config: any,
    inputs: any,
    client: SeiRpcClient,
    userId: string,
  ): Promise<any> {
    try {
      // Get user's wallet address
      const walletService = this.getWalletService(config.network);
      const fromAddress = await walletService.getUserWalletAddress(userId);

      // Build function call data
      const callData = await this.buildCallData(config, inputs);

      // Estimate gas if not provided
      let gasLimit = config.gasSettings?.gasLimit;
      let gasPrice = config.gasSettings?.gasPrice;

      if (!gasLimit || config.gasSettings?.estimateGas) {
        const estimateResult = await walletService.estimateGasForUser(userId, {
          to: config.contractAddress,
          data: callData,
          value: ethers.parseEther(config.value?.toString() || '0'),
        });
        gasLimit = estimateResult.gasLimit.toString();
        if (!gasPrice) gasPrice = estimateResult.gasPrice.toString();
      }

      return {
        to: config.contractAddress,
        data: callData,
        value: ethers.parseEther(config.value?.toString() || '0'),
        gasLimit,
        gasPrice,
        from: fromAddress,
      };
    } catch (error: any) {
      throw new Error(`Failed to build contract transaction: ${error.message}`);
    }
  }

  private async buildCallData(config: any, inputs: any): Promise<string> {
    try {
      if (config.abi) {
        // Use ABI to encode function call
        const contractInterface = new ethers.Interface(JSON.parse(config.abi));
        const params = this.extractFunctionParams(config, inputs);
        return contractInterface.encodeFunctionData(
          config.functionName,
          params,
        );
      } else if (config.functionSignature) {
        // Use function signature to encode call
        const params = this.extractFunctionParams(config, inputs);
        const functionFragment = ethers.FunctionFragment.from(
          config.functionSignature,
        );
        const contractInterface = new ethers.Interface([functionFragment]);
        return contractInterface.encodeFunctionData(functionFragment, params);
      } else {
        throw new Error('Either ABI or function signature must be provided');
      }
    } catch (error: any) {
      throw new Error(`Failed to build call data: ${error.message}`);
    }
  }

  private extractFunctionParams(config: any, inputs: any): any[] {
    const params: any[] = [];

    // Add configured parameters
    if (config.functionParams) {
      for (const param of config.functionParams) {
        params.push(this.parseParamValue(param.value, param.type));
      }
    }

    // Add dynamic parameters from inputs
    if (inputs.dynamicParams) {
      for (const [key, value] of Object.entries(inputs.dynamicParams)) {
        // For simplicity, append dynamic params (in real implementation, you'd match by name/position)
        params.push(value);
      }
    }

    return params;
  }

  private parseParamValue(value: any, type: string): any {
    switch (type) {
      case 'uint256':
      case 'uint':
        return BigInt(value);
      case 'address':
        return ethers.getAddress(value);
      case 'bool':
        return Boolean(value);
      case 'string':
        return String(value);
      case 'bytes':
        return ethers.hexlify(value);
      default:
        return value;
    }
  }

  private parseContractEvents(logs: any[]): any[] {
    const events: any[] = [];

    for (const log of logs) {
      try {
        // Basic event parsing - in production, you'd use the ABI to decode properly
        events.push({
          eventName: 'UnknownEvent', // Would be decoded from ABI
          data: log.data,
          topics: log.topics,
          address: log.address,
          blockNumber: parseInt(log.blockNumber, 16),
          txHash: log.transactionHash,
        });
      } catch (error) {
        console.warn('Failed to parse contract event:', error);
      }
    }

    return events;
  }

  async healthCheck(network: string = 'sei-testnet'): Promise<boolean> {
    try {
      const client = this.getRpcClient(network);
      return await client.healthCheck();
    } catch (error) {
      return false;
    }
  }
}

export default new SeiSmartContractCallHandler();
