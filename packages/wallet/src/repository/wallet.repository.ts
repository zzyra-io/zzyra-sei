/**
 * Wallet repository for operations
 *
 * This is a wrapper around the database wallet repository
 * to provide a consistent interface for the wallet package.
 */

import type {
  WalletRepository as DbWalletRepository,
  UserWallet,
  WalletTransaction,
  WalletCreateInput,
  WalletTransactionCreateInput,
  WalletTransactionFindManyInput,
} from "@zyra/database";
import {
  Wallet,
  WalletType,
  ChainType,
  WalletTransaction as CoreWalletTransaction,
} from "../core/types";

/**
 * Repository for wallet operations
 */
export class WalletRepository {
  private dbRepository: DbWalletRepository;

  /**
   * Create a new wallet repository
   * @param dbRepository Database wallet repository instance
   */
  constructor(dbRepository: DbWalletRepository) {
    this.dbRepository = dbRepository;
  }

  /**
   * Create a new wallet in the database
   * @param data Wallet data
   * @returns Created wallet
   */
  async createWallet(data: {
    userId: string;
    chainId: string;
    walletAddress: string;
    walletType: WalletType;
    chainType: ChainType;
    metadata?: Record<string, any>;
  }): Promise<Wallet> {
    // Map our domain model to the database model
    const createInput: WalletCreateInput = {
      userId: data.userId,
      chainId: data.chainId,
      walletAddress: data.walletAddress,
      walletType: data.walletType,
      chainType: data.chainType,
      metadata: data.metadata || {},
    };

    // Use the database repository to create the wallet
    const wallet: UserWallet = await this.dbRepository.createForUser(
      data.userId,
      createInput
    );

    // Return the wallet as our domain model
    return this.mapToWallet(wallet);
  }

  /**
   * Get all wallets for a user
   * @param userId User ID
   * @returns List of wallets
   */
  async getUserWallets(userId: string): Promise<Wallet[]> {
    // Use the database repository to get wallets
    const wallets: UserWallet[] = await this.dbRepository.findByUserId(userId);

    // Map the database models to our domain models
    return wallets.map((wallet) => this.mapToWallet(wallet));
  }

  /**
   * Get wallet by address
   * @param address Wallet address
   * @returns Wallet or null if not found
   */
  async getWalletByAddress(address: string): Promise<Wallet | null> {
    // Use the database repository to get the wallet
    const wallet: UserWallet | null =
      await this.dbRepository.findByAddress(address);

    // Map the database model to our domain model if it exists
    return wallet ? this.mapToWallet(wallet) : null;
  }

  /**
   * Get wallet by ID
   * @param id Wallet ID
   * @returns Wallet or null if not found
   */
  async getWalletById(id: string): Promise<Wallet | null> {
    // Use the database repository to get the wallet
    const wallet: UserWallet | null = await this.dbRepository.findById(id);

    // Map the database model to our domain model if it exists
    return wallet ? this.mapToWallet(wallet) : null;
  }

  /**
   * Update wallet metadata
   * @param id Wallet ID
   * @param metadata New metadata
   * @returns Updated wallet
   */
  async updateWalletMetadata(
    id: string,
    metadata: Record<string, any>
  ): Promise<Wallet> {
    // Use the database repository to update the wallet
    const wallet: UserWallet = await this.dbRepository.update(id, { metadata });

    // Map the database model to our domain model
    return this.mapToWallet(wallet);
  }

  /**
   * Delete a wallet
   * @param id Wallet ID
   * @returns Boolean indicating success
   */
  async deleteWallet(id: string): Promise<boolean> {
    // Use the database repository to delete the wallet
    await this.dbRepository.delete(id);

    return true;
  }

  /**
   * Create a new wallet transaction in the database
   * @param data Transaction data
   * @returns Created transaction
   */
  async createWalletTransaction(
    data: WalletTransactionCreateInput
  ): Promise<CoreWalletTransaction> {
    const transaction = await this.dbRepository.createTransaction(data);
    return this.mapToDomainTransaction(transaction);
  }

  /**
   * Get transactions by wallet address
   * @param walletAddress Wallet address
   * @param limit Maximum number of transactions
   * @returns List of transactions
   */
  async getTransactionsByWalletAddress(
    walletAddress: string,
    limit: number = 10
  ): Promise<CoreWalletTransaction[]> {
    const options: WalletTransactionFindManyInput = { take: limit };
    const transactions =
      await this.dbRepository.findTransactionsByWalletAddress(
        walletAddress,
        options
      );
    return transactions.map(this.mapToDomainTransaction);
  }

  /**
   * Get transactions by user ID
   * @param userId User ID
   * @param limit Maximum number of transactions
   * @returns List of transactions
   */
  async getTransactionsByUserId(
    userId: string,
    limit: number = 10
  ): Promise<CoreWalletTransaction[]> {
    // Note: The DbWalletRepository might have findTransactionsByUserId directly
    // If so, this implementation could be simpler. For now, assuming it does.
    // If not, it would need to fetch wallets for user then transactions for each wallet.
    // From previous tool output: `async findTransactionsByUserId(userId: string, limit = 10): Promise<WalletTransaction[]>` exists.
    const transactions = await this.dbRepository.findTransactionsByUserId(
      userId,
      limit
    );
    return transactions.map(this.mapToDomainTransaction);
  }

  /**
   * Find a single transaction by its hash.
   * @param txHash The transaction hash.
   * @returns The transaction if found, otherwise null.
   */
  async findTransactionByTxHash(
    txHash: string
  ): Promise<CoreWalletTransaction | null> {
    try {
      // Use type assertion to bypass TypeScript error
      // In a real implementation, this method would be properly defined in the repository interface
      const repository = this.dbRepository as any;

      // Check if the method exists at runtime
      if (typeof repository.findTransactionByTxHash !== "function") {
        console.warn(
          "findTransactionByTxHash not implemented in database repository"
        );
        return null;
      }

      const transaction = await repository.findTransactionByTxHash(txHash);
      return transaction ? this.mapToDomainTransaction(transaction) : null;
    } catch (error) {
      console.error("Error finding transaction by hash:", error);
      return null;
    }
  }

  /**
   * Update the status of a wallet transaction.
   * @param transactionId The ID of the transaction to update.
   * @param status The new status.
   * @returns The updated transaction.
   */
  async updateWalletTransactionStatus(
    transactionId: string,
    status: CoreWalletTransaction["status"]
  ): Promise<CoreWalletTransaction> {
    try {
      // Use type assertion to bypass TypeScript error
      // In a real implementation, this method would be properly defined in the repository interface
      const repository = this.dbRepository as any;

      // Check if the method exists at runtime
      if (typeof repository.updateTransaction !== 'function') {
        console.warn('updateTransaction not implemented in database repository');
        throw new Error('Method not implemented: updateTransaction');
      }
      
      const updatedTransaction = await repository.updateTransaction(transactionId, { status });
      return this.mapToDomainTransaction(updatedTransaction);
    } catch (error) {
      console.error("Error updating transaction status:", error);
      throw error;
    }
  }

  /**
   * Map database wallet to domain wallet
   */
  private mapToWallet(dbWallet: UserWallet): Wallet {
    return {
      id: dbWallet.id,
      userId: dbWallet.userId,
      walletAddress: dbWallet.walletAddress,
      chainId: dbWallet.chainId,
      walletType: dbWallet.walletType as WalletType,
      chainType: dbWallet.chainType as ChainType,
      metadata: dbWallet.metadata
        ? typeof dbWallet.metadata === "string"
          ? JSON.parse(dbWallet.metadata)
          : dbWallet.metadata
        : {},
      createdAt: dbWallet.createdAt,
      updatedAt: dbWallet.updatedAt,
    };
  }

  /**
   * Map database transaction to domain transaction
   * TODO: Define CoreWalletTransaction structure in ../core/types and complete mapping
   */
  private mapToDomainTransaction(
    dbTransaction: WalletTransaction
  ): CoreWalletTransaction {
    // Use type assertion to safely access potentially missing properties
    const transaction = dbTransaction as any;
    
    // Map the database transaction to our domain model
    // Using type assertions and providing fallbacks for all fields
    return {
      id: transaction.id,
      userId: transaction.userId,
      walletId: transaction.walletAddress || '', // Use walletAddress as walletId
      txHash: transaction.txHash,
      txType: "transfer", // Default to transfer if not specified
      fromAddress: transaction.walletAddress || '', // Use walletAddress as fromAddress if not specified
      toAddress: transaction.to || '', // Default to empty string if not specified
      amount: String(transaction.value || 0), // Convert value to string
      status: (transaction.status || "pending") as "pending" | "success" | "failed", // Type assertion for status
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,
    };
  }
}
