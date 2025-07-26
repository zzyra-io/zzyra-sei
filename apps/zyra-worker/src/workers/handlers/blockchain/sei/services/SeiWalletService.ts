import { ethers } from 'ethers';
import axios from 'axios';
import { validateSeiAddress } from '@zyra/types';

/**
 * Sei Wallet Service for transaction delegation using Magic SDK
 * All transactions are executed through Magic's delegation pattern
 * No private keys are stored in the worker - all signing happens through Magic
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
    network: string,
  ): Promise<{
    txHash: string;
    status: 'pending' | 'confirmed' | 'failed';
  }> {
    try {
      // Call the Magic delegation API endpoint
      const response = await axios.post(
        '/api/magic/delegate-transaction',
        {
          userId,
          transaction,
          network,
          timestamp: new Date().toISOString(),
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.WORKER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000, // 60 second timeout for transaction execution
        },
      );

      return {
        txHash: response.data.txHash,
        status: response.data.status || 'pending',
      };
    } catch (error: any) {
      throw new Error(
        `Transaction delegation failed: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Get user's wallet address through Magic delegation
   */
  async getUserWalletAddress(userId: string): Promise<string> {
    try {
      const response = await axios.get(`/api/magic/wallet-address/${userId}`, {
        headers: {
          Authorization: `Bearer ${process.env.WORKER_API_KEY}`,
        },
      });

      return response.data.address;
    } catch (error: any) {
      throw new Error(
        `Failed to get user wallet address: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Get user's wallet balance through Magic delegation
   */
  async getUserWalletBalance(
    userId: string,
    tokenAddress?: string,
  ): Promise<bigint> {
    try {
      const response = await axios.get(`/api/magic/wallet-balance/${userId}`, {
        headers: {
          Authorization: `Bearer ${process.env.WORKER_API_KEY}`,
        },
        params: {
          tokenAddress,
        },
      });

      return BigInt(response.data.balance);
    } catch (error: any) {
      throw new Error(
        `Failed to get wallet balance: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Check if user has sufficient balance for transaction
   */
  async checkSufficientBalance(
    userId: string,
    requiredAmount: bigint,
    tokenAddress?: string,
  ): Promise<boolean> {
    try {
      const balance = await this.getUserWalletBalance(userId, tokenAddress);
      return balance >= requiredAmount;
    } catch (error) {
      return false;
    }
  }

  /**
   * Estimate gas for user transaction through Magic delegation
   */
  async estimateGasForUser(
    userId: string,
    transaction: any,
  ): Promise<{
    gasLimit: bigint;
    gasPrice: bigint;
    estimatedCost: bigint;
  }> {
    try {
      const response = await axios.post(
        '/api/magic/estimate-gas',
        {
          userId,
          transaction,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.WORKER_API_KEY}`,
          },
        },
      );

      return {
        gasLimit: BigInt(response.data.gasLimit),
        gasPrice: BigInt(response.data.gasPrice),
        estimatedCost: BigInt(response.data.estimatedCost),
      };
    } catch (error: any) {
      throw new Error(
        `Failed to estimate gas: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Validate transaction parameters
   */
  validateTransaction(transaction: any): void {
    if (!transaction.to) {
      throw new Error('Transaction must have a recipient address (to)');
    }

    if (!validateSeiAddress(transaction.to)) {
      throw new Error(
        'Invalid Sei recipient address. Must be either sei1... (Cosmos) or 0x... (EVM)',
      );
    }

    if (transaction.value && typeof transaction.value !== 'bigint') {
      throw new Error('Transaction value must be a bigint');
    }

    if (transaction.gasLimit && typeof transaction.gasLimit !== 'bigint') {
      throw new Error('Gas limit must be a bigint');
    }

    if (transaction.gasPrice && typeof transaction.gasPrice !== 'bigint') {
      throw new Error('Gas price must be a bigint');
    }

    if (transaction.data && typeof transaction.data !== 'string') {
      throw new Error('Transaction data must be a string');
    }
  }

  /**
   * Wait for transaction confirmation through Magic delegation
   */
  async waitForTransaction(
    txHash: string,
    confirmations: number = 1,
    timeout: number = 60000,
  ): Promise<any> {
    try {
      const response = await axios.post(
        '/api/magic/wait-transaction',
        {
          txHash,
          confirmations,
          timeout,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.WORKER_API_KEY}`,
          },
        },
      );

      return response.data.receipt;
    } catch (error: any) {
      throw new Error(
        `Transaction confirmation failed: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Get transaction status through Magic delegation
   */
  async getTransactionStatus(
    txHash: string,
  ): Promise<'pending' | 'confirmed' | 'failed'> {
    try {
      const response = await axios.get(
        `/api/magic/transaction-status/${txHash}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.WORKER_API_KEY}`,
          },
        },
      );

      return response.data.status;
    } catch (error) {
      return 'pending';
    }
  }

  /**
   * Get transaction details through Magic delegation
   */
  async getTransactionDetails(txHash: string): Promise<any> {
    try {
      const response = await axios.get(
        `/api/magic/transaction-details/${txHash}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.WORKER_API_KEY}`,
          },
        },
      );

      return response.data;
    } catch (error: any) {
      throw new Error(
        `Failed to get transaction details: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Request transaction approval from user through Magic
   * This adds an extra security layer for high-value transactions
   */
  async requestTransactionApproval(
    userId: string,
    transaction: any,
    reason: string,
  ): Promise<boolean> {
    try {
      const response = await axios.post(
        '/api/magic/request-approval',
        {
          userId,
          transaction,
          reason,
          timestamp: new Date().toISOString(),
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.WORKER_API_KEY}`,
          },
        },
      );

      return response.data.approved === true;
    } catch (error: any) {
      console.error('Approval request failed:', error);
      return false; // Default to not approved on error
    }
  }

  /**
   * Get user's Magic session info
   */
  async getUserSession(userId: string): Promise<any> {
    try {
      const response = await axios.get(`/api/magic/user-session/${userId}`, {
        headers: {
          Authorization: `Bearer ${process.env.WORKER_API_KEY}`,
        },
      });

      return response.data;
    } catch (error: any) {
      throw new Error(
        `Failed to get user session: ${error.response?.data?.message || error.message}`,
      );
    }
  }

  /**
   * Validate user's Magic session
   */
  async validateUserSession(userId: string): Promise<boolean> {
    try {
      const session = await this.getUserSession(userId);
      return session && session.isValid;
    } catch (error) {
      return false;
    }
  }
}
