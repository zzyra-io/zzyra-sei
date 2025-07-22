import { z } from 'zod';
import { seiOnchainDataFetchSchema } from '@zyra/types';
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
        dataType: node.config?.dataType || 'unknown',
        address: node.config?.targetAddress || '',
        network: node.config?.network || 'sei-testnet',
        data: null,
        metadata: {
          blockHeight: 0,
          fetchTime: new Date().toISOString(),
          cached: false,
        },
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  private validateAndExtractConfig(
    node: any,
    ctx: BlockExecutionContext,
  ): z.infer<typeof seiOnchainDataFetchSchema.configSchema> {
    if (!node.config) {
      throw new Error('Block configuration is missing');
    }

    try {
      return seiOnchainDataFetchSchema.configSchema.parse(node.config);
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
        dynamicAddress: inputs.dynamicAddress,
        dynamicParams: inputs.dynamicParams,
      };

      return seiOnchainDataFetchSchema.inputSchema.parse(structuredInputs);
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

  private async fetchDataByType(
    config: any,
    address: string,
    client: SeiRpcClient,
    inputs: any,
  ): Promise<any> {
    const currentBlock = await client.getLatestBlockNumber();
    const fetchTime = new Date().toISOString();

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

      default:
        throw new Error(`Unsupported data type: ${config.dataType}`);
    }
  }

  private async fetchBalance(
    config: any,
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
    config: any,
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
    config: any,
    address: string,
    client: SeiRpcClient,
    blockHeight: number,
    fetchTime: string,
  ): Promise<any> {
    // This would require NFT contract enumeration
    return {
      success: true,
      dataType: 'nfts',
      address,
      network: config.network,
      data: {
        message: 'NFT fetching not yet implemented',
        nfts: [],
      },
      nfts: [],
      metadata: {
        blockHeight,
        fetchTime,
        cached: false,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private async fetchTransactionHistory(
    config: any,
    address: string,
    client: SeiRpcClient,
    blockHeight: number,
    fetchTime: string,
  ): Promise<any> {
    // This would require indexing service or event log parsing
    return {
      success: true,
      dataType: 'tx_history',
      address,
      network: config.network,
      data: {
        message: 'Transaction history fetching not yet implemented',
        transactions: [],
      },
      transactions: [],
      metadata: {
        blockHeight,
        fetchTime,
        cached: false,
      },
      timestamp: new Date().toISOString(),
    };
  }

  private async fetchContractState(
    config: any,
    address: string,
    client: SeiRpcClient,
    blockHeight: number,
    fetchTime: string,
    inputs: any,
  ): Promise<any> {
    if (!config.contractConfig?.contractAddress) {
      throw new Error(
        'Contract address is required for contract state queries',
      );
    }

    try {
      // This would require contract call implementation
      const callData = '0x'; // Would build actual call data
      const result = await client.call({
        to: config.contractConfig.contractAddress,
        data: callData,
      });

      return {
        success: true,
        dataType: 'contract_state',
        address,
        network: config.network,
        data: {
          result,
          contractAddress: config.contractConfig.contractAddress,
          method: config.contractConfig.queryMethod,
        },
        contractState: result,
        metadata: {
          blockHeight,
          fetchTime,
          cached: false,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new Error(`Contract state query failed: ${error.message}`);
    }
  }

  private async fetchDelegations(
    config: any,
    address: string,
    client: SeiRpcClient,
    blockHeight: number,
    fetchTime: string,
  ): Promise<any> {
    try {
      const delegations = await client.getDelegations(address);

      return {
        success: true,
        dataType: 'delegations',
        address,
        network: config.network,
        data: {
          delegations,
          totalDelegated: delegations.reduce(
            (sum: number, del: any) =>
              sum + parseInt(del.balance?.amount || '0'),
            0,
          ),
        },
        metadata: {
          blockHeight,
          fetchTime,
          cached: false,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new Error(`Delegations query failed: ${error.message}`);
    }
  }

  private async fetchRewards(
    config: any,
    address: string,
    client: SeiRpcClient,
    blockHeight: number,
    fetchTime: string,
  ): Promise<any> {
    try {
      const rewards = await client.getRewards(address);

      return {
        success: true,
        dataType: 'rewards',
        address,
        network: config.network,
        data: {
          rewards,
          totalRewards: rewards.reduce(
            (sum: number, reward: any) =>
              sum +
              reward.reward?.reduce(
                (s: number, r: any) => s + parseFloat(r.amount || '0'),
                0,
              ),
            0,
          ),
        },
        metadata: {
          blockHeight,
          fetchTime,
          cached: false,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      throw new Error(`Rewards query failed: ${error.message}`);
    }
  }

  private getFromCache(config: any, address: string): any | null {
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

  private saveToCache(config: any, address: string, data: any): void {
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
}

export default new SeiOnchainDataFetchHandler();
