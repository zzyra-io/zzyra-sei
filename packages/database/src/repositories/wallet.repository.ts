/**
 * Wallet Repository
 * 
 * This repository provides database operations for blockchain wallets.
 * It handles wallet management and blockchain transactions.
 */

// No need to import PrismaClient directly, we'll use our own interfaces

// Define interfaces for wallet-related types
interface UserWallet {
  id: string;
  userId: string;
  chainId: string;
  walletAddress: string;
  createdAt?: Date;
  updatedAt?: Date;
  walletType?: string | null;
  chainType?: string | null;
  metadata?: any;
}

interface WalletTransaction {
  id: string;
  userId: string;
  walletAddress: string;
  txHash: string;
  chainId: number;
  value: string;
  status: string;
  blockNumber?: number | null;
  createdAt?: Date;
  updatedAt?: Date;
}

interface BlockchainTransaction {
  id: string;
  nodeId: string;
  executionId: string;
  toAddress: string;
  value: string;
  data?: any;
  chainId: string;
  status: string;
  createdAt?: Date;
  updatedAt?: Date;
}
import { BaseRepository } from './base.repository';
import { validateWallet } from '../utils/validation';

// Type definitions for wallet operations
export interface WalletCreateInput {
  userId: string;
  chainId: string;
  walletAddress: string;
  walletType?: string;
  chainType?: string;
  metadata?: any;
}

export interface WalletUpdateInput {
  chainId?: string;
  walletAddress?: string;
  walletType?: string;
  chainType?: string;
  metadata?: any;
}

export interface WalletTransactionCreateInput {
  userId: string;
  walletAddress: string;
  txHash: string;
  chainId: number;
  value: string;
  status: string;
  blockNumber?: number;
}

export interface BlockchainTransactionCreateInput {
  nodeId: string;
  executionId: string;
  toAddress: string;
  value: string;
  data?: any;
  chainId: string;
  status: string;
}

export interface WalletTransactionFindManyInput {
  skip?: number;
  take?: number;
  orderBy?: { [key: string]: 'asc' | 'desc' };
}
export type WalletWithTransactions = UserWallet & {
  transactions: WalletTransaction[];
};

export class WalletRepository extends BaseRepository<UserWallet, WalletCreateInput, WalletUpdateInput> {
  protected tableName = 'user_wallets';
  protected model = this.prisma.userWallet;

  /**
   * Find a wallet by address
   * @param walletAddress The wallet address to find
   * @returns The wallet or null
   */
  async findByAddress(walletAddress: string): Promise<UserWallet | null> {
    return this.prisma.userWallet.findFirst({
      where: { walletAddress },
    });
  }

  /**
   * Find wallets by user ID
   * @param userId The user ID to filter by
   * @returns An array of wallets
   */
  async findByUserId(userId: string): Promise<UserWallet[]> {
    return this.prisma.userWallet.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Find a wallet with its transactions
   * @param id The wallet ID
   * @returns The wallet with transactions or null
   */
  async findWithTransactions(id: string): Promise<WalletWithTransactions | null> {
    return this.prisma.userWallet.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });
  }

  /**
   * Create a wallet for a user
   * @param userId The user ID
   * @param data The wallet data
   * @returns The created wallet
   */
  async createForUser(userId: string, data: Omit<WalletCreateInput, 'user'>): Promise<UserWallet> {
    // Validate wallet data
    validateWallet(data);

    // Check if wallet already exists
    const existingWallet = await this.findByAddress(data.walletAddress as string);
    if (existingWallet) {
      throw new Error(`Wallet with address ${data.walletAddress} already exists`);
    }

    return this.prisma.userWallet.create({
      data: {
        ...data,
        user: {
          connect: { id: userId },
        },
      },
    });
  }

  /**
   * Create a wallet transaction
   * @param data The transaction data
   * @returns The created transaction
   */
  async createTransaction(data: WalletTransactionCreateInput): Promise<WalletTransaction> {
    return this.prisma.walletTransaction.create({
      data,
    });
  }

  /**
   * Find transactions by wallet ID
   * @param walletId The wallet ID
   * @param limit The maximum number of transactions to return
   * @returns An array of transactions
   */
  async findTransactionsByWalletId(walletId: string, limit = 10): Promise<WalletTransaction[]> {
    return this.prisma.walletTransaction.findMany({
      where: { walletId },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Find transactions by user ID
   * @param userId The user ID
   * @param limit The maximum number of transactions to return
   * @returns An array of transactions
   */
  async findTransactionsByUserId(userId: string, limit = 10): Promise<WalletTransaction[]> {
    return this.prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Find transactions by wallet address
   * @param walletAddress The wallet address
   * @param options Options for the query
   * @returns An array of transactions
   */
  async findTransactionsByWalletAddress(walletAddress: string, options?: WalletTransactionFindManyInput): Promise<WalletTransaction[]> {
    return this.prisma.walletTransaction.findMany({
      where: { walletAddress },
      orderBy: {
        createdAt: 'desc',
      },
      ...options,
    });
  }

  /**
   * Create a blockchain transaction
   * @param data The blockchain transaction data
   * @returns The created blockchain transaction
   */
  async createBlockchainTransaction(data: BlockchainTransactionCreateInput): Promise<BlockchainTransaction> {
    return this.prisma.blockchainTransaction.create({
      data,
    });
  }

  /**
   * Find blockchain transactions by execution ID
   * @param executionId The execution ID
   * @returns An array of blockchain transactions
   */
  async findBlockchainTransactionsByExecutionId(executionId: string): Promise<BlockchainTransaction[]> {
    return this.prisma.blockchainTransaction.findMany({
      where: { executionId },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Update a blockchain transaction status
   * @param id The blockchain transaction ID
   * @param status The new status
   * @param txHash The transaction hash
   * @param blockNumber The block number
   * @returns The updated blockchain transaction
   */
  async updateBlockchainTransactionStatus(
    id: string,
    status: string,
    txHash?: string,
    blockNumber?: number
  ): Promise<BlockchainTransaction> {
    const data: Prisma.BlockchainTransactionUpdateInput = {
      status,
      updatedAt: new Date(),
    };

    if (txHash) {
      data.txHash = txHash;
    }

    if (blockNumber) {
      data.blockNumber = blockNumber;
    }

    return this.prisma.blockchainTransaction.update({
      where: { id },
      data,
    });
  }

  /**
   * Get wallet balance from blockchain
   * This is a placeholder for integration with blockchain APIs
   * @param walletAddress The wallet address
   * @param chainId The chain ID
   * @returns The wallet balance
   */
  async getWalletBalance(walletAddress: string, chainId: string): Promise<string> {
    // This would be implemented with blockchain API integration
    // For now, return a placeholder
    return '0';
  }
}
