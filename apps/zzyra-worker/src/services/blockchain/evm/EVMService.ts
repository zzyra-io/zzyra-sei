/**
 * EVM Service - Handles traditional EVM blockchain transactions
 * Extracted from SendTransactionBlock for reusability
 */

import { Injectable } from '@nestjs/common';
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  encodeFunctionData,
  Address,
  parseUnits,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { BaseBlockchainService } from '../base/BaseBlockchainService';
import {
  TransactionRequest,
  TransactionResult,
  GasEstimate,
} from '../types/blockchain.types';

// SEI Testnet configuration
const SEI_TESTNET_CONFIG = {
  id: 1328,
  name: 'SEI Testnet',
  network: 'sei-testnet',
  nativeCurrency: { name: 'SEI', symbol: 'SEI', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://evm-rpc-testnet.sei-labs.io'] },
    public: { http: ['https://evm-rpc-testnet.sei-labs.io'] },
  },
  blockExplorers: {
    default: { name: 'Seitrace', url: 'https://seitrace.com' },
  },
  testnet: true,
};

// ERC20 ABI for token transfers
const ERC20_ABI = [
  {
    inputs: [
      { name: '_to', type: 'address' },
      { name: '_value', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

@Injectable()
export class EVMService extends BaseBlockchainService {
  /**
   * Execute a standard EVM transaction
   */
  async executeTransaction(
    transaction: TransactionRequest,
    walletConfig: { privateKey: string; address: string },
  ): Promise<TransactionResult> {
    try {
      // Validate transaction parameters
      const validation = this.validateTransactionParameters(transaction);
      if (!validation.valid) {
        throw new Error(
          `Transaction validation failed: ${validation.errors.join(', ')}`,
        );
      }

      // Determine transaction type
      if (transaction.chainId === 1328) {
        return await this.executeSeiTransaction(transaction, walletConfig);
      } else {
        return await this.executeGeneralEvmTransaction(
          transaction,
          walletConfig,
        );
      }
    } catch (error) {
      this.logger.error('EVM transaction execution failed', {
        error: error instanceof Error ? error.message : String(error),
        transaction: {
          chainId: transaction.chainId,
          to: transaction.to,
          value: transaction.value,
        },
      });

      return {
        hash: '',
        success: false,
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Execute SEI testnet transaction
   */
  private async executeSeiTransaction(
    transaction: TransactionRequest,
    walletConfig: { privateKey: string; address: string },
  ): Promise<TransactionResult> {
    const { chainId, to: recipientAddress, value: amount, data } = transaction;

    try {
      // Create account from private key
      const formattedPk = this.formatPrivateKey(walletConfig.privateKey);
      const account = privateKeyToAccount(formattedPk);

      this.logger.log('Connecting to SEI testnet EVM', {
        rpcUrl: SEI_TESTNET_CONFIG.rpcUrls.default.http[0],
        fromAddress: account.address,
        toAddress: recipientAddress,
        amount,
      });

      // Create public client for reading blockchain state
      const publicClient = createPublicClient({
        chain: SEI_TESTNET_CONFIG as any,
        transport: http(SEI_TESTNET_CONFIG.rpcUrls.default.http[0]),
      });

      // Create wallet client for sending transactions
      const walletClient = createWalletClient({
        account,
        chain: SEI_TESTNET_CONFIG as any,
        transport: http(SEI_TESTNET_CONFIG.rpcUrls.default.http[0]),
      });

      // Validate recipient address format
      if (!this.isValidAddress(recipientAddress)) {
        throw new Error('Invalid recipient address format');
      }

      // Parse amount to wei (SEI uses 18 decimals like ETH)
      const value = parseEther(this.validateAndNormalizeValue(amount));

      // Check balance before transaction
      const balance = await publicClient.getBalance({
        address: account.address,
      });

      if (balance < value) {
        throw new Error(
          `Insufficient balance. Have: ${formatEther(balance)} SEI, Need: ${amount} SEI`,
        );
      }

      // Estimate gas
      const gasEstimate = await publicClient.estimateGas({
        account: account.address,
        to: recipientAddress as `0x${string}`,
        value,
        data: data as `0x${string}`,
      });

      this.logger.debug('Gas estimation completed', {
        estimatedGas: gasEstimate.toString(),
        balance: formatEther(balance),
      });

      // Send the transaction
      const hash = await walletClient.sendTransaction({
        account,
        to: recipientAddress as `0x${string}`,
        value,
        gas: gasEstimate,
        data: data as `0x${string}`,
        kzg: undefined,
      } as any); // Type assertion to bypass kzg requirement

      this.logger.log('SEI transaction submitted', {
        txHash: hash,
        from: account.address,
        to: recipientAddress,
        amount,
        gasEstimate: gasEstimate.toString(),
      });

      // Wait for transaction confirmation
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        timeout: 60_000, // 60 seconds timeout
      });

      const explorerUrl = this.getExplorerUrl(chainId, hash);

      this.logger.log('SEI transaction confirmed', {
        txHash: hash,
        blockNumber: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status,
        explorerUrl,
      });

      return {
        hash,
        blockNumber: Number(receipt.blockNumber),
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 'success' ? 'success' : 'failed',
        success: receipt.status === 'success',
        explorerUrl,
      };
    } catch (error) {
      this.logger.error('SEI transaction failed', { chainId, error });
      throw error;
    }
  }

  /**
   * Execute general EVM transaction (for other EVM chains)
   */
  private async executeGeneralEvmTransaction(
    transaction: TransactionRequest,
    walletConfig: { privateKey: string; address: string },
  ): Promise<TransactionResult> {
    const { chainId, to: recipientAddress, value: amount } = transaction;

    try {
      // Get chain configuration
      const chain = this.getChainConfig(chainId);

      // Create account from private key
      const formattedPk = this.formatPrivateKey(walletConfig.privateKey);
      const account = privateKeyToAccount(formattedPk);

      // Create clients
      const publicClient = createPublicClient({
        chain,
        transport: http(chain.rpcUrls.default.http[0]),
      });

      const walletClient = createWalletClient({
        account,
        chain,
        transport: http(chain.rpcUrls.default.http[0]),
      });

      this.logger.log('Connecting to EVM chain', {
        chainId,
        chainName: chain.name,
        rpcUrl: chain.rpcUrls.default.http[0],
        fromAddress: account.address,
        toAddress: recipientAddress,
        amount,
      });

      // Validate recipient address
      if (!this.isValidAddress(recipientAddress)) {
        throw new Error('Invalid recipient address format');
      }

      // Parse amount
      const value = parseEther(this.validateAndNormalizeValue(amount));

      // Check balance
      const balance = await publicClient.getBalance({
        address: account.address,
      });

      if (balance < value) {
        throw new Error(
          `Insufficient balance. Have: ${formatEther(balance)} ${chain.nativeCurrency.symbol}, Need: ${amount} ${chain.nativeCurrency.symbol}`,
        );
      }

      // Estimate gas
      const gasEstimate = await publicClient.estimateGas({
        account: account.address,
        to: recipientAddress as `0x${string}`,
        value,
        data: transaction.data as `0x${string}`,
      });

      // Send transaction
      const hash = await walletClient.sendTransaction({
        account,
        to: recipientAddress as `0x${string}`,
        value,
        gas: gasEstimate,
        data: transaction.data as `0x${string}`,
        kzg: undefined,
      } as any);

      // Wait for confirmation
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        timeout: 60_000,
      });

      const explorerUrl = this.getExplorerUrl(chainId, hash);

      this.logger.log('EVM transaction confirmed', {
        chainId,
        txHash: hash,
        blockNumber: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status,
        explorerUrl,
      });

      return {
        hash,
        blockNumber: Number(receipt.blockNumber),
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 'success' ? 'success' : 'failed',
        success: receipt.status === 'success',
        explorerUrl,
      };
    } catch (error) {
      this.logger.error('EVM transaction failed', { chainId, error });
      throw error;
    }
  }

  /**
   * Execute ERC20 token transfer
   */
  async executeERC20Transfer(
    tokenAddress: string,
    toAddress: string,
    amount: string,
    decimals: number,
    transaction: TransactionRequest,
    walletConfig: { privateKey: string; address: string },
  ): Promise<TransactionResult> {
    try {
      // Encode ERC20 transfer data
      const transferData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [
          toAddress as Address,
          parseUnits(this.validateAndNormalizeValue(amount), decimals),
        ],
      });

      // Execute as contract interaction
      const tokenTransaction: TransactionRequest = {
        ...transaction,
        to: tokenAddress,
        value: '0', // No native token value for ERC20 transfers
        data: transferData,
      };

      return await this.executeTransaction(tokenTransaction, walletConfig);
    } catch (error) {
      this.logger.error('ERC20 transfer failed', {
        error: error instanceof Error ? error.message : String(error),
        tokenAddress,
        toAddress,
        amount,
      });
      throw error;
    }
  }

  /**
   * Estimate gas for a transaction
   */
  async estimateGas(transaction: TransactionRequest): Promise<GasEstimate> {
    try {
      const publicClient = this.createPublicClient(transaction.chainId);

      const gasEstimate = await publicClient.estimateGas({
        to: transaction.to as `0x${string}`,
        value: parseEther(this.validateAndNormalizeValue(transaction.value)),
        data: transaction.data as `0x${string}`,
      });

      // Get current gas prices
      const gasPrices = await this.getCurrentGasPrices(transaction.chainId);

      return {
        callGasLimit: gasEstimate.toString(),
        maxFeePerGas: gasPrices.maxFeePerGas,
        maxPriorityFeePerGas: gasPrices.maxPriorityFeePerGas,
      };
    } catch (error) {
      this.logger.warn('Gas estimation failed, using defaults', { error });

      // Return default values
      return {
        callGasLimit: '21000',
        maxFeePerGas: '2000000000', // 2 gwei
        maxPriorityFeePerGas: '1000000000', // 1 gwei
      };
    }
  }

  /**
   * Get current gas prices for the network
   */
  async getCurrentGasPrices(chainId: number): Promise<{
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
  }> {
    try {
      const publicClient = this.createPublicClient(chainId);

      // Try to get EIP-1559 gas prices
      try {
        const gasPrice = await publicClient.getGasPrice();
        const maxFeePerGas = (gasPrice * 110n) / 100n; // 110% of current gas price
        const maxPriorityFeePerGas = gasPrice / 10n; // 10% tip

        return {
          maxFeePerGas: maxFeePerGas.toString(),
          maxPriorityFeePerGas: maxPriorityFeePerGas.toString(),
        };
      } catch {
        // Fallback to legacy gas price
        const gasPrice = await publicClient.getGasPrice();
        return {
          maxFeePerGas: gasPrice.toString(),
          maxPriorityFeePerGas: (gasPrice / 10n).toString(),
        };
      }
    } catch (error) {
      this.logger.warn('Failed to get gas prices, using defaults', { error });

      // Return default values
      return {
        maxFeePerGas: '2000000000', // 2 gwei
        maxPriorityFeePerGas: '1000000000', // 1 gwei
      };
    }
  }

  /**
   * Get native token balance for an address
   */
  async getNativeBalance(address: string, chainId: number): Promise<string> {
    try {
      const publicClient = this.createPublicClient(chainId);
      const balance = await publicClient.getBalance({
        address: address as Address,
      });

      return formatEther(balance);
    } catch (error) {
      this.logger.error('Failed to get native balance', {
        error,
        address,
        chainId,
      });
      return '0';
    }
  }

  /**
   * Get ERC20 token balance for an address
   */
  async getTokenBalance(
    tokenAddress: string,
    walletAddress: string,
    chainId: number,
  ): Promise<string> {
    try {
      const publicClient = this.createPublicClient(chainId);

      const balance = await publicClient.readContract({
        address: tokenAddress as Address,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [walletAddress as Address],
      });

      return balance.toString();
    } catch (error) {
      this.logger.error('Failed to get token balance', {
        error,
        tokenAddress,
        walletAddress,
        chainId,
      });
      return '0';
    }
  }

  /**
   * Validate transaction before execution
   */
  async validateTransaction(transaction: TransactionRequest): Promise<{
    valid: boolean;
    errors: string[];
  }> {
    return this.validateTransactionParameters(transaction);
  }

  /**
   * Health check for the service
   */
  async healthCheck(chainId: number): Promise<{
    healthy: boolean;
    latency?: number;
    blockNumber?: number;
    error?: string;
  }> {
    try {
      const startTime = Date.now();
      const publicClient = this.createPublicClient(chainId);

      const blockNumber = await publicClient.getBlockNumber();
      const latency = Date.now() - startTime;

      return {
        healthy: true,
        latency,
        blockNumber: Number(blockNumber),
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Format private key to ensure proper 0x prefix
   */
  private formatPrivateKey(privateKey: string): `0x${string}` {
    if (!privateKey.startsWith('0x')) {
      return `0x${privateKey}`;
    }
    return privateKey as `0x${string}`;
  }
}
