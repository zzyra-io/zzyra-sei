import { BlockExecutionContext, BlockHandler } from '@zyra/types';
import { Logger } from '@nestjs/common';
import retry from 'async-retry';

/**
 * Blockchain Read Handler
 * Reads data from blockchain networks including balances, token holdings, and contract states
 * Supports multiple networks and data sources
 */
export class BlockchainReadHandler implements BlockHandler {
  private readonly logger = new Logger(BlockchainReadHandler.name);

  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    const cfg = (node.data as any).config;
    const {
      operation,
      network = 'ethereum',
      address,
      tokenAddress,
      contractAddress,
      methodName,
      methodParams = [],
      provider,
      retries = 3,
    } = cfg;

    this.logger.log(
      `Executing Blockchain Read operation: ${operation} on ${network}`,
    );

    if (!address && !contractAddress) {
      throw new Error(
        'Address or contractAddress is required for blockchain operations',
      );
    }

    try {
      const processedAddress = this.processTemplate(
        address || '',
        ctx.inputs || {},
      );
      const processedTokenAddress = tokenAddress
        ? this.processTemplate(tokenAddress, ctx.inputs || {})
        : undefined;
      const processedContractAddress = contractAddress
        ? this.processTemplate(contractAddress, ctx.inputs || {})
        : undefined;

      let result: any;

      switch (operation) {
        case 'get_balance':
          result = await this.getBalance(network, processedAddress, retries);
          break;
        case 'get_token_balance':
          if (!processedTokenAddress) {
            throw new Error(
              'tokenAddress is required for get_token_balance operation',
            );
          }
          result = await this.getTokenBalance(
            network,
            processedAddress,
            processedTokenAddress,
            retries,
          );
          break;
        case 'get_token_info':
          if (!processedTokenAddress) {
            throw new Error(
              'tokenAddress is required for get_token_info operation',
            );
          }
          result = await this.getTokenInfo(
            network,
            processedTokenAddress,
            retries,
          );
          break;
        case 'get_nft_balance':
          if (!processedTokenAddress) {
            throw new Error(
              'tokenAddress is required for get_nft_balance operation',
            );
          }
          result = await this.getNftBalance(
            network,
            processedAddress,
            processedTokenAddress,
            retries,
          );
          break;
        case 'call_contract':
          if (!processedContractAddress || !methodName) {
            throw new Error(
              'contractAddress and methodName are required for call_contract operation',
            );
          }
          const processedParams = this.processTemplateArray(
            methodParams,
            ctx.inputs || {},
          );
          result = await this.callContract(
            network,
            processedContractAddress,
            methodName,
            processedParams,
            retries,
          );
          break;
        case 'get_transaction':
          const txHash = this.processTemplate(
            cfg.transactionHash || cfg.txHash || '',
            ctx.inputs || {},
          );
          if (!txHash) {
            throw new Error(
              'transactionHash or txHash is required for get_transaction operation',
            );
          }
          result = await this.getTransaction(network, txHash, retries);
          break;
        case 'get_transaction_receipt':
          const txHashReceipt = this.processTemplate(
            cfg.transactionHash || cfg.txHash || '',
            ctx.inputs || {},
          );
          if (!txHashReceipt) {
            throw new Error(
              'transactionHash or txHash is required for get_transaction_receipt operation',
            );
          }
          result = await this.getTransactionReceipt(
            network,
            txHashReceipt,
            retries,
          );
          break;
        case 'get_block':
          const blockNumber = this.processTemplate(
            cfg.blockNumber || 'latest',
            ctx.inputs || {},
          );
          result = await this.getBlock(network, blockNumber, retries);
          break;
        case 'get_logs':
          result = await this.getLogs(network, cfg, retries);
          break;
        default:
          throw new Error(`Unknown blockchain operation: ${operation}`);
      }

      return {
        operation,
        network,
        address: processedAddress,
        tokenAddress: processedTokenAddress,
        contractAddress: processedContractAddress,
        data: result,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `Blockchain read operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  /**
   * Get native token balance (ETH, MATIC, etc.)
   */
  private async getBalance(
    network: string,
    address: string,
    retries: number,
  ): Promise<any> {
    const url = this.buildRpcUrl(network);

    return retry(
      async () => {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getBalance',
            params: [address, 'latest'],
            id: 1,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(`RPC Error: ${data.error.message}`);
        }

        const balanceWei = BigInt(data.result);
        const balanceEth = Number(balanceWei) / Math.pow(10, 18);

        return {
          balanceWei: balanceWei.toString(),
          balanceEth: balanceEth,
          formatted: `${balanceEth.toFixed(6)} ${this.getNativeSymbol(network)}`,
          raw: data.result,
        };
      },
      {
        retries,
        factor: 2,
        minTimeout: 1000,
        maxTimeout: 5000,
        onRetry: (error, attempt) => {
          this.logger.warn(
            `Retry attempt ${attempt} for balance check: ${error.message}`,
          );
        },
      },
    );
  }

  /**
   * Get ERC-20 token balance
   */
  private async getTokenBalance(
    network: string,
    address: string,
    tokenAddress: string,
    retries: number,
  ): Promise<any> {
    const url = this.buildRpcUrl(network);

    // ERC-20 balanceOf method signature
    const methodSignature = '0x70a08231'; // balanceOf(address)
    const paddedAddress = address.slice(2).padStart(64, '0'); // Remove 0x and pad
    const data = methodSignature + paddedAddress;

    return retry(
      async () => {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [
              {
                to: tokenAddress,
                data: data,
              },
              'latest',
            ],
            id: 1,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.error) {
          throw new Error(`RPC Error: ${result.error.message}`);
        }

        const balanceHex = result.result;
        const balanceWei = BigInt(balanceHex);

        // Get token decimals and symbol
        const tokenInfo = await this.getTokenInfo(
          network,
          tokenAddress,
          retries,
        );
        const decimals = tokenInfo.decimals || 18;
        const symbol = tokenInfo.symbol || 'TOKEN';

        const balance = Number(balanceWei) / Math.pow(10, decimals);

        return {
          balanceWei: balanceWei.toString(),
          balance: balance,
          decimals: decimals,
          symbol: symbol,
          formatted: `${balance.toFixed(6)} ${symbol}`,
          tokenAddress: tokenAddress,
          raw: balanceHex,
        };
      },
      {
        retries,
        factor: 2,
        minTimeout: 1000,
        maxTimeout: 5000,
        onRetry: (error, attempt) => {
          this.logger.warn(
            `Retry attempt ${attempt} for token balance: ${error.message}`,
          );
        },
      },
    );
  }

  /**
   * Get token information (name, symbol, decimals)
   */
  private async getTokenInfo(
    network: string,
    tokenAddress: string,
    retries: number,
  ): Promise<any> {
    const url = this.buildRpcUrl(network);

    const methods = [
      { name: 'name', signature: '0x06fdde03' },
      { name: 'symbol', signature: '0x95d89b41' },
      { name: 'decimals', signature: '0x313ce567' },
    ];

    return retry(
      async () => {
        const results: any = {};

        for (const method of methods) {
          try {
            const response = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_call',
                params: [
                  {
                    to: tokenAddress,
                    data: method.signature,
                  },
                  'latest',
                ],
                id: 1,
              }),
            });

            const data = await response.json();

            if (!data.error) {
              if (method.name === 'decimals') {
                results[method.name] = parseInt(data.result, 16);
              } else {
                // Decode string result (simplified - assumes return is string)
                const hex = data.result.slice(2);
                const decoded = this.decodeString(hex);
                results[method.name] = decoded;
              }
            }
          } catch (error) {
            this.logger.warn(
              `Failed to get ${method.name} for token ${tokenAddress}: ${error}`,
            );
          }
        }

        return {
          name: results.name || 'Unknown Token',
          symbol: results.symbol || 'UNKNOWN',
          decimals: results.decimals || 18,
          address: tokenAddress,
        };
      },
      {
        retries,
        factor: 2,
        minTimeout: 1000,
        maxTimeout: 5000,
      },
    );
  }

  /**
   * Get NFT balance
   */
  private async getNftBalance(
    network: string,
    address: string,
    contractAddress: string,
    retries: number,
  ): Promise<any> {
    // This is a simplified implementation - in reality you'd need to handle different NFT standards
    const url = this.buildRpcUrl(network);

    // ERC-721 balanceOf method
    const methodSignature = '0x70a08231'; // balanceOf(address)
    const paddedAddress = address.slice(2).padStart(64, '0');
    const data = methodSignature + paddedAddress;

    return retry(
      async () => {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [
              {
                to: contractAddress,
                data: data,
              },
              'latest',
            ],
            id: 1,
          }),
        });

        const result = await response.json();
        const balance = parseInt(result.result, 16);

        return {
          balance: balance,
          contractAddress: contractAddress,
          address: address,
        };
      },
      { retries, factor: 2, minTimeout: 1000, maxTimeout: 5000 },
    );
  }

  /**
   * Call contract method
   */
  private async callContract(
    network: string,
    contractAddress: string,
    methodName: string,
    params: any[],
    retries: number,
  ): Promise<any> {
    // This is a simplified implementation - in production you'd need ABI encoding
    const url = this.buildRpcUrl(network);

    return retry(
      async () => {
        // For now, just return a placeholder - proper implementation would need ABI
        throw new Error(
          'Contract calls require ABI encoding - not implemented in this simplified version',
        );
      },
      { retries, factor: 2, minTimeout: 1000, maxTimeout: 5000 },
    );
  }

  /**
   * Get transaction details
   */
  private async getTransaction(
    network: string,
    txHash: string,
    retries: number,
  ): Promise<any> {
    const url = this.buildRpcUrl(network);

    return retry(
      async () => {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getTransactionByHash',
            params: [txHash],
            id: 1,
          }),
        });

        const data = await response.json();
        return data.result;
      },
      { retries, factor: 2, minTimeout: 1000, maxTimeout: 5000 },
    );
  }

  /**
   * Get transaction receipt
   */
  private async getTransactionReceipt(
    network: string,
    txHash: string,
    retries: number,
  ): Promise<any> {
    const url = this.buildRpcUrl(network);

    return retry(
      async () => {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getTransactionReceipt',
            params: [txHash],
            id: 1,
          }),
        });

        const data = await response.json();
        return data.result;
      },
      { retries, factor: 2, minTimeout: 1000, maxTimeout: 5000 },
    );
  }

  /**
   * Get block information
   */
  private async getBlock(
    network: string,
    blockNumber: string,
    retries: number,
  ): Promise<any> {
    const url = this.buildRpcUrl(network);

    return retry(
      async () => {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getBlockByNumber',
            params: [
              blockNumber === 'latest'
                ? 'latest'
                : `0x${parseInt(blockNumber).toString(16)}`,
              true,
            ],
            id: 1,
          }),
        });

        const data = await response.json();
        if (data.error) {
          throw new Error(`RPC Error: ${data.error.message}`);
        }
        return data.result;
      },
      { retries, factor: 2, minTimeout: 1000, maxTimeout: 5000 },
    );
  }

  /**
   * Get event logs
   */
  private async getLogs(
    network: string,
    cfg: any,
    retries: number,
  ): Promise<any> {
    const url = this.buildRpcUrl(network);

    return retry(
      async () => {
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_getLogs',
            params: [
              {
                address: cfg.address || undefined,
                fromBlock: cfg.fromBlock || 'latest',
                toBlock: cfg.toBlock || 'latest',
                topics: cfg.topics || undefined,
              },
            ],
            id: 1,
          }),
        });

        const data = await response.json();
        if (data.error) {
          throw new Error(`RPC Error: ${data.error.message}`);
        }
        return data.result;
      },
      { retries, factor: 2, minTimeout: 1000, maxTimeout: 5000 },
    );
  }

  /**
   * Helper methods
   */
  private buildRpcUrl(network: string): string {
    // In production, these should come from environment variables
    const rpcUrls: Record<string, string> = {
      ethereum: 'https://eth-mainnet.alchemyapi.io/v2/demo',
      polygon: 'https://polygon-rpc.com',
      base: 'https://mainnet.base.org',
      optimism: 'https://mainnet.optimism.io',
      arbitrum: 'https://arb1.arbitrum.io/rpc',
      bsc: 'https://bsc-dataseed.binance.org',
      sepolia: 'https://eth-sepolia.g.alchemy.com/v2/demo',
      'base-sepolia': 'https://sepolia.base.org',
      base_sepolia: 'https://sepolia.base.org',
      'polygon-amoy': 'https://rpc-amoy.polygon.technology',
    };

    if (!rpcUrls[network]) {
      throw new Error(
        `Unsupported network: ${network}. Supported networks: ${Object.keys(rpcUrls).join(', ')}`,
      );
    }

    return rpcUrls[network];
  }

  private getNativeSymbol(network: string): string {
    const symbols: Record<string, string> = {
      ethereum: 'ETH',
      polygon: 'MATIC',
      base: 'ETH',
      optimism: 'ETH',
      arbitrum: 'ETH',
      bsc: 'BNB',
      sepolia: 'ETH',
      'base-sepolia': 'ETH',
      base_sepolia: 'ETH',
      'polygon-amoy': 'MATIC',
    };
    return symbols[network] || 'TOKEN';
  }

  private processTemplate(
    template: string,
    inputs: Record<string, any>,
  ): string {
    return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (match, path) => {
      const value = this.getNestedValue(inputs, path);
      return value !== undefined ? String(value) : match;
    });
  }

  private processTemplateArray(arr: any[], inputs: Record<string, any>): any[] {
    return arr.map((item) => {
      if (typeof item === 'string') {
        return this.processTemplate(item, inputs);
      }
      return item;
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' ? current[key] : undefined;
    }, obj);
  }

  private decodeString(hex: string): string {
    // Simplified string decoder - in production use a proper ABI decoder
    try {
      const bytes = [];
      for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
      }
      return String.fromCharCode(...bytes.filter((b) => b !== 0));
    } catch (error) {
      return '';
    }
  }
}
