import { z } from 'zod';
import { seiWalletListenerSchema } from '@zyra/types';
import { SeiRpcClient } from './services/SeiRpcClient';
import { ethers } from 'ethers';

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
        totalEvents: events.length,
        lastProcessedBlock: lastProcessed,
        network: config.network,
        pollingTimestamp: new Date().toISOString(),
        nextPollTime: nextExecution.toISOString(),
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        events: [],
        totalEvents: 0,
        lastProcessedBlock: undefined,
        network: node.data?.config?.network || 'sei-testnet',
        pollingTimestamp: new Date().toISOString(),
        nextPollTime: undefined,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  private validateAndExtractConfig(
    node: any,
    ctx: BlockExecutionContext,
  ): SeiWalletListenerConfig {
    if (!node.data?.config) {
      throw new Error('Block configuration is missing');
    }

    try {
      const result = seiWalletListenerSchema.configSchema.safeParse(
        node.data.config,
      );
      if (!result.success) {
        throw new Error(
          `Configuration validation failed: ${result.error.message}`,
        );
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
    const events: any[] = [];

    try {
      // Get current block and last processed block
      const currentBlock = await client.getLatestBlockNumber();
      const lastProcessed =
        this.lastProcessedBlock[config.network] ||
        config.startBlock ||
        currentBlock - 100;

      // Only process if we have new blocks to check
      if (currentBlock <= lastProcessed) {
        return events;
      }

      // Process each wallet address
      for (const walletAddress of config.walletAddresses) {
        // Get logs for this wallet address
        const logs = await this.getWalletLogs(
          client,
          walletAddress,
          lastProcessed,
          currentBlock,
          config,
        );

        // Process each log into events
        for (const log of logs) {
          const event = await this.processLogIntoEvent(
            log,
            walletAddress,
            config,
          );
          if (event) {
            events.push(event);
          }
        }
      }

      // Update last processed block
      this.lastProcessedBlock[config.network] = currentBlock;
    } catch (error) {
      console.error('Error polling for events:', error);
      // Return empty events array on error, don't throw
    }

    return events;
  }

  private async getWalletLogs(
    client: SeiRpcClient,
    walletAddress: string,
    fromBlock: number,
    toBlock: number,
    config: SeiWalletListenerConfig,
  ): Promise<any[]> {
    const logs: any[] = [];

    try {
      // Get transfer events (ERC20 Transfer event signature)
      const transferTopic = ethers.id('Transfer(address,address,uint256)');

      // Filter for transfers involving this wallet address
      const filter = {
        fromBlock: ethers.toBeHex(fromBlock),
        toBlock: ethers.toBeHex(toBlock),
        topics: [
          transferTopic,
          null, // from address (any)
          ethers.zeroPadValue(walletAddress, 32), // to address (our wallet)
        ],
      };

      const transferLogs = await client.getLogs(filter);
      logs.push(...transferLogs);

      // Also get logs where this wallet is the sender
      const filterFrom = {
        fromBlock: ethers.toBeHex(fromBlock),
        toBlock: ethers.toBeHex(toBlock),
        topics: [
          transferTopic,
          ethers.zeroPadValue(walletAddress, 32), // from address (our wallet)
          null, // to address (any)
        ],
      };

      const transferFromLogs = await client.getLogs(filterFrom);
      logs.push(...transferFromLogs);

      // Get NFT transfer events if configured
      if (
        config.eventTypes.includes('nft_mint') ||
        config.eventTypes.includes('nft_transfer')
      ) {
        const nftTransferTopic = ethers.id('Transfer(address,address,uint256)');

        // Filter for NFT transfers involving this wallet
        const nftFilter = {
          fromBlock: ethers.toBeHex(fromBlock),
          toBlock: ethers.toBeHex(toBlock),
          topics: [
            nftTransferTopic,
            null, // from address (any)
            ethers.zeroPadValue(walletAddress, 32), // to address (our wallet)
          ],
        };

        const nftLogs = await client.getLogs(nftFilter);
        logs.push(...nftLogs);
      }
    } catch (error) {
      console.error('Error getting wallet logs:', error);
    }

    return logs;
  }

  private async processLogIntoEvent(
    log: any,
    walletAddress: string,
    config: SeiWalletListenerConfig,
  ): Promise<any | null> {
    try {
      // Get transaction receipt for additional details
      const receipt = await this.getRpcClient(
        config.network,
      ).getTransactionReceipt(log.transactionHash);

      if (!receipt) {
        return null;
      }

      // Parse the log data
      const eventType = this.determineEventType(log, config);

      if (!config.eventTypes.includes(eventType)) {
        return null;
      }

      // Extract addresses from topics
      const fromAddress = ethers.getAddress('0x' + log.topics[1].slice(26));
      const toAddress = ethers.getAddress('0x' + log.topics[2].slice(26));

      // Extract amount from data
      const amount = ethers.formatEther(log.data);

      // Get block details
      const block = await this.getRpcClient(config.network).getBlock(
        receipt.blockNumber,
      );

      return {
        eventType,
        txHash: log.transactionHash,
        blockNumber: parseInt(receipt.blockNumber, 16),
        timestamp: new Date().toISOString(), // Note: Would need to get from block timestamp
        fromAddress,
        toAddress,
        amount: parseFloat(amount),
        tokenDenom: 'usei', // Default, could be determined from contract address
        contractAddress: log.address,
        data: {
          logIndex: log.logIndex,
          transactionIndex: log.transactionIndex,
          gasUsed: receipt.gasUsed,
        },
        rawEvent: {
          network: config.network,
          walletAddress,
          eventType,
          blockHash: log.blockHash,
          topics: log.topics,
          data: log.data,
        },
      };
    } catch (error) {
      console.error('Error processing log into event:', error);
      return null;
    }
  }

  private determineEventType(
    log: any,
    config: SeiWalletListenerConfig,
  ): string {
    // Determine event type based on log topics and configuration
    const transferTopic = ethers.id('Transfer(address,address,uint256)');

    if (log.topics[0] === transferTopic) {
      // Check if this is an NFT transfer (usually to address 0x0 for minting)
      const toAddress = ethers.getAddress('0x' + log.topics[2].slice(26));
      if (toAddress === ethers.ZeroAddress) {
        return 'nft_mint';
      } else {
        return 'transfer';
      }
    }

    return 'transfer'; // Default
  }
}
