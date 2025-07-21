import axios, { AxiosInstance } from 'axios';
import { ethers } from 'ethers';

/**
 * Sei RPC Client for blockchain interactions
 * Handles both EVM-compatible calls and Cosmos SDK queries
 */
export class SeiRpcClient {
  private rpcClient: AxiosInstance;
  private restClient: AxiosInstance;
  private provider: ethers.JsonRpcProvider;
  
  constructor(
    private rpcUrl: string,
    private restUrl?: string,
    private timeout: number = 10000
  ) {
    this.rpcClient = axios.create({
      baseURL: rpcUrl,
      timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // REST API client for Cosmos SDK queries
    this.restClient = axios.create({
      baseURL: restUrl || rpcUrl.replace('/rpc', '/rest'),
      timeout,
    });

    // Ethers provider for EVM calls
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  /**
   * Get the latest block number
   */
  async getLatestBlockNumber(): Promise<number> {
    const response = await this.rpcClient.post('', {
      jsonrpc: '2.0',
      method: 'eth_blockNumber',
      params: [],
      id: 1,
    });
    
    return parseInt(response.data.result, 16);
  }

  /**
   * Get block by number
   */
  async getBlock(blockNumber: number | string): Promise<any> {
    const blockNum = typeof blockNumber === 'number' ? ethers.toBeHex(blockNumber) : blockNumber;
    const response = await this.rpcClient.post('', {
      jsonrpc: '2.0',
      method: 'eth_getBlockByNumber',
      params: [blockNum, true],
      id: 1,
    });
    
    return response.data.result;
  }

  /**
   * Get transaction by hash
   */
  async getTransaction(txHash: string): Promise<any> {
    const response = await this.rpcClient.post('', {
      jsonrpc: '2.0',
      method: 'eth_getTransactionByHash',
      params: [txHash],
      id: 1,
    });
    
    return response.data.result;
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(txHash: string): Promise<any> {
    const response = await this.rpcClient.post('', {
      jsonrpc: '2.0',
      method: 'eth_getTransactionReceipt',
      params: [txHash],
      id: 1,
    });
    
    return response.data.result;
  }

  /**
   * Get logs for events
   */
  async getLogs(filter: {
    fromBlock?: string;
    toBlock?: string;
    address?: string | string[];
    topics?: (string | string[] | null)[];
  }): Promise<any[]> {
    const response = await this.rpcClient.post('', {
      jsonrpc: '2.0',
      method: 'eth_getLogs',
      params: [filter],
      id: 1,
    });
    
    return response.data.result || [];
  }

  /**
   * Get account balance (EVM)
   */
  async getEvmBalance(address: string, blockTag: string = 'latest'): Promise<bigint> {
    const response = await this.rpcClient.post('', {
      jsonrpc: '2.0',
      method: 'eth_getBalance',
      params: [address, blockTag],
      id: 1,
    });
    
    return BigInt(response.data.result);
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(transaction: any): Promise<bigint> {
    const response = await this.rpcClient.post('', {
      jsonrpc: '2.0',
      method: 'eth_estimateGas',
      params: [transaction],
      id: 1,
    });
    
    return BigInt(response.data.result);
  }

  /**
   * Send raw transaction
   */
  async sendRawTransaction(signedTransaction: string): Promise<string> {
    const response = await this.rpcClient.post('', {
      jsonrpc: '2.0',
      method: 'eth_sendRawTransaction',
      params: [signedTransaction],
      id: 1,
    });
    
    return response.data.result;
  }

  /**
   * Call a contract method (read-only)
   */
  async call(transaction: any, blockTag: string = 'latest'): Promise<string> {
    const response = await this.rpcClient.post('', {
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [transaction, blockTag],
      id: 1,
    });
    
    return response.data.result;
  }

  /**
   * Get nonce for an address
   */
  async getTransactionCount(address: string, blockTag: string = 'pending'): Promise<number> {
    const response = await this.rpcClient.post('', {
      jsonrpc: '2.0',
      method: 'eth_getTransactionCount',
      params: [address, blockTag],
      id: 1,
    });
    
    return parseInt(response.data.result, 16);
  }

  /**
   * Get gas price
   */
  async getGasPrice(): Promise<bigint> {
    const response = await this.rpcClient.post('', {
      jsonrpc: '2.0',
      method: 'eth_gasPrice',
      params: [],
      id: 1,
    });
    
    return BigInt(response.data.result);
  }

  /**
   * Cosmos SDK: Get account info
   */
  async getAccount(address: string): Promise<any> {
    try {
      const response = await this.restClient.get(`/cosmos/auth/v1beta1/accounts/${address}`);
      return response.data.account;
    } catch (error) {
      throw new Error(`Failed to get account info: ${error}`);
    }
  }

  /**
   * Cosmos SDK: Get all balances for an address
   */
  async getAllBalances(address: string): Promise<any[]> {
    try {
      const response = await this.restClient.get(`/cosmos/bank/v1beta1/balances/${address}`);
      return response.data.balances || [];
    } catch (error) {
      throw new Error(`Failed to get balances: ${error}`);
    }
  }

  /**
   * Cosmos SDK: Get specific token balance
   */
  async getBalance(address: string, denom: string): Promise<number> {
    try {
      const response = await this.restClient.get(
        `/cosmos/bank/v1beta1/balances/${address}/by_denom?denom=${denom}`
      );
      return parseInt(response.data.balance?.amount || '0');
    } catch (error) {
      throw new Error(`Failed to get balance for ${denom}: ${error}`);
    }
  }

  /**
   * Cosmos SDK: Get delegation info
   */
  async getDelegations(delegatorAddress: string): Promise<any[]> {
    try {
      const response = await this.restClient.get(
        `/cosmos/staking/v1beta1/delegations/${delegatorAddress}`
      );
      return response.data.delegation_responses || [];
    } catch (error) {
      throw new Error(`Failed to get delegations: ${error}`);
    }
  }

  /**
   * Cosmos SDK: Get rewards
   */
  async getRewards(delegatorAddress: string): Promise<any> {
    try {
      const response = await this.restClient.get(
        `/cosmos/distribution/v1beta1/delegators/${delegatorAddress}/rewards`
      );
      return response.data.rewards || [];
    } catch (error) {
      throw new Error(`Failed to get rewards: ${error}`);
    }
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForTransaction(
    txHash: string, 
    timeout: number = 60000,
    confirmations: number = 1
  ): Promise<any> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const receipt = await this.getTransactionReceipt(txHash);
        if (receipt && receipt.blockNumber) {
          const currentBlock = await this.getLatestBlockNumber();
          const confirmationCount = currentBlock - parseInt(receipt.blockNumber, 16) + 1;
          
          if (confirmationCount >= confirmations) {
            return receipt;
          }
        }
      } catch (error) {
        // Transaction might not be mined yet, continue polling
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`Transaction ${txHash} not confirmed within timeout`);
  }

  /**
   * Get the ethers provider for advanced operations
   */
  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.getLatestBlockNumber();
      return true;
    } catch (error) {
      return false;
    }
  }
}