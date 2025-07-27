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
    private timeout: number = 10000,
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
   * Get the ethers provider
   */
  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  /**
   * Health check for the RPC endpoint
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.getLatestBlockNumber();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get latest block number
   */
  async getLatestBlockNumber(): Promise<number> {
    console.log('rpcUrl', this.rpcClient);
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
    const blockNum =
      typeof blockNumber === 'number'
        ? ethers.toBeHex(blockNumber)
        : blockNumber;
    const response = await this.rpcClient.post('', {
      jsonrpc: '2.0',
      method: 'eth_getBlockByNumber',
      params: [blockNum, true],
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
   * Get logs with filter
   */
  async getLogs(filter: any): Promise<any[]> {
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
  async getEvmBalance(
    address: string,
    blockTag: string = 'latest',
  ): Promise<bigint> {
    const response = await this.rpcClient.post('', {
      jsonrpc: '2.0',
      method: 'eth_getBalance',
      params: [address, blockTag],
      id: 1,
    });

    return BigInt(response.data.result);
  }

  /**
   * Get token balance (ERC20)
   */
  async getTokenBalance(
    tokenAddress: string,
    walletAddress: string,
    blockTag: string = 'latest',
  ): Promise<bigint> {
    // ERC20 balanceOf function signature
    const balanceOfSignature = 'balanceOf(address)';
    const balanceOfSelector = ethers.id(balanceOfSignature).slice(0, 10);

    const callData =
      balanceOfSelector + ethers.zeroPadValue(walletAddress, 32).slice(2);

    const response = await this.rpcClient.post('', {
      jsonrpc: '2.0',
      method: 'eth_call',
      params: [
        {
          to: tokenAddress,
          data: callData,
        },
        blockTag,
      ],
      id: 1,
    });

    return BigInt(response.data.result);
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
   * Estimate gas for transaction
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
   * Get nonce for address
   */
  async getNonce(
    address: string,
    blockTag: string = 'latest',
  ): Promise<number> {
    const response = await this.rpcClient.post('', {
      jsonrpc: '2.0',
      method: 'eth_getTransactionCount',
      params: [address, blockTag],
      id: 1,
    });

    return parseInt(response.data.result, 16);
  }

  /**
   * Cosmos SDK: Get account info
   */
  async getAccount(address: string): Promise<any> {
    try {
      const response = await this.restClient.get(
        `/cosmos/auth/v1beta1/accounts/${address}`,
      );
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get account info: ${error}`);
    }
  }

  /**
   * Cosmos SDK: Get specific token balance
   */
  async getBalance(address: string, denom: string): Promise<number> {
    try {
      const response = await this.restClient.get(
        `/cosmos/bank/v1beta1/balances/${address}/by_denom?denom=${denom}`,
      );
      return parseInt(response.data.balance?.amount || '0');
    } catch (error) {
      throw new Error(`Failed to get balance for ${denom}: ${error}`);
    }
  }

  /**
   * Cosmos SDK: Get all balances for address
   */
  async getAllBalances(address: string): Promise<any[]> {
    try {
      const response = await this.restClient.get(
        `/cosmos/bank/v1beta1/balances/${address}`,
      );
      return response.data.balances || [];
    } catch (error) {
      throw new Error(`Failed to get all balances: ${error}`);
    }
  }

  /**
   * Cosmos SDK: Get transaction history
   */
  async getTransactionHistory(
    address: string,
    limit: number = 50,
  ): Promise<any[]> {
    try {
      const response = await this.restClient.get(
        `/cosmos/tx/v1beta1/txs?events=message.sender='${address}'&limit=${limit}`,
      );
      return response.data.txs || [];
    } catch (error) {
      throw new Error(`Failed to get transaction history: ${error}`);
    }
  }

  /**
   * Cosmos SDK: Get NFT tokens for address
   */
  async getNFTs(address: string): Promise<any[]> {
    try {
      // This would depend on the specific NFT module implementation
      // For now, return empty array as placeholder
      console.warn('NFT querying not yet implemented for Cosmos SDK');
      return [];
    } catch (error) {
      throw new Error(`Failed to get NFTs: ${error}`);
    }
  }
}
