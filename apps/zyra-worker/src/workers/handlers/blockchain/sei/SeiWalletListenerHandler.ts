import { z } from 'zod';
import { ethers } from 'ethers';
import { seiWalletListenerSchema } from '@zyra/types';
import { SeiRpcClient } from './services/SeiRpcClient';

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
 * Monitors wallet activities on Sei blockchain and triggers workflows
 */
export class SeiWalletListenerHandler {
  static readonly inputSchema = seiWalletListenerSchema.inputSchema;
  static readonly outputSchema = seiWalletListenerSchema.outputSchema;
  static readonly configSchema = seiWalletListenerSchema.configSchema;

  private lastProcessedBlock: Record<string, number> = {};
  private rpcClients: Map<string, SeiRpcClient> = new Map();

  /**
   * Main execution method
   */
  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    try {
      const config = this.validateAndExtractConfig(node, ctx);
      const inputs = this.validateInputs(
        ctx.inputs || {},
        ctx.previousOutputs || {},
        ctx,
      );

      const client = this.getRpcClient(config.network);
      const events = await this.pollForEvents(config, client);

      return {
        success: true,
        events,
        totalEvents: events.length,
        lastProcessedBlock: this.lastProcessedBlock[config.network],
        network: config.network,
        pollingTimestamp: new Date().toISOString(),
        nextPollTime: new Date(
          Date.now() + config.pollingInterval,
        ).toISOString(),
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        events: [],
        totalEvents: 0,
        network: node.config?.network || 'unknown',
        pollingTimestamp: new Date().toISOString(),
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Validate and extract configuration
   */
  private validateAndExtractConfig(
    node: any,
    ctx: BlockExecutionContext,
  ): z.infer<typeof seiWalletListenerSchema.configSchema> {
    if (!node.config) {
      throw new Error('Block configuration is missing');
    }

    try {
      return seiWalletListenerSchema.configSchema.parse(node.config);
    } catch (error) {
      throw new Error(`Configuration validation failed: ${error}`);
    }
  }

  /**
   * Validate inputs from previous blocks
   */
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
      };

      return seiWalletListenerSchema.inputSchema.parse(structuredInputs);
    } catch (error) {
      // Log validation error but don't fail execution for inputs
      console.warn('Input validation warning:', error);
      return inputs;
    }
  }

  /**
   * Get or create RPC client for network
   */
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

  /**
   * Poll blockchain for new events
   */
  private async pollForEvents(
    config: any,
    client: SeiRpcClient,
  ): Promise<any[]> {
    const events: any[] = [];

    try {
      const currentBlock = await client.getLatestBlockNumber();
      const fromBlock =
        this.lastProcessedBlock[config.network] || currentBlock - 100;
      const toBlock = currentBlock;

      if (fromBlock >= currentBlock) {
        return events; // No new blocks to process
      }

      // Process each wallet address
      for (const address of config.walletAddresses) {
        const walletEvents = await this.getEventsForAddress(
          client,
          address,
          config.eventTypes,
          fromBlock,
          toBlock,
          config.filters,
        );
        events.push(...walletEvents);
      }

      // Update last processed block
      this.lastProcessedBlock[config.network] = toBlock;

      // Apply limit if specified
      if (events.length > config.maxEventsPerPoll) {
        return events.slice(0, config.maxEventsPerPoll);
      }

      return events;
    } catch (error: any) {
      throw new Error(`Failed to poll for events: ${error.message}`);
    }
  }

  /**
   * Get events for a specific address
   */
  private async getEventsForAddress(
    client: SeiRpcClient,
    address: string,
    eventTypes: string[],
    fromBlock: number,
    toBlock: number,
    filters?: any,
  ): Promise<any[]> {
    const events: any[] = [];

    for (const eventType of eventTypes) {
      try {
        const eventData = await this.getEventsByType(
          client,
          address,
          eventType,
          fromBlock,
          toBlock,
          filters,
        );
        events.push(...eventData);
      } catch (error: any) {
        console.warn(
          `Failed to get ${eventType} events for ${address}:`,
          error.message,
        );
      }
    }

    return events;
  }

  /**
   * Get events by type
   */
  private async getEventsByType(
    client: SeiRpcClient,
    address: string,
    eventType: string,
    fromBlock: number,
    toBlock: number,
    filters?: any,
  ): Promise<any[]> {
    const events: any[] = [];

    switch (eventType) {
      case 'transfer':
        return await this.getTransferEvents(
          client,
          address,
          fromBlock,
          toBlock,
          filters,
        );

      case 'contract_call':
        return await this.getContractCallEvents(
          client,
          address,
          fromBlock,
          toBlock,
          filters,
        );

      case 'nft_transfer':
        return await this.getNftTransferEvents(
          client,
          address,
          fromBlock,
          toBlock,
          filters,
        );

      case 'swap':
        return await this.getSwapEvents(
          client,
          address,
          fromBlock,
          toBlock,
          filters,
        );

      default:
        console.warn(`Unsupported event type: ${eventType}`);
        return [];
    }
  }

  /**
   * Get transfer events (ERC20/native token transfers)
   */
  private async getTransferEvents(
    client: SeiRpcClient,
    address: string,
    fromBlock: number,
    toBlock: number,
    filters?: any,
  ): Promise<any[]> {
    const events: any[] = [];

    try {
      // ERC20 Transfer events
      const transferEventTopic = ethers.id('Transfer(address,address,uint256)');

      // Listen for transfers TO this address
      const toFilter = {
        fromBlock: ethers.toBeHex(fromBlock),
        toBlock: ethers.toBeHex(toBlock),
        topics: [
          transferEventTopic,
          null, // from (any)
          ethers.zeroPadValue(address, 32), // to (our address)
        ],
      };

      // Listen for transfers FROM this address
      const fromFilter = {
        fromBlock: ethers.toBeHex(fromBlock),
        toBlock: ethers.toBeHex(toBlock),
        topics: [
          transferEventTopic,
          ethers.zeroPadValue(address, 32), // from (our address)
          null, // to (any)
        ],
      };

      const [incomingLogs, outgoingLogs] = await Promise.all([
        client.getLogs(toFilter),
        client.getLogs(fromFilter),
      ]);

      // Process incoming transfers
      for (const log of incomingLogs) {
        const event = await this.parseTransferEvent(log, 'incoming', filters);
        if (event) events.push(event);
      }

      // Process outgoing transfers
      for (const log of outgoingLogs) {
        const event = await this.parseTransferEvent(log, 'outgoing', filters);
        if (event) events.push(event);
      }
    } catch (error: any) {
      console.error('Failed to get transfer events:', error);
    }

    return events;
  }

  /**
   * Parse transfer event log
   */
  private async parseTransferEvent(
    log: any,
    direction: 'incoming' | 'outgoing',
    filters?: any,
  ): Promise<any | null> {
    try {
      const fromAddress = ethers.getAddress('0x' + log.topics[1].slice(26));
      const toAddress = ethers.getAddress('0x' + log.topics[2].slice(26));
      const amount = Number(BigInt(log.data || '0x0'));

      // Apply filters
      if (filters?.minAmount && amount < filters.minAmount) {
        return null;
      }
      if (filters?.maxAmount && amount > filters.maxAmount) {
        return null;
      }
      if (
        filters?.contractAddress &&
        log.address.toLowerCase() !== filters.contractAddress.toLowerCase()
      ) {
        return null;
      }

      return {
        eventType: 'transfer',
        txHash: log.transactionHash,
        blockNumber: parseInt(log.blockNumber, 16),
        timestamp: new Date().toISOString(), // TODO: Get actual block timestamp
        fromAddress,
        toAddress,
        amount,
        tokenDenom: filters?.tokenDenom || 'usei',
        contractAddress: log.address,
        direction,
        data: {
          logIndex: log.logIndex,
          transactionIndex: log.transactionIndex,
        },
        rawEvent: log,
      };
    } catch (error: any) {
      console.error('Failed to parse transfer event:', error);
      return null;
    }
  }

  /**
   * Get contract call events
   */
  private async getContractCallEvents(
    client: SeiRpcClient,
    address: string,
    fromBlock: number,
    toBlock: number,
    filters?: any,
  ): Promise<any[]> {
    try {
      // Get contract interaction events
      const events: any[] = [];

      // Look for contract calls to the monitored address
      const logs = await client.getLogs({
        fromBlock: ethers.toBeHex(fromBlock),
        toBlock: ethers.toBeHex(toBlock),
        topics: [
          null, // Any event signature
          null, // Any from address
          ethers.zeroPadValue(address, 32), // To address
        ],
      });

      for (const log of logs) {
        // Parse contract call event
        const from = ethers.getAddress('0x' + log.topics[1]?.slice(26) || '0');
        const to = ethers.getAddress('0x' + log.topics[2]?.slice(26) || '0');

        events.push({
          eventType: 'contract_call',
          txHash: log.transactionHash,
          blockNumber: parseInt(log.blockNumber, 16),
          timestamp: new Date().toISOString(),
          fromAddress: from,
          toAddress: to,
          contractAddress: to,
          methodSignature: log.topics[0]?.slice(0, 10) || '',
          rawEvent: log,
          success: true,
        });
      }

      return events;
    } catch (error: any) {
      console.warn(`Failed to get contract call events: ${error.message}`);
      return [];
    }
  }

  /**
   * Get NFT transfer events
   */
  private async getNftTransferEvents(
    client: SeiRpcClient,
    address: string,
    fromBlock: number,
    toBlock: number,
    filters?: any,
  ): Promise<any[]> {
    try {
      // ERC721 Transfer event signature
      const transferEventTopic = ethers.id('Transfer(address,address,uint256)');

      const logs = await client.getLogs({
        fromBlock: ethers.toBeHex(fromBlock),
        toBlock: ethers.toBeHex(toBlock),
        topics: [
          transferEventTopic,
          null, // From address
          ethers.zeroPadValue(address, 32), // To address
        ],
      });

      const events: any[] = [];

      for (const log of logs) {
        const from = ethers.getAddress('0x' + log.topics[1]?.slice(26) || '0');
        const to = ethers.getAddress('0x' + log.topics[2]?.slice(26) || '0');
        const tokenId = BigInt(log.data);

        events.push({
          eventType: 'nft_transfer',
          txHash: log.transactionHash,
          blockNumber: parseInt(log.blockNumber, 16),
          timestamp: new Date().toISOString(),
          fromAddress: from,
          toAddress: to,
          tokenId: tokenId.toString(),
          contractAddress: log.address,
          rawEvent: log,
          success: true,
        });
      }

      return events;
    } catch (error: any) {
      console.warn(`Failed to get NFT transfer events: ${error.message}`);
      return [];
    }
  }

  /**
   * Get swap events
   */
  private async getSwapEvents(
    client: SeiRpcClient,
    address: string,
    fromBlock: number,
    toBlock: number,
    filters?: any,
  ): Promise<any[]> {
    try {
      // Common DEX swap event signatures
      const swapEventTopics = [
        ethers.id('Swap(address,uint256,uint256,uint256,uint256,address)'), // Uniswap V2
        ethers.id('Swap(address,address,int256,int256,uint160,uint128,int24)'), // Uniswap V3
        ethers.id('TokenPurchase(address,uint256,uint256)'), // Bancor
      ];

      const events: any[] = [];

      for (const topic of swapEventTopics) {
        const logs = await client.getLogs({
          fromBlock: ethers.toBeHex(fromBlock),
          toBlock: ethers.toBeHex(toBlock),
          topics: [topic],
        });

        for (const log of logs) {
          // Parse swap event (simplified)
          events.push({
            eventType: 'swap',
            txHash: log.transactionHash,
            blockNumber: parseInt(log.blockNumber, 16),
            timestamp: new Date().toISOString(),
            contractAddress: log.address,
            methodSignature: topic.slice(0, 10),
            rawEvent: log,
            success: true,
          });
        }
      }

      return events;
    } catch (error: any) {
      console.warn(`Failed to get swap events: ${error.message}`);
      return [];
    }
  }

  /**
   * Health check for the handler
   */
  async healthCheck(network: string = 'sei-testnet'): Promise<boolean> {
    try {
      const client = this.getRpcClient(network);
      return await client.healthCheck();
    } catch (error) {
      return false;
    }
  }
}

export default new SeiWalletListenerHandler();
