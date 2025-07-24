import { z } from 'zod';
import { seiWalletListenerSchema } from '@zyra/types';
import { SeiRpcClient } from './services/SeiRpcClient';

// Explicit type definitions to avoid Zod inference issues
interface SeiWalletListenerConfig {
  network: string;
  walletAddresses: string[];
  eventTypes: string[];
  minAmount?: number;
  tokenDenom?: string;
  startBlock?: number;
  pollingInterval: number;
}

interface SeiWalletListenerInput {
  data?: Record<string, any>;
  context?: {
    workflowId?: string;
    executionId?: string;
    userId?: string;
    timestamp: string;
  };
  variables?: Record<string, any>;
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
 * Sei Wallet Listener Handler
 * Monitors wallet addresses for blockchain events
 */
export class SeiWalletListenerHandler {
  static readonly inputSchema = seiWalletListenerSchema.inputSchema;
  static readonly outputSchema = seiWalletListenerSchema.outputSchema;
  static readonly configSchema = seiWalletListenerSchema.configSchema;

  private rpcClients: Map<string, SeiRpcClient> = new Map();
  private lastProcessedBlock: Record<string, number> = {};

  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    try {
      const config = this.validateAndExtractConfig(node, ctx);
      const inputs = this.validateInputs(
        ctx.inputs || {},
        ctx.previousOutputs || {},
        ctx,
      );

      const client = this.getRpcClient(config.network);

      // Get current block and last processed block
      const currentBlock = await client.getLatestBlockNumber();
      const lastProcessed =
        this.lastProcessedBlock[config.network] ||
        config.startBlock ||
        currentBlock - 100;

      // Get events from last processed block to current
      const events = await this.pollForEvents(config, client);

      // Update last processed block
      this.lastProcessedBlock[config.network] = currentBlock;

      // Schedule next execution
      const nextExecution = new Date(Date.now() + config.pollingInterval);

      return {
        success: true,
        events: events,
        currentBlock: currentBlock,
        lastProcessedBlock: lastProcessed,
        network: config.network,
        nextExecution: nextExecution.toISOString(),
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
  ): SeiWalletListenerConfig {
    if (!node.config) {
      throw new Error('Block configuration is missing');
    }

    try {
      const result = seiWalletListenerSchema.configSchema.safeParse(node.config);
      if (!result.success) {
        throw new Error(`Configuration validation failed: ${result.error.message}`);
      }
      return result.data as SeiWalletListenerConfig;
    } catch (error) {
      throw new Error(`Configuration validation failed: ${error}`);
    }
  }

  private validateInputs(
    inputs: Record<string, any>,
    previousOutputs: Record<string, any>,
    ctx: BlockExecutionContext,
  ): SeiWalletListenerInput {
    try {
      const result = seiWalletListenerSchema.inputSchema.safeParse({
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
      return result.data as SeiWalletListenerInput;
    } catch (error) {
      throw new Error(`Input validation failed: ${error}`);
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

  private async pollForEvents(
    config: SeiWalletListenerConfig,
    client: SeiRpcClient,
  ): Promise<any[]> {
    // Simulate event polling
    const events: any[] = [];

    // In a real implementation, this would:
    // 1. Get logs from the blockchain
    // 2. Filter by wallet addresses and event types
    // 3. Return the filtered events

    // For now, return a mock event
    if (config.walletAddresses.length > 0 && config.eventTypes.length > 0) {
      events.push({
        eventType: config.eventTypes[0],
        network: config.network,
        walletAddress: config.walletAddresses[0],
        amount: config.minAmount || 0,
        tokenDenom: config.tokenDenom || 'usei',
        blockNumber: config.startBlock || 0,
        timestamp: new Date().toISOString(),
        txHash: '0x' + Math.random().toString(16).substr(2, 64),
      });
    }

    return events;
  }
}
