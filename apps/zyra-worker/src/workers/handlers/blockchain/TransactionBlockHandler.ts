import { JsonRpcProvider, Wallet, hexlify, parseEther, TransactionResponse, TransactionReceipt, FeeData } from 'ethers';


import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createServiceClient } from '../../../lib/supabase/serviceClient';
import { CircuitBreaker } from '../../../lib/blockchain/CircuitBreaker';
import { CircuitBreakerDbService } from '../../../lib/blockchain/CircuitBreakerDbService';
import { isRecoverableError } from './isRecoverableError';
import { PublicClient } from 'viem';
import { createPublicClient, createWalletClient, http, parseGwei, formatGwei } from 'viem';
import * as chains from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { BlockExecutionContext, BlockHandler } from '@zyra/types';


interface ChainConfig {
  name: string;
  rpcUrl: string;
  chainId: number;
  currency: string;
  explorer: string;
  gasMultiplier?: number;
}

interface TransactionConfig {
  to: string;
  value: string;
  data?: string;
  gasLimit?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  chainId?: number;
  nonce?: number;
}

/**
 * Enum to categorize different types of blockchain transaction errors
 * for better error handling and circuit breaker implementation
 */
enum TransactionErrorType {
  VALIDATION = 'validation', // Input validation errors
  CONFIGURATION = 'configuration', // Missing config or environment variables
  TRANSACTION_CREATION = 'transaction_creation', // Error creating transaction
  TRANSACTION_EXECUTION = 'transaction_execution', // Error executing transaction
  TRANSACTION_TIMEOUT = 'transaction_timeout', // Transaction timed out
  NETWORK = 'network', // Network connectivity issues
  UNKNOWN = 'unknown' // Uncategorized errors
}

/**
 * Custom error class for transaction errors
 * Helps with categorizing errors for circuit breaker pattern
 */
class TransactionError extends Error {
  constructor(
    message: string,
    public readonly type: TransactionErrorType,
    public readonly metadata: Record<string, any> = {}
  ) {
    super(message);
    this.name = 'TransactionError';
  }
}

@Injectable()
export class TransactionBlockHandler implements BlockHandler {
  private readonly logger = new Logger(TransactionBlockHandler.name);
  constructor(
    private readonly circuitBreaker: CircuitBreaker,
    private readonly circuitBreakerDb: CircuitBreakerDbService,
    private configService: ConfigService
  ) {}

  private providers: Map<number, JsonRpcProvider> = new Map();
  private wallets: Map<number, Wallet> = new Map();
  private chainConfigs: Map<number, ChainConfig> = new Map();

  /**
   * Initialize supported blockchain networks from environment variables
   */
  private initializeChains(): void {
    // Default Ethereum Mainnet configuration
    const defaultChain: ChainConfig = {
      name: 'Ethereum Mainnet',
      rpcUrl: process.env.ETHEREUM_RPC_URL || '',
      chainId: 1,
      currency: 'ETH',
      explorer: 'https://etherscan.io',
      gasMultiplier: 1.1
    };

    // Initialize default chain if RPC URL is provided
    if (defaultChain.rpcUrl) {
      this.addChain(defaultChain);
    }

    // Load additional chains from environment
    // Format: CHAIN_<ID>_RPC_URL, CHAIN_<ID>_NAME, etc.
    const envVars = process.env;
    const chainRegex = /^CHAIN_(\d+)_RPC_URL$/;

    for (const key in envVars) {
      const match = key.match(chainRegex);
      if (match && match[1]) {
        const chainId = parseInt(match[1], 10);
        const rpcUrl = envVars[key];

        if (rpcUrl) {
          const chainConfig: ChainConfig = {
            name: envVars[`CHAIN_${chainId}_NAME`] || `Chain ${chainId}`,
            rpcUrl: rpcUrl,
            chainId: chainId,
            currency: envVars[`CHAIN_${chainId}_CURRENCY`] || 'ETH',
            explorer: envVars[`CHAIN_${chainId}_EXPLORER`] || '',
            gasMultiplier: parseFloat(envVars[`CHAIN_${chainId}_GAS_MULTIPLIER`] || '1.1')
          };

          this.addChain(chainConfig);
        }
      }
    }

    // Log initialized chains
    this.logger.log(`Initialized ${this.chainConfigs.size} blockchain networks`);
    for (const [chainId, config] of this.chainConfigs.entries()) {
      this.logger.log(`Chain ID ${chainId}: ${config.name}`);
    }
  }

  /**
   * Add a new blockchain configuration
   */
  private addChain(config: ChainConfig): void {
    try {
      const provider = new JsonRpcProvider(config.rpcUrl);
      const privateKeyEnv = process.env[`CHAIN_${config.chainId}_PRIVATE_KEY`] || process.env.ETHEREUM_PRIVATE_KEY;

      if (!privateKeyEnv) {
        throw new Error(`Private key for chain ID ${config.chainId} not found`);
      }

      const wallet = new Wallet(privateKeyEnv, provider);

      this.providers.set(config.chainId, provider);
      this.wallets.set(config.chainId, wallet);
      this.chainConfigs.set(config.chainId, config);

      this.logger.log(`Added chain ${config.name} (ID: ${config.chainId})`);
    } catch (error) {
      this.logger.error(`Failed to add chain ${config.name}: ${(error as Error).message}`);
    }
  }

  /**
   * Execute a blockchain transaction
   */
  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    // Mark execution as started
    ctx.logger?.log('Executing transaction block');

    try {
      // Get the user ID from the context
      const userId = ctx.userId;

      // Validate that we have required config params
      if (!node.data?.config) {
        throw new Error('No configuration provided for transaction');
      }

      // Extract transaction configuration from node data
      const { to, value, data, gasLimit, chainId = 1 } = node.data?.config || {};
      const nodeId = node.id;

      // Validate required parameters
      if (!to) {
        throw new TransactionError(
          'Transaction destination address (to) is required',
          TransactionErrorType.VALIDATION,
          { node_id: nodeId }
        );
      }

      if (!userId) {
        throw new TransactionError(
          'User ID is required for transaction execution',
          TransactionErrorType.VALIDATION,
          { node_id: nodeId }
        );
      }

      // If chain ID is present, use it to check circuit status
      if (chainId && userId) {
        // Check if circuit breaker allows this operation
        const isAllowed = await this.circuitBreakerDb.isOperationAllowed(chainId, userId, 'transaction');

        if (!isAllowed) {
          throw new TransactionError(
            'Circuit breaker is open - too many recent failures',
            TransactionErrorType.TRANSACTION_EXECUTION,
            { userId, walletAddress: (await this.wallets.get(chainId))?.address }
          );
        }
      }

      // Log transaction attempt in database
      // Log the transaction with property names that match the database schema
      await this.circuitBreakerDb.logTransaction({
        user_id: userId,
        node_id: nodeId,
        execution_id: ctx.executionId,
        chain_id: chainId,
        to_address: to,
        data: data || null,
        value: value?.toString() || '0',
        gas_limit: gasLimit?.toString() || null,
        hash: null,
        wallet_address: (await this.wallets.get(chainId))?.address || '',
        status: 'PENDING',
        error: null,
        retry_count: 0
      });

      // Get the appropriate provider and wallet for the specified chain
      const provider = this.providers.get(chainId);
      const wallet = this.wallets.get(chainId);
      const chainConfig = this.chainConfigs.get(chainId);

      if (!provider || !wallet || !chainConfig) {
        throw new Error(`Chain ID ${chainId} is not configured`);
      }

      // Prepare transaction request
      const txRequest: any = {
        to,
        value: parseEther(value.toString()),
        chainId,
      };

      // Add data if provided
      if (data) {
        txRequest.data = hexlify(data);
      }

      // Add gas parameters
      if (gasLimit) {
        txRequest.gasLimit = BigInt(gasLimit);
      } else {
        // Use estimated gas with buffer
        // Get gas estimates from ethers provider directly
        txRequest.gasLimit = BigInt(Math.floor(Number(await provider.estimateGas({
          to,
          value,
          data,
          chainId
        })) * (chainConfig.gasMultiplier || 1.1)));
      }

      // Create a public client for gas estimation and network interaction
      // Use http transport with the RPC URL
      const client = createPublicClient({
        transport: http(chainConfig.rpcUrl)
      });
      // Create wallet client with the private key account
      // Create wallet client with the private key account
      // Skip using walletClient for now and just use ethers.js wallet directly
      // This avoids type compatibility issues between viem and ethers
      // Get gas estimates directly without using a separate function
      // Use provider for gas estimation instead of client to avoid type issues
      const gasEstimate = await provider.estimateGas({
        to,
        value,
        data,
        chainId
      });

      // Set gas parameters if not explicitly provided
      if (!txRequest.gasPrice && !txRequest.maxFeePerGas) {
        // Get fee data from the provider
        const feeData = await provider.getFeeData();

        // For EIP-1559 compatible chains
        if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
          txRequest.maxFeePerGas = feeData.maxFeePerGas;
          txRequest.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
        } else {
          // For legacy transactions
          txRequest.gasPrice = feeData.gasPrice || BigInt(20000000000); // Default to 20 gwei
        }
      }

      // Log transaction details to blockchain database for tracking
      await this.logTransaction('transaction', userId, chainId, {
        to,
        value,
        data: data || null,
        gasLimit: txRequest.gasLimit.toString(),
        retry_count: 0,
        wallet_address: wallet.address || '',
      });

      // Execute transaction with retry and circuit breaker protection
      const maxRetries = 3;
      let currentRetry = 0;

      while (currentRetry <= maxRetries) {
        try {
          // If this is a retry, log it
          if (currentRetry > 0) {
            ctx.logger?.log(`Retry attempt ${currentRetry} of ${maxRetries} for transaction to ${to}`);
          }
          
          // Execute transaction
          ctx.logger?.log(`Executing transaction to ${to}`);
          const tx = await wallet.sendTransaction(txRequest);
          
          ctx.logger?.log(`Transaction submitted: ${tx.hash}`, {
            hash: tx.hash,
            chainId,
            explorer: tx.hash ? `${chainConfig.explorer}/tx/${tx.hash}` : null
          });
          
          // Wait for transaction to be confirmed
          ctx.logger?.log(`Waiting for transaction confirmation...`);
          const receipt = await tx.wait();
          
          const success = receipt.status === 1;
          ctx.logger?.log(`Transaction confirmed with status: ${success ? 'SUCCESS' : 'FAILED'}`);
          
          // Record success or failure in circuit breaker
          if (success) {
            await this.circuitBreakerDb.recordSuccess({
              chainId,
              userId,
              operation: 'transaction',
              metadata: {
                hash: tx.hash,
                blockNumber: receipt.blockNumber,
                status: receipt.status,
                gasUsed: receipt.gasUsed.toString()
              }
            });
            
            return {
              hash: tx.hash,
              blockNumber: receipt.blockNumber,
              status: receipt.status,
              gasUsed: receipt.gasUsed.toString()
            };
          } else {
            await this.circuitBreakerDb.recordFailure({
              chainId,
              userId,
              operation: 'transaction',
              metadata: {
                hash: tx.hash,
                receipt
              }
            });
            
            throw new TransactionError(
              'Transaction failed on-chain',
              TransactionErrorType.TRANSACTION_EXECUTION,
              { hash: tx.hash, receipt }
            );
          }
        } catch (error) {
          const err = error as Error;
          ctx.logger?.error(`Transaction attempt ${currentRetry} failed: ${err.message}`);
          
          // Check if this is a recoverable error that we should retry
          const isRecoverable = isRecoverableError(error);
          
          if (!isRecoverable || currentRetry >= maxRetries) {
            // Either not recoverable or out of retries
            break;
          }
          
          // Continue to next retry
          currentRetry++;
          
          // Wait with exponential backoff before retrying
          const backoffMs = Math.min(1000 * Math.pow(2, currentRetry), 30000);
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }
      
      // If we reached here, all retries failed
      // Record failure in circuit breaker
      await this.circuitBreakerDb.recordFailure({
        chainId,
        userId,
        operation: 'transaction',
        metadata: {}
      });
      
      throw new TransactionError(
        `Transaction failed after ${currentRetry} retries`,
        TransactionErrorType.TRANSACTION_EXECUTION,
        {}
      );
    } catch (error) {
      // Record error in database if userId was available
      const userId = ctx.userId || node.data?.userId;
      const chainId = node.data?.config?.chainId || 1;

      if (userId) {
        // Only record in circuit breaker if this wasn't already a circuit breaker error
        if (!(error instanceof TransactionError &&
              error.message.includes('Circuit breaker is open'))) {
          await this.circuitBreakerDb.recordFailure({
            chainId,
            userId,
            operation: 'transaction',
            metadata: { error: error instanceof Error ? error.message : String(error) }
          });
        }
      }

      // Re-throw error for centralized handling
      throw error;
    }
  }

  /**
   * Estimate gas parameters for a transaction using ethers.js
   */
  private async estimateGas(
    provider: JsonRpcProvider,
    tx: any
  ): Promise<{ gasLimit: bigint; maxFeePerGas?: bigint; maxPriorityFeePerGas?: bigint }> {
    // Use ethers provider to estimate gas
    const gasLimit = await provider.estimateGas(tx);

    // For chains that support EIP-1559, get fee data
    try {
      const feeData = await provider.getFeeData();
      return {
        gasLimit: BigInt(gasLimit.toString()),
        maxFeePerGas: feeData.maxFeePerGas ? BigInt(feeData.maxFeePerGas.toString()) : undefined,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ? BigInt(feeData.maxPriorityFeePerGas.toString()) : undefined,
      };
    } catch (e) {
      // Chain doesn't support EIP-1559, return just the gas limit
      return { gasLimit: BigInt(gasLimit.toString()) };
    }
  }

  /**
   * Log transaction to database for tracking
   */
  /**
   * Log transaction details for tracking and analytics
   */
  private async logTransaction(nodeId: string, userId: string, chainId: number, data: any, error?: Error): Promise<void> {
    try {
      // Convert to a format matching the database schema
      await this.circuitBreakerDb.logTransaction({
        user_id: userId,
        node_id: nodeId,
        execution_id: data.executionId || '',
        chain_id: chainId,
        to_address: data.to || '',
        value: data.value ? data.value.toString() : '0',
        data: data.data || null,
        gas_limit: data.gasLimit ? data.gasLimit.toString() : null,
        hash: data.hash || null,
        status: error ? 'FAILED' : 'SUCCESS',
        error: error ? error.message : null,
        retry_count: data.retryCount || 0,
        wallet_address: data.walletAddress || ''
      });
    } catch (logError) {
      console.error('Failed to log transaction:', logError instanceof Error ? logError.message : String(logError));
    }
  }
}
