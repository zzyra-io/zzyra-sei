import { z } from 'zod';
import { seiWalletListenerSchema, BlockExecutionContext } from '@zyra/types';
import { ethers } from 'ethers';
import { ExecutionLogger } from '../../../execution-logger';

// Event types for Sei blockchain
enum EventType {
  TOKEN_TRANSFER = 'token_transfer',
  NFT_TRANSFER = 'nft_transfer',
  NFT_MINT = 'nft_mint',
  NATIVE_TRANSFER = 'native_transfer',
  CONTRACT_INTERACTION = 'contract_interaction',
}

// Enhanced configuration interface
interface SeiWalletListenerConfig {
  network: 'sei-mainnet' | 'sei-testnet';
  walletAddresses: string[];
  eventTypes: string[];
  startBlock?: number;
  filters?: {
    minAmount?: string;
    maxAmount?: string;
    tokenContracts?: string[];
    excludeAddresses?: string[];
    tokenDenom?: string;
    limit?: number;
  };
  pollingInterval: number;
  maxEventsPerPoll?: number;
  includeRawEvents?: boolean;
  notifications?: {
    webhookUrl?: string;
    emailAlerts?: boolean;
  };
}

// Enriched event interface
interface EnrichedEvent {
  eventType: string;
  txHash: string;
  blockNumber: number;
  timestamp: number;
  fromAddress: string;
  toAddress: string;
  amount: string;
  tokenSymbol?: string;
  tokenDecimals?: number;
  contractAddress?: string;
  gasUsed: number;
  gasPrice: string;
  status: 'success' | 'failed';
  confirmations: number;
  network: string;
  walletAddress: string;
  rawEvent: any;
}

// Synthetic log interface for native transfers
interface SyntheticLog {
  address: string;
  topics: string[];
  data: string;
  blockNumber: number;
  transactionHash: string;
  removed: boolean;
}

// State management interface
interface WalletListenerState {
  lastProcessedBlocks: Map<string, number>;
  retryCounts: Map<string, number>;
  totalEventsProcessed: number;
  lastExecutionTime: string;
  consecutiveFailures: number;
  networkStatus: 'initializing' | 'healthy' | 'degraded' | 'failed' | 'unknown';
}

/**
 * Sei Wallet Listener Handler
 * Monitors wallet addresses for blockchain events using ethers.js
 */
export class SeiWalletListenerHandler {
  static readonly inputSchema = seiWalletListenerSchema.inputSchema;
  static readonly outputSchema = seiWalletListenerSchema.outputSchema;
  static readonly configSchema = seiWalletListenerSchema.configSchema;

  private providers: Map<string, ethers.JsonRpcProvider> = new Map();

  constructor(private readonly executionLogger?: ExecutionLogger) {}

  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    const executionId = ctx.executionId;
    const nodeId = ctx.nodeId;

    try {
      await this.logStep(
        executionId,
        nodeId,
        'info',
        'Starting Sei wallet listener execution',
      );

      const config = this.validateAndExtractConfig(node, ctx);
      const inputs = this.validateInputs(
        ctx.inputs || {},
        ctx.previousOutputs || {},
        ctx,
      );

      await this.logStep(
        executionId,
        nodeId,
        'info',
        'Configuration loaded successfully',
        {
          network: config.network,
          walletCount: config.walletAddresses.length,
          eventTypes: config.eventTypes,
          pollingInterval: config.pollingInterval,
        },
      );

      // Initialize state from previous outputs or create new state
      const state = this.initializeState(ctx.previousOutputs, config);
      await this.logStep(
        executionId,
        nodeId,
        'info',
        'State initialized from previous execution',
      );

      let events: EnrichedEvent[] = [];

      try {
        const provider = this.getProvider(config.network);
        await this.logStep(
          executionId,
          nodeId,
          'info',
          'Provider created successfully',
          {
            network: config.network,
            rpcUrl: this.getRpcUrl(config.network),
          },
        );

        // Add timeout to prevent hanging
        events = await Promise.race([
          this.monitorWallets(config, provider, state, executionId, nodeId),
          new Promise<EnrichedEvent[]>((_, reject) =>
            setTimeout(
              () =>
                reject(new Error('Wallet monitoring timeout after 30 seconds')),
              30000,
            ),
          ),
        ]);

        await this.logStep(
          executionId,
          nodeId,
          'info',
          'Wallet monitoring completed',
          {
            totalEvents: events.length,
            eventsFound: events.length > 0,
          },
        );
      } catch (error) {
        await this.logStep(
          executionId,
          nodeId,
          'error',
          'RPC monitoring failed, returning empty result',
          {
            error: error instanceof Error ? error.message : String(error),
          },
        );
        // Return empty events instead of failing completely
        events = [];
      }

      // Update state with current execution results
      const updatedState = this.updateState(state, events, config);

      // Schedule next execution
      const nextExecution = new Date(Date.now() + config.pollingInterval);

      const result = {
        success: true,
        events: events,
        totalEvents: events.length,
        state: updatedState,
        network: config.network,
        pollingTimestamp: new Date().toISOString(),
        nextPollTime: nextExecution.toISOString(),
        timestamp: new Date().toISOString(),
        workflowId: ctx.workflowId,
        executionId: ctx.executionId,
        userId: ctx.userId,
      };

      await this.logStep(
        executionId,
        nodeId,
        'info',
        'Execution completed successfully',
        {
          totalEvents: events.length,
          network: config.network,
          nextPollTime: nextExecution.toISOString(),
        },
      );

      return result;
    } catch (error: any) {
      await this.logStep(executionId, nodeId, 'error', 'Execution failed', {
        error: error.message,
        stack: error.stack,
      });

      return {
        success: false,
        events: [],
        totalEvents: 0,
        state: {},
        network: node.data?.config?.network || 'sei-testnet',
        pollingTimestamp: new Date().toISOString(),
        nextPollTime: undefined,
        error: error.message,
        timestamp: new Date().toISOString(),
        workflowId: ctx.workflowId,
        executionId: ctx.executionId,
        userId: ctx.userId,
      };
    }
  }

  private async logStep(
    executionId: string,
    nodeId: string,
    level: 'info' | 'error' | 'warn',
    message: string,
    metadata?: any,
  ): Promise<void> {
    if (this.executionLogger) {
      await this.executionLogger.logExecutionEvent(executionId, {
        level,
        message,
        node_id: nodeId,
        data: metadata,
      });
    }
    // Also log to console for debugging
    console.log(`[${level.toUpperCase()}] ${message}`, metadata || '');
  }

  private initializeState(
    previousOutputs: Record<string, any> | undefined,
    config: SeiWalletListenerConfig,
  ): WalletListenerState {
    if (previousOutputs?.state) {
      // Resume from previous state
      const previousState = previousOutputs.state as WalletListenerState;

      // Validate and restore state
      return {
        lastProcessedBlocks: new Map(previousState.lastProcessedBlocks || []),
        retryCounts: new Map(previousState.retryCounts || []),
        totalEventsProcessed: previousState.totalEventsProcessed || 0,
        lastExecutionTime:
          previousState.lastExecutionTime || new Date().toISOString(),
        consecutiveFailures: previousState.consecutiveFailures || 0,
        networkStatus: previousState.networkStatus || 'unknown',
      };
    }

    // Initialize new state
    const initialState: WalletListenerState = {
      lastProcessedBlocks: new Map(),
      retryCounts: new Map(),
      totalEventsProcessed: 0,
      lastExecutionTime: new Date().toISOString(),
      consecutiveFailures: 0,
      networkStatus: 'initializing',
    };

    // Initialize last processed blocks for each wallet
    for (const walletAddress of config.walletAddresses) {
      const key = `${walletAddress}`;
      if (!initialState.lastProcessedBlocks.has(key)) {
        initialState.lastProcessedBlocks.set(key, config.startBlock || 0);
      }
    }

    return initialState;
  }

  private updateState(
    state: WalletListenerState,
    events: EnrichedEvent[],
    config: SeiWalletListenerConfig,
  ): WalletListenerState {
    return {
      lastProcessedBlocks: state.lastProcessedBlocks,
      retryCounts: state.retryCounts,
      totalEventsProcessed: state.totalEventsProcessed + events.length,
      lastExecutionTime: new Date().toISOString(),
      consecutiveFailures:
        events.length > 0 ? 0 : state.consecutiveFailures + 1,
      networkStatus: 'healthy',
    };
  }

  private getProvider(network: string): ethers.JsonRpcProvider {
    if (!this.providers.has(network)) {
      const rpcUrl = this.getRpcUrl(network);
      console.log('SeiWalletListener: Creating provider for URL:', rpcUrl);

      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);

        // Configure provider with reasonable timeouts
        // Note: ethers v6 doesn't expose connection directly, so we'll rely on defaults

        this.providers.set(network, provider);
        console.log('SeiWalletListener: Provider created successfully');
      } catch (error) {
        console.error('SeiWalletListener: Failed to create provider:', error);
        throw new Error(
          `Failed to create RPC provider for network ${network}: ${error}`,
        );
      }
    }
    return this.providers.get(network)!;
  }

  private getRpcUrl(network: string): string {
    if (network === 'sei-mainnet') {
      return (
        process.env.SEI_MAINNET_RPC_URL ||
        'https://evm-rpc-mainnet.sei-apis.com'
      );
    } else {
      return process.env.SEI_TESTNET_RPC_URL || 'https://evm-rpc.sei-apis.com';
    }
  }

  private async monitorWallets(
    config: SeiWalletListenerConfig,
    provider: ethers.JsonRpcProvider,
    state: WalletListenerState,
    executionId: string,
    nodeId: string,
  ): Promise<EnrichedEvent[]> {
    const events: EnrichedEvent[] = [];

    try {
      await this.logStep(executionId, nodeId, 'info', 'Getting current block');
      const currentBlock = await this.getCurrentBlockWithRetry(
        provider,
        executionId,
        nodeId,
      );
      await this.logStep(
        executionId,
        nodeId,
        'info',
        'Current block retrieved',
        {
          currentBlock,
        },
      );

      for (const walletAddress of config.walletAddresses) {
        try {
          await this.logStep(
            executionId,
            nodeId,
            'info',
            'Processing wallet:',
            {
              walletAddress,
            },
          );
          const walletEvents = await this.processWalletEvents(
            walletAddress,
            config,
            provider,
            currentBlock,
            state,
            executionId,
            nodeId,
          );
          events.push(...walletEvents);
          await this.logStep(executionId, nodeId, 'info', 'Wallet processed', {
            walletAddress,
            eventsFound: walletEvents.length,
          });
        } catch (error) {
          await this.logStep(
            executionId,
            nodeId,
            'error',
            `Error processing wallet ${walletAddress}:`,
            {
              walletAddress,
              error: error instanceof Error ? error.message : String(error),
            },
          );
          // Increment retry count for this wallet
          const retryKey = `${walletAddress}`;
          const currentRetries = state.retryCounts.get(retryKey) || 0;
          state.retryCounts.set(retryKey, currentRetries + 1);
          // Continue with other wallets even if one fails
        }
      }
    } catch (error) {
      await this.logStep(
        executionId,
        nodeId,
        'error',
        'Error in monitorWallets:',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }

    return events;
  }

  private async processWalletEvents(
    walletAddress: string,
    config: SeiWalletListenerConfig,
    provider: ethers.JsonRpcProvider,
    currentBlock: number,
    state: WalletListenerState,
    executionId: string,
    nodeId: string,
  ): Promise<EnrichedEvent[]> {
    const events: EnrichedEvent[] = [];
    const lastProcessed = this.getLastProcessedBlock(walletAddress, state);

    if (currentBlock <= lastProcessed) {
      await this.logStep(
        executionId,
        nodeId,
        'info',
        `No new blocks to process for wallet ${walletAddress}`,
      );
      return events;
    }

    // Process in batches to avoid overwhelming the RPC
    const batchSize = config.maxEventsPerPoll || 10;
    const fromBlock = lastProcessed + 1;
    const toBlock = Math.min(fromBlock + batchSize - 1, currentBlock);

    await this.logStep(
      executionId,
      nodeId,
      'info',
      `Processing blocks ${fromBlock} to ${toBlock} for wallet ${walletAddress}`,
    );

    try {
      const logs = await this.getWalletLogs(
        walletAddress,
        fromBlock,
        toBlock,
        config,
        provider,
        executionId,
        nodeId,
      );

      await this.logStep(
        executionId,
        nodeId,
        'info',
        `Found ${logs.length} logs for wallet ${walletAddress}`,
      );

      for (const log of logs) {
        try {
          const event = await this.parseEvent(
            log,
            config,
            provider,
            executionId,
            nodeId,
          );
          if (event && this.validateEvent(event, config)) {
            const enrichedEvent = await this.enrichEvent(
              event,
              provider,
              executionId,
              nodeId,
            );
            events.push(enrichedEvent);
          }
        } catch (error) {
          await this.logStep(
            executionId,
            nodeId,
            'error',
            'Error parsing event:',
            {
              error: error instanceof Error ? error.message : String(error),
            },
          );
          // Continue processing other events
        }
      }

      // Update last processed block in state
      this.updateLastProcessedBlock(walletAddress, toBlock, state);
    } catch (error) {
      await this.logStep(
        executionId,
        nodeId,
        'error',
        `Error getting logs for wallet ${walletAddress}:`,
        {
          walletAddress,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      // Don't throw, just return empty events
    }

    return events;
  }

  private async getWalletLogs(
    walletAddress: string,
    fromBlock: number,
    toBlock: number,
    config: SeiWalletListenerConfig,
    provider: ethers.JsonRpcProvider,
    executionId: string,
    nodeId: string,
  ): Promise<(ethers.Log | SyntheticLog)[]> {
    const logs: (ethers.Log | SyntheticLog)[] = [];

    try {
      await this.logStep(
        executionId,
        nodeId,
        'info',
        'Fetching wallet logs from blockchain',
        {
          walletAddress,
          fromBlock,
          toBlock,
          eventTypes: config.eventTypes,
        },
      );

      // Get ERC20 and NFT transfer logs
      if (
        config.eventTypes.includes('transfer') ||
        config.eventTypes.includes('nft_transfer')
      ) {
        await this.logStep(
          executionId,
          nodeId,
          'info',
          'Fetching ERC20/NFT transfer logs',
        );

        const transferFilter = {
          fromBlock,
          toBlock,
          topics: [
            ethers.id('Transfer(address,address,uint256)'), // ERC20 Transfer
            null, // from address (any)
            ethers.zeroPadValue(walletAddress, 32), // to address (our wallet)
          ],
        };

        const transferLogs = await provider.getLogs(transferFilter);
        logs.push(...transferLogs);

        await this.logStep(
          executionId,
          nodeId,
          'info',
          'ERC20/NFT transfer logs fetched',
          {
            transferLogsCount: transferLogs.length,
          },
        );

        // Also check for outgoing transfers
        const outgoingFilter = {
          fromBlock,
          toBlock,
          topics: [
            ethers.id('Transfer(address,address,uint256)'),
            ethers.zeroPadValue(walletAddress, 32), // from address (our wallet)
            null, // to address (any)
          ],
        };

        const outgoingLogs = await provider.getLogs(outgoingFilter);
        logs.push(...outgoingLogs);

        await this.logStep(
          executionId,
          nodeId,
          'info',
          'Outgoing transfer logs fetched',
          {
            outgoingLogsCount: outgoingLogs.length,
          },
        );
      }

      // Get NFT mint logs
      if (config.eventTypes.includes('nft_mint')) {
        await this.logStep(
          executionId,
          nodeId,
          'info',
          'Fetching NFT mint logs',
        );

        const mintFilter = {
          fromBlock,
          toBlock,
          topics: [
            ethers.id('Transfer(address,address,uint256)'),
            ethers.zeroPadValue(ethers.ZeroAddress, 32), // from zero address (mint)
            ethers.zeroPadValue(walletAddress, 32), // to address (our wallet)
          ],
        };

        const mintLogs = await provider.getLogs(mintFilter);
        logs.push(...mintLogs);

        await this.logStep(
          executionId,
          nodeId,
          'info',
          'NFT mint logs fetched',
          {
            mintLogsCount: mintLogs.length,
          },
        );
      }

      // Get native transfer logs
      if (config.eventTypes.includes('native_transfer')) {
        await this.logStep(
          executionId,
          nodeId,
          'info',
          'Fetching native transfer logs',
        );

        const nativeLogs = await this.getNativeTransferLogs(
          walletAddress,
          fromBlock,
          toBlock,
          provider,
          executionId,
          nodeId,
        );
        logs.push(...nativeLogs);

        await this.logStep(
          executionId,
          nodeId,
          'info',
          'Native transfer logs fetched',
          {
            nativeLogsCount: nativeLogs.length,
          },
        );
      }

      await this.logStep(
        executionId,
        nodeId,
        'info',
        'All wallet logs fetched successfully',
        {
          totalLogs: logs.length,
          walletAddress,
          blockRange: `${fromBlock}-${toBlock}`,
        },
      );
    } catch (error) {
      await this.logStep(
        executionId,
        nodeId,
        'error',
        'Error getting wallet logs',
        {
          walletAddress,
          fromBlock,
          toBlock,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      throw error;
    }

    return logs;
  }

  private async getNativeTransferLogs(
    walletAddress: string,
    fromBlock: number,
    toBlock: number,
    provider: ethers.JsonRpcProvider,
    executionId: string,
    nodeId: string,
  ): Promise<SyntheticLog[]> {
    // For native transfers, we need to get transactions and check if they involve our wallet
    const logs: SyntheticLog[] = [];

    try {
      await this.logStep(
        executionId,
        nodeId,
        'info',
        'Processing native transfers',
        {
          walletAddress,
          fromBlock,
          toBlock,
        },
      );

      // Process blocks in batches to avoid overwhelming the RPC
      const batchSize = 10;
      for (
        let blockNum = fromBlock;
        blockNum <= toBlock;
        blockNum += batchSize
      ) {
        const endBlock = Math.min(blockNum + batchSize - 1, toBlock);

        await this.logStep(
          executionId,
          nodeId,
          'info',
          `Processing native transfers for blocks ${blockNum}-${endBlock}`,
        );

        for (let i = blockNum; i <= endBlock; i++) {
          try {
            const block = await provider.getBlock(i, true);
            if (!block) continue;

            for (const tx of block.transactions) {
              if (!tx || typeof tx !== 'object') continue;
              const transaction = tx as any; // Use type assertion to bypass strictness
              if (
                transaction &&
                typeof transaction.from === 'string' &&
                typeof transaction.to === 'string' &&
                typeof transaction.hash === 'string' &&
                transaction.value !== undefined
              ) {
                // Check if this transaction involves our wallet
                if (
                  transaction.from.toLowerCase() ===
                    walletAddress.toLowerCase() ||
                  transaction.to?.toLowerCase() === walletAddress.toLowerCase()
                ) {
                  // Create a synthetic log for native transfer
                  const syntheticLog: SyntheticLog = {
                    address: transaction.to || ethers.ZeroAddress,
                    topics: [
                      ethers.id('NativeTransfer(address,address,uint256)'),
                      ethers.zeroPadValue(transaction.from, 32),
                      ethers.zeroPadValue(
                        transaction.to || ethers.ZeroAddress,
                        32,
                      ),
                    ],
                    data: ethers.zeroPadValue(transaction.value, 32),
                    blockNumber: i,
                    transactionHash: transaction.hash,
                    removed: false,
                  };

                  logs.push(syntheticLog);

                  await this.logStep(
                    executionId,
                    nodeId,
                    'info',
                    'Native transfer found',
                    {
                      txHash: transaction.hash,
                      from: transaction.from,
                      to: transaction.to,
                      value: transaction.value.toString(),
                      blockNumber: i,
                    },
                  );
                }
              }
            }
          } catch (error) {
            await this.logStep(
              executionId,
              nodeId,
              'error',
              'Error processing block for native transfers',
              {
                blockNumber: i,
                error: error instanceof Error ? error.message : String(error),
              },
            );
          }
        }
      }

      await this.logStep(
        executionId,
        nodeId,
        'info',
        'Native transfer processing completed',
        {
          totalNativeTransfers: logs.length,
          walletAddress,
        },
      );
    } catch (error) {
      await this.logStep(
        executionId,
        nodeId,
        'error',
        'Error getting native transfer logs',
        {
          walletAddress,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }

    return logs;
  }

  private async parseEvent(
    log: ethers.Log | SyntheticLog,
    config: SeiWalletListenerConfig,
    provider: ethers.JsonRpcProvider,
    executionId: string,
    nodeId: string,
  ): Promise<EnrichedEvent | null> {
    try {
      const transferTopic = ethers.id('Transfer(address,address,uint256)');

      if (log.topics[0] !== transferTopic) {
        return null;
      }

      // Parse addresses from topics
      const fromAddress = ethers.getAddress('0x' + log.topics[1].slice(26));
      const toAddress = ethers.getAddress('0x' + log.topics[2].slice(26));

      // Parse amount from data
      const amount = ethers.formatEther(log.data);

      // Determine event type
      const eventType = this.determineEventType(log, config.walletAddresses[0]); // Pass a dummy wallet address for now

      // Get transaction receipt for additional details
      const receipt = await provider.getTransactionReceipt(log.transactionHash);
      const block = await provider.getBlock(log.blockNumber);

      return {
        eventType,
        txHash: log.transactionHash,
        blockNumber: log.blockNumber,
        timestamp: block?.timestamp ? block.timestamp * 1000 : Date.now(),
        fromAddress,
        toAddress,
        amount,
        contractAddress: log.address,
        gasUsed: Number(receipt?.gasUsed || 0n),
        gasPrice: receipt?.gasPrice?.toString() || '0',
        status: receipt?.status === 1 ? 'success' : 'failed',
        confirmations: 0, // Will be calculated later
        network: config.network,
        walletAddress: log.address, // Assuming log.address is the wallet address for synthetic logs
        rawEvent: log,
      };
    } catch (error) {
      await this.logStep(executionId, nodeId, 'error', 'Error parsing event:', {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  private determineEventType(
    log: ethers.Log | SyntheticLog,
    walletAddress: string,
  ): string {
    // Check if it's a native transfer (synthetic log)
    if (
      'topics' in log &&
      log.topics[0] === ethers.id('NativeTransfer(address,address,uint256)')
    ) {
      return 'native_transfer';
    }

    // Check for ERC20/NFT transfers
    if (
      'topics' in log &&
      log.topics[0] === ethers.id('Transfer(address,address,uint256)')
    ) {
      // Check if it's a mint (from zero address)
      if (log.topics[1] === ethers.zeroPadValue(ethers.ZeroAddress, 32)) {
        return 'nft_mint';
      }
      return 'transfer';
    }

    return 'contract_interaction';
  }

  private validateEvent(
    event: EnrichedEvent,
    config: SeiWalletListenerConfig,
  ): boolean {
    // Check if event type is in configured types
    if (!config.eventTypes.includes(event.eventType)) {
      return false;
    }

    // Check amount filters
    if (config.filters?.minAmount) {
      const minAmount = ethers.parseEther(config.filters.minAmount);
      if (ethers.parseEther(event.amount) < minAmount) {
        return false;
      }
    }

    if (config.filters?.maxAmount) {
      const maxAmount = ethers.parseEther(config.filters.maxAmount);
      if (ethers.parseEther(event.amount) > maxAmount) {
        return false;
      }
    }

    // Check token contract filters
    if (config.filters?.tokenContracts && event.contractAddress) {
      if (!config.filters.tokenContracts.includes(event.contractAddress)) {
        return false;
      }
    }

    // Check exclude addresses
    if (config.filters?.excludeAddresses) {
      if (
        config.filters.excludeAddresses.includes(event.fromAddress) ||
        config.filters.excludeAddresses.includes(event.toAddress)
      ) {
        return false;
      }
    }

    return true;
  }

  private async enrichEvent(
    event: EnrichedEvent,
    provider: ethers.JsonRpcProvider,
    executionId: string,
    nodeId: string,
  ): Promise<EnrichedEvent> {
    try {
      // Get transaction receipt for additional details
      const receipt = await provider.getTransactionReceipt(event.txHash);
      if (receipt) {
        event.gasUsed = Number(receipt.gasUsed || 0n);
        event.gasPrice = receipt.gasPrice?.toString() || '0';
        event.status = receipt.status === 1 ? 'success' : 'failed';
      }

      // Get current block for confirmations
      const currentBlock = await provider.getBlockNumber();
      event.confirmations = currentBlock - event.blockNumber;

      // Get token info for ERC20 transfers
      if (event.contractAddress && event.eventType === 'transfer') {
        const tokenInfo = await this.getTokenInfo(
          event.contractAddress,
          provider,
          executionId,
          nodeId,
        );
        if (tokenInfo) {
          event.tokenSymbol = tokenInfo.symbol;
          event.tokenDecimals = tokenInfo.decimals;
        }
      }

      return event;
    } catch (error) {
      await this.logStep(
        executionId,
        nodeId,
        'error',
        'Error enriching event',
        {
          error: error instanceof Error ? error.message : String(error),
        },
      );
      return event;
    }
  }

  private async getTokenInfo(
    contractAddress: string,
    provider: ethers.JsonRpcProvider,
    executionId: string,
    nodeId: string,
  ): Promise<{ symbol: string; decimals: number } | null> {
    try {
      const contract = new ethers.Contract(
        contractAddress,
        [
          'function symbol() view returns (string)',
          'function decimals() view returns (uint8)',
        ],
        provider,
      );

      const [symbol, decimals] = await Promise.all([
        contract.symbol(),
        contract.decimals(),
      ]);

      return { symbol, decimals };
    } catch (error) {
      await this.logStep(
        executionId,
        nodeId,
        'error',
        'Error getting token info:',
        {
          contractAddress,
          error: error instanceof Error ? error.message : String(error),
        },
      );
      return null;
    }
  }

  private getLastProcessedBlock(
    walletAddress: string,
    state: WalletListenerState,
  ): number {
    return state.lastProcessedBlocks.get(walletAddress) || 0;
  }

  private updateLastProcessedBlock(
    walletAddress: string,
    blockNumber: number,
    state: WalletListenerState,
  ): void {
    state.lastProcessedBlocks.set(walletAddress, blockNumber);
  }

  private async getCurrentBlockWithRetry(
    provider: ethers.JsonRpcProvider,
    executionId: string,
    nodeId: string,
  ): Promise<number> {
    const maxRetries = 3;
    const baseDelay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.logStep(
          executionId,
          nodeId,
          'info',
          `Getting block number, attempt ${attempt}/${maxRetries}`,
        );
        const blockNumber = await provider.getBlockNumber();
        await this.logStep(
          executionId,
          nodeId,
          'info',
          'Block number retrieved successfully',
          { blockNumber },
        );
        return blockNumber;
      } catch (error) {
        await this.logStep(
          executionId,
          nodeId,
          'error',
          `Failed to get block number on attempt ${attempt}`,
          {
            attempt,
            maxRetries,
            error: error instanceof Error ? error.message : String(error),
          },
        );

        if (attempt === maxRetries) {
          throw new Error(
            `Failed to get current block after ${maxRetries} attempts`,
          );
        }

        const delay = baseDelay * Math.pow(2, attempt - 1);
        await this.logStep(
          executionId,
          nodeId,
          'info',
          `Retrying in ${delay}ms`,
        );
        await this.delay(delay);
      }
    }

    throw new Error('Failed to get current block');
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
  ): Record<string, any> {
    // For wallet listener, inputs are typically empty or minimal
    // We don't need strict validation here since the config comes from the node data

    // Merge with previous outputs if available
    const mergedInputs = {
      ...inputs,
      ...previousOutputs,
      // Add context information
      executionId: ctx.executionId,
      workflowId: ctx.workflowId,
      userId: ctx.userId,
    };

    return mergedInputs;
  }
}
