import { z } from 'zod';
import { seiOnchainDataFetchSchema } from '@zyra/types';
import { SeiRpcClient } from './services/SeiRpcClient';

// Explicit type definitions to avoid Zod inference issues
interface SeiOnchainDataFetchConfig {
  network: string;
  dataType: string;
  targetAddress: string;
  balanceConfig?: {
    tokenDenom?: string;
    includeStaked?: boolean;
    includeRewards?: boolean;
  };
  nftConfig?: {
    collectionAddress?: string;
    includeMetadata?: boolean;
    metadataFormat?: string;
  };
  txConfig?: {
    txType?: string;
    startTime?: string;
    endTime?: string;
    includeFailedTx?: boolean;
    limit?: number;
  };
  contractConfig?: {
    contractAddress: string;
    queryMethod: string;
    queryParams?: Record<string, any>;
  };
  defiConfig?: {
    protocols?: string[];
    includeRewards?: boolean;
    includeHistory?: boolean;
  };
  filters?: any;
  cacheResults?: boolean;
  cacheTtl?: number;
}

interface SeiOnchainDataFetchInput {
  data?: Record<string, any>;
  context?: {
    workflowId?: string;
    executionId?: string;
    userId?: string;
    timestamp: string;
  };
  variables?: Record<string, any>;
  dynamicAddress?: string;
  dynamicParams?: Record<string, any>;
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
 * Sei Onchain Data Fetch Handler
 * Retrieves blockchain data without requiring wallet delegation (read-only)
 */
export class SeiOnchainDataFetchHandler {
  static readonly inputSchema = seiOnchainDataFetchSchema.inputSchema;
  static readonly outputSchema = seiOnchainDataFetchSchema.outputSchema;
  static readonly configSchema = seiOnchainDataFetchSchema.configSchema;

  private rpcClients: Map<string, SeiRpcClient> = new Map();
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> =
    new Map();

  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    try {
      const config = this.validateAndExtractConfig(node, ctx);
      const inputs = this.validateInputs(
        ctx.inputs || {},
        ctx.previousOutputs || {},
        ctx,
      );

      const client = this.getRpcClient(config.network);

      // Use dynamic address if provided
      const targetAddress = inputs.dynamicAddress || config.targetAddress;

      // Check cache first
      if (config.cacheResults) {
        const cached = this.getFromCache(config, targetAddress);
        if (cached) {
          return {
            ...cached,
            metadata: {
              ...cached.metadata,
              cached: true,
            },
          };
        }
      }

      // Fetch data based on type
      const result = await this.fetchDataByType(
        config,
        targetAddress,
        client,
        inputs,
      );

      // Cache result if enabled
      if (config.cacheResults) {
        this.saveToCache(config, targetAddress, result);
      }

      return result;
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        dataType: node.data?.config?.dataType || 'unknown',
        address: node.data?.config?.targetAddress || '',
        network: node.data?.config?.network || 'sei-testnet',
        executionTime: new Date().toISOString(),
        timestamp: new Date().toISOString(),
      };
    }
  }

  private validateAndExtractConfig(
    node: any,
    ctx: BlockExecutionContext,
  ): SeiOnchainDataFetchConfig {
    if (!node.data?.config) {
      throw new Error('Block configuration is missing');
    }

    try {
      const result = seiOnchainDataFetchSchema.configSchema.safeParse(
        node.data.config,
      );
      if (!result.success) {
        throw new Error(
          `Configuration validation failed: ${result.error.message}`,
        );
      }
      return result.data as SeiOnchainDataFetchConfig;
    } catch (error) {
      throw new Error(`Configuration validation failed: ${error}`);
    }
  }

  private validateInputs(
    inputs: Record<string, any>,
    previousOutputs: Record<string, any>,
    ctx: BlockExecutionContext,
  ): SeiOnchainDataFetchInput {
    try {
      const result = seiOnchainDataFetchSchema.inputSchema.safeParse({
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
      return result.data as SeiOnchainDataFetchInput;
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

  private async fetchDataByType(
    config: SeiOnchainDataFetchConfig,
    address: string,
    client: SeiRpcClient,
    inputs: SeiOnchainDataFetchInput,
  ): Promise<any> {
    const currentBlock = await client.getLatestBlockNumber();
    const fetchTime = new Date().toISOString();

    // Determine data type to fetch
    switch (config.dataType) {
      case 'balance':
        return await this.fetchBalance(
          config,
          address,
          client,
          currentBlock,
          fetchTime,
        );

      case 'token_balance':
        return await this.fetchTokenBalance(
          config,
          address,
          client,
          currentBlock,
          fetchTime,
        );

      case 'nfts':
        return await this.fetchNFTs(
          config,
          address,
          client,
          currentBlock,
          fetchTime,
        );

      case 'tx_history':
        return await this.fetchTransactionHistory(
          config,
          address,
          client,
          currentBlock,
          fetchTime,
        );

      case 'contract_state':
        return await this.fetchContractState(
          config,
          address,
          client,
          currentBlock,
          fetchTime,
          inputs,
        );

      case 'defi_positions':
        return await this.fetchDeFiPositions(
          config,
          address,
          client,
          currentBlock,
          fetchTime,
        );

      case 'delegations':
        return await this.fetchDelegations(
          config,
          address,
          client,
          currentBlock,
          fetchTime,
        );

      case 'rewards':
        return await this.fetchRewards(
          config,
          address,
          client,
          currentBlock,
          fetchTime,
        );

      case 'governance_votes':
        return await this.fetchGovernanceVotes(
          config,
          address,
          client,
          currentBlock,
          fetchTime,
        );

      default:
        throw new Error(`Unsupported data type: ${config.dataType}`);
    }
  }

  private async fetchBalance(
    config: SeiOnchainDataFetchConfig,
    address: string,
    client: SeiRpcClient,
    blockHeight: number,
    fetchTime: string,
  ): Promise<any> {
    const balance = await client.getBalance(
      address,
      config.balanceConfig?.tokenDenom || 'usei',
    );

    return {
      success: true,
      dataType: 'balance',
      address,
      network: config.network,
      data: {
        balance: balance.toString(),
        formatted: (Number(balance) / 1e18).toFixed(6), // Convert from wei
      },
      balance: {
        available: Number(balance),
        total: Number(balance),
        denom: config.balanceConfig?.tokenDenom || 'usei',
      },
      metadata: {
        blockHeight,
        fetchTime,
        cached: false,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private async fetchTokenBalance(
    config: SeiOnchainDataFetchConfig,
    address: string,
    client: SeiRpcClient,
    blockHeight: number,
    fetchTime: string,
  ): Promise<any> {
    // This would require ERC20 contract calls
    return {
      success: true,
      dataType: 'token_balance',
      address,
      network: config.network,
      data: {
        message: 'Token balance fetching not yet implemented',
        balances: [],
      },
      metadata: {
        blockHeight,
        fetchTime,
        cached: false,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private async fetchNFTs(
    config: SeiOnchainDataFetchConfig,
    address: string,
    client: SeiRpcClient,
    blockHeight: number,
    fetchTime: string,
  ): Promise<any> {
    try {
      // Get NFTs using Cosmos SDK or EVM methods
      let nfts: any[] = [];

      try {
        // Try Cosmos SDK first
        nfts = await client.getNFTs(address);
      } catch (cosmosError) {
        // Fallback to EVM ERC721/ERC1155
        console.warn('Cosmos NFT query failed, trying EVM fallback');

        // This would require NFT contract enumeration
        // For now, return empty array with placeholder
        nfts = [];
      }

      return {
        success: true,
        dataType: 'nfts',
        address,
        network: config.network,
        data: {
          nfts,
          totalCount: nfts.length,
        },
        nfts,
        metadata: {
          blockHeight,
          fetchTime,
          cached: false,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        dataType: 'nfts',
        address,
        network: config.network,
        error: error.message,
        data: {
          nfts: [],
          totalCount: 0,
        },
        metadata: {
          blockHeight,
          fetchTime,
          cached: false,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  private async fetchTransactionHistory(
    config: SeiOnchainDataFetchConfig,
    address: string,
    client: SeiRpcClient,
    blockHeight: number,
    fetchTime: string,
  ): Promise<any> {
    try {
      const txConfig = config.txConfig || {};
      const limit = txConfig.limit || 50;

      // Get transaction history
      const transactions = await client.getTransactionHistory(address, limit);

      // Filter by transaction type if specified
      let filteredTxs = transactions;
      if (txConfig.txType && txConfig.txType !== 'all') {
        filteredTxs = transactions.filter((tx: any) => {
          // Filter logic would depend on transaction type
          return true; // Placeholder
        });
      }

      return {
        success: true,
        dataType: 'tx_history',
        address,
        network: config.network,
        data: {
          transactions: filteredTxs,
          totalCount: filteredTxs.length,
          limit,
        },
        transactions: filteredTxs,
        metadata: {
          blockHeight,
          fetchTime,
          cached: false,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        dataType: 'tx_history',
        address,
        network: config.network,
        error: error.message,
        data: {
          transactions: [],
          totalCount: 0,
        },
        metadata: {
          blockHeight,
          fetchTime,
          cached: false,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  private async fetchContractState(
    config: SeiOnchainDataFetchConfig,
    address: string,
    client: SeiRpcClient,
    blockHeight: number,
    fetchTime: string,
    inputs: any,
  ): Promise<any> {
    try {
      const contractConfig = config.contractConfig;
      if (!contractConfig) {
        throw new Error(
          'Contract configuration is required for contract state queries',
        );
      }

      const contractAddress = contractConfig.contractAddress;
      const queryMethod = contractConfig.queryMethod;
      const queryParams = contractConfig.queryParams || {};

      // Build call data for the query method
      const callData = await this.buildContractCallData(
        queryMethod,
        queryParams,
      );

      // Call the contract
      const result = await client.call({
        to: contractAddress,
        data: callData,
      });

      return {
        success: true,
        dataType: 'contract_state',
        address: contractAddress,
        network: config.network,
        data: {
          method: queryMethod,
          result,
          params: queryParams,
        },
        contractState: {
          method: queryMethod,
          result,
          params: queryParams,
        },
        metadata: {
          blockHeight,
          fetchTime,
          cached: false,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        dataType: 'contract_state',
        address: config.contractConfig?.contractAddress,
        network: config.network,
        error: error.message,
        data: {
          method: config.contractConfig?.queryMethod,
          result: null,
          params: config.contractConfig?.queryParams,
        },
        metadata: {
          blockHeight,
          fetchTime,
          cached: false,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  private async fetchDelegations(
    config: SeiOnchainDataFetchConfig,
    address: string,
    client: SeiRpcClient,
    blockHeight: number,
    fetchTime: string,
  ): Promise<any> {
    try {
      // Get delegations using Cosmos SDK
      const delegations = await client.getAllBalances(address); // Placeholder

      return {
        success: true,
        dataType: 'delegations',
        address,
        network: config.network,
        data: {
          delegations,
          totalCount: delegations.length,
        },
        delegations,
        metadata: {
          blockHeight,
          fetchTime,
          cached: false,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        dataType: 'delegations',
        address,
        network: config.network,
        error: error.message,
        data: {
          delegations: [],
          totalCount: 0,
        },
        metadata: {
          blockHeight,
          fetchTime,
          cached: false,
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  private async fetchRewards(
    config: SeiOnchainDataFetchConfig,
    address: string,
    client: SeiRpcClient,
    blockHeight: number,
    fetchTime: string,
  ): Promise<any> {
    // This would require staking contract queries
    return {
      success: true,
      dataType: 'rewards',
      address,
      network: config.network,
      data: {
        message: 'Rewards fetching not yet implemented',
        rewards: [],
      },
      metadata: {
        blockHeight,
        fetchTime,
        cached: false,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private async fetchDeFiPositions(
    config: SeiOnchainDataFetchConfig,
    address: string,
    client: SeiRpcClient,
    blockHeight: number,
    fetchTime: string,
  ): Promise<any> {
    // This would require DeFi protocol integrations
    return {
      success: true,
      dataType: 'defi_positions',
      address,
      network: config.network,
      data: {
        message: 'DeFi positions fetching not yet implemented',
        positions: [],
      },
      metadata: {
        blockHeight,
        fetchTime,
        cached: false,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private async fetchGovernanceVotes(
    config: SeiOnchainDataFetchConfig,
    address: string,
    client: SeiRpcClient,
    blockHeight: number,
    fetchTime: string,
  ): Promise<any> {
    // This would require governance contract queries
    return {
      success: true,
      dataType: 'governance_votes',
      address,
      network: config.network,
      data: {
        message: 'Governance votes fetching not yet implemented',
        votes: [],
      },
      metadata: {
        blockHeight,
        fetchTime,
        cached: false,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private getFromCache(
    config: SeiOnchainDataFetchConfig,
    address: string,
  ): any | null {
    const key = `${config.network}-${config.dataType}-${address}`;
    const cached = this.cache.get(key);

    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    // Remove expired cache entry
    if (cached) {
      this.cache.delete(key);
    }

    return null;
  }

  private saveToCache(
    config: SeiOnchainDataFetchConfig,
    address: string,
    data: any,
  ): void {
    const key = `${config.network}-${config.dataType}-${address}`;
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: config.cacheTtl || 60000,
    });
  }

  async healthCheck(network: string = 'sei-testnet'): Promise<boolean> {
    try {
      const client = this.getRpcClient(network);
      return await client.healthCheck();
    } catch (error) {
      return false;
    }
  }

  private async buildContractCallData(
    method: string,
    params: any,
  ): Promise<string> {
    // This would build the proper call data for contract queries
    // For now, return a placeholder
    return '0x'; // Placeholder
  }
}

export default new SeiOnchainDataFetchHandler();
