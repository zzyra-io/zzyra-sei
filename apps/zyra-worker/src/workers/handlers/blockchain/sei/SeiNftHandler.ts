import { z } from 'zod';
import { ethers } from 'ethers';
import { seiNftSchema } from '@zyra/types';
import { SeiRpcClient } from './services/SeiRpcClient';
import { SeiWalletService } from './services/SeiWalletService';

interface BlockExecutionContext {
  inputs?: Record<string, any>;
  previousOutputs?: Record<string, any>;
  variables?: Record<string, any>;
  workflowId?: string;
  executionId?: string;
  userId?: string;
}

/**
 * Sei NFT Handler
 * Manages NFT operations on Sei blockchain
 */
export class SeiNftHandler {
  static readonly inputSchema = seiNftSchema.inputSchema;
  static readonly outputSchema = seiNftSchema.outputSchema;
  static readonly configSchema = seiNftSchema.configSchema;

  private rpcClients: Map<string, SeiRpcClient> = new Map();
  private walletServices: Map<string, SeiWalletService> = new Map();

  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    const startTime = Date.now();

    try {
      const config = this.validateAndExtractConfig(node, ctx);
      const inputs = this.validateInputs(
        ctx.inputs || {},
        ctx.previousOutputs || {},
        ctx,
      );

      if (!ctx.userId) {
        throw new Error('User ID is required for NFT operations');
      }

      const client = this.getRpcClient(config.network);
      const walletService = this.getWalletService(config.network);

      switch (config.operation) {
        case 'mint':
          return await this.handleMint(
            config,
            inputs,
            walletService,
            ctx.userId,
          );
        case 'transfer':
          return await this.handleTransfer(
            config,
            inputs,
            walletService,
            ctx.userId,
          );
        case 'monitor':
          return await this.handleMonitor(config, inputs, client);
        default:
          throw new Error(`Unsupported NFT operation: ${config.operation}`);
      }
    } catch (error: any) {
      const executionTime = Date.now() - startTime;

      return {
        success: false,
        error: error.message,
        network: node.config?.network || 'unknown',
        executionTime,
        timestamp: new Date().toISOString(),
      };
    }
  }

  private async handleMint(
    config: any,
    inputs: any,
    walletService: SeiWalletService,
    userId: string,
  ): Promise<any> {
    const contractAddress = inputs.contractAddress || config.contractAddress;
    const metadata = inputs.metadata || config.metadata;

    if (!contractAddress) {
      throw new Error('NFT contract address is required for minting');
    }

    if (!metadata) {
      throw new Error('NFT metadata is required for minting');
    }

    // Build mint transaction
    const mintData = this.buildMintCallData(metadata);
    const transaction = {
      to: contractAddress,
      data: mintData,
      value: ethers.parseEther(config.mintPrice?.toString() || '0'),
    };

    // Validate and execute
    walletService.validateTransaction(transaction);

    const result = await walletService.delegateTransaction(
      userId,
      transaction,
      config.network,
    );

    return {
      success: true,
      operation: 'mint',
      txHash: result.txHash,
      status: result.status,
      contractAddress,
      metadata,
      network: config.network,
      timestamp: new Date().toISOString(),
    };
  }

  private async handleTransfer(
    config: any,
    inputs: any,
    walletService: SeiWalletService,
    userId: string,
  ): Promise<any> {
    const contractAddress = inputs.contractAddress || config.contractAddress;
    const tokenId = inputs.tokenId || config.tokenId;
    const recipientAddress = inputs.recipientAddress || config.recipientAddress;

    if (!contractAddress || !tokenId || !recipientAddress) {
      throw new Error(
        'Contract address, token ID, and recipient address are required for transfer',
      );
    }

    // Build transfer transaction
    const transferData = this.buildTransferCallData(recipientAddress, tokenId);
    const transaction = {
      to: contractAddress,
      data: transferData,
    };

    // Validate and execute
    walletService.validateTransaction(transaction);

    const result = await walletService.delegateTransaction(
      userId,
      transaction,
      config.network,
    );

    return {
      success: true,
      operation: 'transfer',
      txHash: result.txHash,
      status: result.status,
      contractAddress,
      tokenId,
      recipientAddress,
      network: config.network,
      timestamp: new Date().toISOString(),
    };
  }

  private async handleMonitor(
    config: any,
    inputs: any,
    client: SeiRpcClient,
  ): Promise<any> {
    const contractAddress = inputs.contractAddress || config.contractAddress;
    const walletAddress = inputs.walletAddress || config.walletAddress;

    if (!contractAddress) {
      throw new Error('NFT contract address is required for monitoring');
    }

    // Get NFT events
    const events = await this.getNFTEvents(
      client,
      contractAddress,
      walletAddress,
    );

    return {
      success: true,
      operation: 'monitor',
      contractAddress,
      walletAddress,
      events,
      totalEvents: events.length,
      network: config.network,
      timestamp: new Date().toISOString(),
    };
  }

  private buildMintCallData(metadata: any): string {
    // ERC721 mint function signature
    const mintSignature = 'mint(address,string)';
    const mintSelector = ethers.id(mintSignature).slice(0, 10);

    // Encode parameters (simplified)
    const toAddress = '0x0000000000000000000000000000000000000000'; // Will be set by contract
    const metadataUri = metadata.uri || '';

    const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'string'],
      [toAddress, metadataUri],
    );

    return mintSelector + encodedParams.slice(2);
  }

  private buildTransferCallData(
    recipientAddress: string,
    tokenId: string,
  ): string {
    // ERC721 transfer function signature
    const transferSignature = 'transferFrom(address,address,uint256)';
    const transferSelector = ethers.id(transferSignature).slice(0, 10);

    // Encode parameters
    const fromAddress = '0x0000000000000000000000000000000000000000'; // Will be set by contract
    const encodedParams = ethers.AbiCoder.defaultAbiCoder().encode(
      ['address', 'address', 'uint256'],
      [fromAddress, recipientAddress, tokenId],
    );

    return transferSelector + encodedParams.slice(2);
  }

  private async getNFTEvents(
    client: SeiRpcClient,
    contractAddress: string,
    walletAddress?: string,
  ): Promise<any[]> {
    // Get recent NFT transfer events
    const transferEventTopic = ethers.id('Transfer(address,address,uint256)');

    const logs = await client.getLogs({
      fromBlock: ethers.toBeHex('latest'),
      toBlock: ethers.toBeHex('latest'),
      address: contractAddress,
      topics: [transferEventTopic],
    });

    const events = logs.map((log: any) => ({
      eventType: 'transfer',
      txHash: log.transactionHash,
      blockNumber: parseInt(log.blockNumber, 16),
      fromAddress: ethers.getAddress('0x' + log.topics[1]?.slice(26) || '0'),
      toAddress: ethers.getAddress('0x' + log.topics[2]?.slice(26) || '0'),
      tokenId: BigInt(log.data).toString(),
      contractAddress,
      timestamp: new Date().toISOString(),
    }));

    // Filter by wallet address if provided
    if (walletAddress) {
      return events.filter(
        (event: any) =>
          event.fromAddress.toLowerCase() === walletAddress.toLowerCase() ||
          event.toAddress.toLowerCase() === walletAddress.toLowerCase(),
      );
    }

    return events;
  }

  private validateAndExtractConfig(node: any, ctx: BlockExecutionContext): any {
    const config = node.config || node.data?.config || {};
    return SeiNftHandler.configSchema.parse(config);
  }

  private validateInputs(
    inputs: Record<string, any>,
    previousOutputs: Record<string, any>,
    ctx: BlockExecutionContext,
  ): Record<string, any> {
    return SeiNftHandler.inputSchema.parse({
      ...inputs,
      ...previousOutputs,
    });
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

  private getWalletService(network: string): SeiWalletService {
    if (!this.walletServices.has(network)) {
      const client = this.getRpcClient(network);
      this.walletServices.set(
        network,
        new SeiWalletService(client.getProvider()),
      );
    }

    return this.walletServices.get(network)!;
  }
}
