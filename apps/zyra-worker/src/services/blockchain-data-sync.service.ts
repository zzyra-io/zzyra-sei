import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { DataStateService } from './data-state.service';
import { ExecutionMonitorService } from './execution-monitor.service';

export interface BlockchainEventListener {
  id: string;
  chainId: number;
  contractAddress?: string;
  eventSignature?: string;
  fromBlock: number;
  isActive: boolean;
  executionId?: string;
  nodeId?: string;
  userId: string;
  filterCriteria?: Record<string, any>;
}

export interface BlockchainEvent {
  id: string;
  chainId: number;
  blockNumber: number;
  transactionHash: string;
  contractAddress: string;
  eventName: string;
  eventData: Record<string, any>;
  timestamp: Date;
  logIndex: number;
}

export interface ChainDataSync {
  chainId: number;
  chainName: string;
  rpcUrl: string;
  wsUrl?: string;
  lastSyncedBlock: number;
  isHealthy: boolean;
  averageBlockTime: number; // in seconds
  confirmations: number;
}

export interface DeFiPriceFeed {
  symbol: string;
  address: string;
  chainId: number;
  price: number;
  lastUpdated: Date;
  source: 'chainlink' | 'uniswap' | 'coingecko' | 'binance';
  confidence: number; // 0-1
}

export interface LiquidityPoolData {
  address: string;
  chainId: number;
  token0: { symbol: string; address: string };
  token1: { symbol: string; address: string };
  reserve0: string;
  reserve1: string;
  totalSupply: string;
  fee: number;
  volume24h?: number;
  tvl?: number;
  lastUpdated: Date;
}

@Injectable()
export class BlockchainDataSyncService {
  private readonly logger = new Logger(BlockchainDataSyncService.name);
  
  // Track active event listeners
  private activeListeners = new Map<string, BlockchainEventListener>();
  
  // Track chain sync status
  private chainSyncStatus = new Map<number, ChainDataSync>();
  
  // Cache for price feeds
  private priceFeeds = new Map<string, DeFiPriceFeed>();
  
  // Cache for liquidity pool data
  private liquidityPools = new Map<string, LiquidityPoolData>();
  
  // WebSocket connections for real-time data
  private wsConnections = new Map<number, any>();

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly dataStateService: DataStateService,
    private readonly executionMonitorService: ExecutionMonitorService
  ) {
    // Initialize supported chains
    this.initializeSupportedChains();
  }

  /**
   * Start listening for blockchain events for a specific workflow node
   */
  async startEventListener(
    executionId: string,
    nodeId: string,
    userId: string,
    config: {
      chainId: number;
      contractAddress?: string;
      eventSignature?: string;
      filterCriteria?: Record<string, any>;
    }
  ): Promise<string> {
    const listenerId = `${executionId}-${nodeId}-${Date.now()}`;
    
    const listener: BlockchainEventListener = {
      id: listenerId,
      chainId: config.chainId,
      contractAddress: config.contractAddress,
      eventSignature: config.eventSignature,
      fromBlock: await this.getCurrentBlockNumber(config.chainId),
      isActive: true,
      executionId,
      nodeId,
      userId,
      filterCriteria: config.filterCriteria,
    };

    this.activeListeners.set(listenerId, listener);
    
    // Start the actual listening process
    await this.setupEventListening(listener);
    
    this.logger.log(`Started blockchain event listener ${listenerId} for chain ${config.chainId}`);
    return listenerId;
  }

  /**
   * Stop a blockchain event listener
   */
  async stopEventListener(listenerId: string): Promise<boolean> {
    const listener = this.activeListeners.get(listenerId);
    if (!listener) {
      return false;
    }

    listener.isActive = false;
    this.activeListeners.delete(listenerId);
    
    this.logger.log(`Stopped blockchain event listener ${listenerId}`);
    return true;
  }

  /**
   * Get real-time price data for a token
   */
  async getPriceData(
    symbol: string,
    chainId: number,
    source: 'chainlink' | 'uniswap' | 'coingecko' | 'binance' = 'chainlink'
  ): Promise<DeFiPriceFeed | null> {
    const cacheKey = `${symbol}-${chainId}-${source}`;
    
    // Check cache first
    const cached = this.priceFeeds.get(cacheKey);
    if (cached && this.isFreshData(cached.lastUpdated, 60)) { // 60 seconds freshness
      return cached;
    }

    try {
      let priceData: DeFiPriceFeed;
      
      switch (source) {
        case 'chainlink':
          priceData = await this.fetchChainlinkPrice(symbol, chainId);
          break;
        case 'uniswap':
          priceData = await this.fetchUniswapPrice(symbol, chainId);
          break;
        case 'coingecko':
          priceData = await this.fetchCoinGeckoPrice(symbol);
          break;
        case 'binance':
          priceData = await this.fetchBinancePrice(symbol);
          break;
        default:
          throw new Error(`Unsupported price source: ${source}`);
      }

      // Cache the result
      this.priceFeeds.set(cacheKey, priceData);
      
      this.logger.debug(`Fetched price for ${symbol}: $${priceData.price}`);
      return priceData;

    } catch (error) {
      this.logger.error(`Failed to fetch price for ${symbol}:`, error);
      return cached || null; // Return stale data if available
    }
  }

  /**
   * Get liquidity pool information
   */
  async getLiquidityPoolData(
    poolAddress: string,
    chainId: number
  ): Promise<LiquidityPoolData | null> {
    const cacheKey = `${poolAddress}-${chainId}`;
    
    // Check cache first
    const cached = this.liquidityPools.get(cacheKey);
    if (cached && this.isFreshData(cached.lastUpdated, 300)) { // 5 minutes freshness
      return cached;
    }

    try {
      const poolData = await this.fetchLiquidityPoolData(poolAddress, chainId);
      
      // Cache the result
      this.liquidityPools.set(cacheKey, poolData);
      
      this.logger.debug(`Fetched liquidity pool data for ${poolAddress}`);
      return poolData;

    } catch (error) {
      this.logger.error(`Failed to fetch liquidity pool data for ${poolAddress}:`, error);
      return cached || null;
    }
  }

  /**
   * Monitor multiple price feeds simultaneously
   */
  async startPriceMonitoring(
    executionId: string,
    nodeId: string,
    priceTargets: Array<{
      symbol: string;
      chainId: number;
      condition: 'above' | 'below' | 'change';
      targetPrice?: number;
      changeThreshold?: number; // percentage
    }>
  ): Promise<void> {
    this.logger.log(`Starting price monitoring for ${priceTargets.length} targets`);

    // Set up monitoring intervals for each target
    for (const target of priceTargets) {
      const intervalId = setInterval(async () => {
        try {
          const priceData = await this.getPriceData(target.symbol, target.chainId);
          if (!priceData) return;

          let triggered = false;
          let conditionMet = '';

          switch (target.condition) {
            case 'above':
              if (target.targetPrice && priceData.price > target.targetPrice) {
                triggered = true;
                conditionMet = `price ${priceData.price} is above target ${target.targetPrice}`;
              }
              break;
            case 'below':
              if (target.targetPrice && priceData.price < target.targetPrice) {
                triggered = true;
                conditionMet = `price ${priceData.price} is below target ${target.targetPrice}`;
              }
              break;
            case 'change':
              // Implement change detection logic
              const previousPrice = await this.getPreviousPrice(target.symbol, target.chainId);
              if (previousPrice && target.changeThreshold) {
                const changePercent = Math.abs((priceData.price - previousPrice) / previousPrice) * 100;
                if (changePercent >= target.changeThreshold) {
                  triggered = true;
                  conditionMet = `price changed by ${changePercent.toFixed(2)}%`;
                }
              }
              break;
          }

          if (triggered) {
            // Notify the workflow execution
            await this.triggerPriceAlert(executionId, nodeId, target, priceData, conditionMet);
          }

        } catch (error) {
          this.logger.error(`Error monitoring price for ${target.symbol}:`, error);
        }
      }, 10000); // Check every 10 seconds

      // Store interval for cleanup
      setTimeout(() => clearInterval(intervalId), 24 * 60 * 60 * 1000); // Auto-cleanup after 24 hours
    }
  }

  /**
   * Get transaction data with confirmation status
   */
  async getTransactionData(
    txHash: string,
    chainId: number,
    waitForConfirmations: number = 1
  ): Promise<{
    hash: string;
    blockNumber: number;
    confirmations: number;
    status: 'pending' | 'confirmed' | 'failed';
    gasUsed?: number;
    effectiveGasPrice?: number;
    logs: any[];
  } | null> {
    try {
      // This would integrate with actual blockchain RPC calls
      const chainSync = this.chainSyncStatus.get(chainId);
      if (!chainSync) {
        throw new Error(`Chain ${chainId} not supported`);
      }

      // Simulate transaction fetch (replace with actual RPC call)
      const txData = await this.fetchTransactionFromRPC(txHash, chainId);
      
      if (!txData) {
        return null;
      }

      const currentBlock = await this.getCurrentBlockNumber(chainId);
      const confirmations = currentBlock - txData.blockNumber + 1;
      
      return {
        hash: txData.hash,
        blockNumber: txData.blockNumber,
        confirmations,
        status: confirmations >= waitForConfirmations ? 'confirmed' : 'pending',
        gasUsed: txData.gasUsed,
        effectiveGasPrice: txData.effectiveGasPrice,
        logs: txData.logs || [],
      };

    } catch (error) {
      this.logger.error(`Failed to get transaction data for ${txHash}:`, error);
      return null;
    }
  }

  /**
   * Get multi-chain portfolio balance
   */
  async getPortfolioBalance(
    walletAddress: string,
    chainIds: number[],
    tokenAddresses?: string[]
  ): Promise<Record<number, Array<{ 
    token: string; 
    symbol: string; 
    balance: string; 
    usdValue?: number 
  }>>> {
    const portfolio: Record<number, any[]> = {};

    for (const chainId of chainIds) {
      try {
        const balances = await this.getChainBalances(walletAddress, chainId, tokenAddresses);
        portfolio[chainId] = balances;
      } catch (error) {
        this.logger.error(`Failed to get balances for chain ${chainId}:`, error);
        portfolio[chainId] = [];
      }
    }

    return portfolio;
  }

  /**
   * Private helper methods
   */
  private async initializeSupportedChains(): Promise<void> {
    const supportedChains = [
      { chainId: 1, name: 'Ethereum', rpcUrl: process.env.ETH_RPC_URL, confirmations: 12 },
      { chainId: 56, name: 'BSC', rpcUrl: process.env.BSC_RPC_URL, confirmations: 3 },
      { chainId: 137, name: 'Polygon', rpcUrl: process.env.POLYGON_RPC_URL, confirmations: 5 },
      { chainId: 1313, name: 'Sei', rpcUrl: process.env.SEI_RPC_URL, confirmations: 1 },
    ];

    for (const chain of supportedChains) {
      if (chain.rpcUrl) {
        this.chainSyncStatus.set(chain.chainId, {
          chainId: chain.chainId,
          chainName: chain.name,
          rpcUrl: chain.rpcUrl,
          lastSyncedBlock: 0,
          isHealthy: true,
          averageBlockTime: 12, // Default to 12 seconds
          confirmations: chain.confirmations,
        });
      }
    }

    this.logger.log(`Initialized ${this.chainSyncStatus.size} blockchain connections`);
  }

  private async setupEventListening(listener: BlockchainEventListener): Promise<void> {
    // This would set up WebSocket or polling for blockchain events
    // Implementation depends on the blockchain library used (ethers, web3, etc.)
    this.logger.debug(`Setting up event listening for ${listener.id}`);
    
    // Simulate event listening setup
    setTimeout(async () => {
      if (listener.isActive) {
        await this.simulateBlockchainEvent(listener);
      }
    }, 5000);
  }

  private async simulateBlockchainEvent(listener: BlockchainEventListener): Promise<void> {
    // Simulate receiving a blockchain event
    const event: BlockchainEvent = {
      id: `event-${Date.now()}`,
      chainId: listener.chainId,
      blockNumber: await this.getCurrentBlockNumber(listener.chainId) + 1,
      transactionHash: `0x${'a'.repeat(64)}`,
      contractAddress: listener.contractAddress || `0x${'1'.repeat(40)}`,
      eventName: 'Transfer',
      eventData: {
        from: `0x${'2'.repeat(40)}`,
        to: `0x${'3'.repeat(40)}`,
        value: '1000000000000000000', // 1 ETH in wei
      },
      timestamp: new Date(),
      logIndex: 0,
    };

    // Process the event
    await this.processBlockchainEvent(listener, event);
  }

  private async processBlockchainEvent(
    listener: BlockchainEventListener,
    event: BlockchainEvent
  ): Promise<void> {
    try {
      // Save event data to workflow state
      if (listener.executionId && listener.nodeId) {
        await this.dataStateService.saveDataState(
          listener.executionId,
          listener.nodeId,
          event,
          { tags: ['blockchain', 'event', `chain-${event.chainId}`] }
        );

        // Notify execution monitor
        await this.executionMonitorService.updateNodeExecution({
          executionId: listener.executionId,
          nodeId: listener.nodeId,
          status: 'completed',
          output: event,
          nodeType: 'BLOCKCHAIN_EVENT',
          nodeLabel: `Blockchain Event - ${event.eventName}`,
        });
      }

      this.logger.log(`Processed blockchain event ${event.id} for listener ${listener.id}`);

    } catch (error) {
      this.logger.error(`Failed to process blockchain event:`, error);
    }
  }

  private async getCurrentBlockNumber(chainId: number): Promise<number> {
    const chainSync = this.chainSyncStatus.get(chainId);
    if (!chainSync) {
      throw new Error(`Chain ${chainId} not supported`);
    }

    // This would make an actual RPC call to get current block number
    // For now, return a simulated block number
    return Math.floor(Date.now() / 12000); // Simulate block every 12 seconds
  }

  private async fetchChainlinkPrice(symbol: string, chainId: number): Promise<DeFiPriceFeed> {
    // Simulate Chainlink price fetch
    return {
      symbol,
      address: `0x${'a'.repeat(40)}`,
      chainId,
      price: Math.random() * 1000 + 100, // Random price between 100-1100
      lastUpdated: new Date(),
      source: 'chainlink',
      confidence: 0.95,
    };
  }

  private async fetchUniswapPrice(symbol: string, chainId: number): Promise<DeFiPriceFeed> {
    // Simulate Uniswap price fetch
    return {
      symbol,
      address: `0x${'b'.repeat(40)}`,
      chainId,
      price: Math.random() * 1000 + 100,
      lastUpdated: new Date(),
      source: 'uniswap',
      confidence: 0.90,
    };
  }

  private async fetchCoinGeckoPrice(symbol: string): Promise<DeFiPriceFeed> {
    // Simulate CoinGecko API call
    return {
      symbol,
      address: '',
      chainId: 0,
      price: Math.random() * 1000 + 100,
      lastUpdated: new Date(),
      source: 'coingecko',
      confidence: 0.85,
    };
  }

  private async fetchBinancePrice(symbol: string): Promise<DeFiPriceFeed> {
    // Simulate Binance API call
    return {
      symbol,
      address: '',
      chainId: 0,
      price: Math.random() * 1000 + 100,
      lastUpdated: new Date(),
      source: 'binance',
      confidence: 0.90,
    };
  }

  private async fetchLiquidityPoolData(
    poolAddress: string,
    chainId: number
  ): Promise<LiquidityPoolData> {
    // Simulate liquidity pool data fetch
    return {
      address: poolAddress,
      chainId,
      token0: { symbol: 'ETH', address: `0x${'1'.repeat(40)}` },
      token1: { symbol: 'USDC', address: `0x${'2'.repeat(40)}` },
      reserve0: '1000000000000000000000', // 1000 ETH
      reserve1: '2000000000000', // 2M USDC
      totalSupply: '44721359549995793928', // LP tokens
      fee: 0.003, // 0.3%
      volume24h: 5000000, // $5M
      tvl: 4000000, // $4M
      lastUpdated: new Date(),
    };
  }

  private async fetchTransactionFromRPC(txHash: string, chainId: number): Promise<any> {
    // Simulate RPC transaction fetch
    return {
      hash: txHash,
      blockNumber: await this.getCurrentBlockNumber(chainId),
      gasUsed: 21000,
      effectiveGasPrice: 20000000000, // 20 Gwei
      logs: [],
    };
  }

  private async getChainBalances(
    walletAddress: string,
    chainId: number,
    tokenAddresses?: string[]
  ): Promise<Array<{ token: string; symbol: string; balance: string; usdValue?: number }>> {
    // Simulate balance fetching
    return [
      {
        token: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        balance: '1500000000000000000', // 1.5 ETH
        usdValue: 3000,
      },
      {
        token: `0x${'a'.repeat(40)}`,
        symbol: 'USDC',
        balance: '1000000000', // 1000 USDC
        usdValue: 1000,
      },
    ];
  }

  private async getPreviousPrice(symbol: string, chainId: number): Promise<number | null> {
    // This would fetch previous price from database or cache
    // For simulation, return a slightly different price
    const current = this.priceFeeds.get(`${symbol}-${chainId}-chainlink`);
    return current ? current.price * (0.95 + Math.random() * 0.1) : null;
  }

  private async triggerPriceAlert(
    executionId: string,
    nodeId: string,
    target: any,
    priceData: DeFiPriceFeed,
    conditionMet: string
  ): Promise<void> {
    const alertData = {
      symbol: target.symbol,
      condition: target.condition,
      conditionMet,
      currentPrice: priceData.price,
      targetPrice: target.targetPrice,
      timestamp: new Date(),
    };

    // Save alert to workflow state
    await this.dataStateService.saveDataState(
      executionId,
      nodeId,
      alertData,
      { tags: ['price-alert', 'triggered'] }
    );

    // Update execution monitor
    await this.executionMonitorService.updateNodeExecution({
      executionId,
      nodeId,
      status: 'completed',
      output: alertData,
      nodeType: 'PRICE_MONITOR',
      nodeLabel: `Price Alert - ${target.symbol}`,
    });

    this.logger.log(`Price alert triggered for ${target.symbol}: ${conditionMet}`);
  }

  private isFreshData(lastUpdated: Date, maxAgeSeconds: number): boolean {
    const ageSeconds = (Date.now() - lastUpdated.getTime()) / 1000;
    return ageSeconds < maxAgeSeconds;
  }
}