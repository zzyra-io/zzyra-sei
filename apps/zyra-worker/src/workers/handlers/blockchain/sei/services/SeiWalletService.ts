import { ethers } from 'ethers';
import axios from 'axios';

/**
 * Sei Wallet Service for transaction delegation and wallet management
 * Uses Magic SDK delegation pattern - no private keys are stored in the worker
 * All transactions are executed on behalf of users through delegation
 */
export class SeiWalletService {
  constructor(private provider: ethers.JsonRpcProvider) {}

  /**
   * Delegate transaction execution to Magic SDK
   * This method sends the transaction details to the API/admin service
   * which handles signing through Magic SDK delegation
   */
  async delegateTransaction(
    userId: string,
    transaction: any,
    network: string
  ): Promise<{
    txHash: string;
    status: 'pending' | 'confirmed' | 'failed';
  }> {
    try {
      const response = await axios.post('/api/wallet/delegate-transaction', {
        userId,
        transaction,
        network,
        timestamp: new Date().toISOString(),
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.WORKER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 60000, // 60 second timeout for transaction execution
      });

      return {
        txHash: response.data.txHash,
        status: response.data.status || 'pending',
      };
    } catch (error: any) {
      throw new Error(`Transaction delegation failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get user's wallet address through delegation
   */
  async getUserWalletAddress(userId: string): Promise<string> {
    try {
      const response = await axios.get(`/api/wallet/address/${userId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.WORKER_API_KEY}`,
        },
      });

      return response.data.address;
    } catch (error: any) {
      throw new Error(`Failed to get user wallet address: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get wallet balance for user
   */
  async getUserWalletBalance(userId: string): Promise<bigint> {
    try {
      const address = await this.getUserWalletAddress(userId);
      return await this.provider.getBalance(address);
    } catch (error: any) {
      throw new Error(`Failed to get wallet balance: ${error.message}`);
    }
  }

  /**
   * Check if user has sufficient balance for transaction
   */
  async checkSufficientBalance(
    userId: string,
    requiredAmount: bigint,
    tokenAddress?: string
  ): Promise<boolean> {
    try {
      if (tokenAddress) {
        // For ERC20 tokens, we'd need to check token balance
        // For now, just check native balance
        console.warn('Token balance checking not yet implemented, checking native balance');
      }

      const balance = await this.getUserWalletBalance(userId);
      return balance >= requiredAmount;
    } catch (error) {
      return false;
    }
  }

  /**
   * Estimate gas for transaction through delegation
   */
  async estimateGasForUser(
    userId: string,
    transaction: any
  ): Promise<{
    gasLimit: bigint;
    gasPrice: bigint;
    totalFee: bigint;
  }> {
    try {
      const userAddress = await this.getUserWalletAddress(userId);
      const transactionWithFrom = { ...transaction, from: userAddress };
      
      const gasLimit = await this.provider.estimateGas(transactionWithFrom);
      const feeData = await this.provider.getFeeData();
      const gasPrice = feeData.gasPrice || 0n;
      const totalFee = gasLimit * gasPrice;

      return { gasLimit, gasPrice, totalFee };
    } catch (error: any) {
      throw new Error(`Gas estimation failed: ${error.message}`);
    }
  }

  /**
   * Wait for transaction confirmation through polling
   */
  async waitForTransactionConfirmation(
    txHash: string,
    timeout: number = 60000,
    confirmations: number = 1
  ): Promise<any> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const receipt = await this.provider.getTransactionReceipt(txHash);
        if (receipt && receipt.blockNumber) {
          const currentBlock = await this.provider.getBlockNumber();
          const confirmationCount = currentBlock - receipt.blockNumber + 1;
          
          if (confirmationCount >= confirmations) {
            return receipt;
          }
        }
      } catch (error) {
        // Transaction might not be mined yet, continue polling
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error(`Transaction ${txHash} not confirmed within timeout`);
  }

  /**
   * Validate transaction parameters before delegation
   */
  validateTransaction(transaction: any): void {
    if (!transaction.to || !ethers.isAddress(transaction.to)) {
      throw new Error('Invalid recipient address');
    }

    if (transaction.value && transaction.value < 0) {
      throw new Error('Transaction value cannot be negative');
    }

    if (transaction.gasLimit && transaction.gasLimit <= 0) {
      throw new Error('Gas limit must be positive');
    }

    if (transaction.gasPrice && transaction.gasPrice <= 0) {
      throw new Error('Gas price must be positive');
    }
  }

  /**
   * Request transaction approval from admin/user
   * This adds an extra security layer for high-value transactions
   */
  async requestTransactionApproval(
    userId: string,
    transaction: any,
    reason: string
  ): Promise<boolean> {
    try {
      const response = await axios.post('/api/wallet/request-approval', {
        userId,
        transaction,
        reason,
        timestamp: new Date().toISOString(),
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.WORKER_API_KEY}`,
        },
      });

      return response.data.approved === true;
    } catch (error: any) {
      console.error('Approval request failed:', error);
      return false; // Default to not approved on error
    }
  }

  /**
   * Log transaction attempt for auditing
   */
  async logTransactionAttempt(
    userId: string,
    transaction: any,
    result: 'success' | 'failure',
    error?: string
  ): Promise<void> {
    try {
      await axios.post('/api/wallet/audit-log', {
        userId,
        transaction: {
          to: transaction.to,
          value: transaction.value?.toString(),
          gasLimit: transaction.gasLimit?.toString(),
          gasPrice: transaction.gasPrice?.toString(),
        },
        result,
        error,
        timestamp: new Date().toISOString(),
        workerInstance: process.env.WORKER_INSTANCE_ID || 'unknown',
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.WORKER_API_KEY}`,
        },
      });
    } catch (error) {
      // Don't throw on logging failure, but log it
      console.error('Failed to log transaction attempt:', error);
    }
  }

  /**
   * Validate Sei address format
   */
  static isValidSeiAddress(address: string): boolean {
    return /^sei[0-9a-z]{38}$/.test(address);
  }

  /**
   * Get current gas price
   */
  async getGasPrice(): Promise<bigint> {
    const feeData = await this.provider.getFeeData();
    return feeData.gasPrice || 0n;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.provider.getBlockNumber();
      return true;
    } catch (error) {
      return false;
    }
  }
}