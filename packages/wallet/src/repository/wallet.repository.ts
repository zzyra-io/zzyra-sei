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
  Prisma,
  WalletTransactionCreateInput,
  WalletTransactionFindManyInput,
} from "@zyra/database";
import {
  Wallet,
  WalletType,
  ChainType,
  ConnectionStatus,
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
   * Assumes DbWalletRepository will have a method `findTransactionByTxHash`.
   * @param txHash The transaction hash.
   * @returns The transaction if found, otherwise null.
   */
  async findTransactionByTxHash(
    txHash: string
  ): Promise<CoreWalletTransaction | null> {
    // TODO: Ensure DbWalletRepository in @zyra/database implements findTransactionByTxHash
    const dbTransaction =
      await this.dbRepository.findTransactionByTxHash(txHash);
    return dbTransaction ? this.mapToDomainTransaction(dbTransaction) : null;
  }

  /**
   * Update the status of a wallet transaction.
   * Assumes DbWalletRepository will have a method `updateTransaction`.
   * @param transactionId The ID of the transaction to update.
   * @param status The new status.
   * @returns The updated transaction.
   */
  async updateWalletTransactionStatus(
    transactionId: string,
    status: CoreWalletTransaction["status"]
  ): Promise<CoreWalletTransaction> {
    // TODO: Ensure DbWalletRepository in @zyra/database implements updateTransaction
    // The data type for update should be Prisma.WalletTransactionUpdateInput
    const updatedDbTransaction = await this.dbRepository.updateTransaction(
      transactionId,
      { status }
    );
    return this.mapToDomainTransaction(updatedDbTransaction);
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
    // Assuming CoreWalletTransaction is the domain type defined in ../core/types
    // and dbTransaction is the Prisma WalletTransaction type.
    // Mapping fields based on typical differences and CoreWalletTransaction structure.

    // TODO: Verify exact field names from Prisma's WalletTransaction type if this causes issues.
    // Common Prisma fields: id, userId, walletAddress, txHash, type, from, to, value, status, createdAt, updatedAt

    return {
      id: dbTransaction.id,
      userId: dbTransaction.userId, // Assuming Prisma model has userId directly
      walletId:
        (dbTransaction as any).walletId || (dbTransaction as any).walletAddress, // Prisma might use walletAddress; domain uses walletId. This needs confirmation.
      txHash: dbTransaction.txHash,
      txType:
        (dbTransaction as any).type ||
        (dbTransaction as any).txType ||
        "unknown", // Prisma might use 'type', domain 'txType'
      fromAddress:
        (dbTransaction as any).from || (dbTransaction as any).fromAddress,
      toAddress: (dbTransaction as any).to || (dbTransaction as any).toAddress,
      amount: String(
        (dbTransaction as any).value || (dbTransaction as any).amount || 0
      ), // Ensure string, handle potential 'value' or 'amount'
      status: (dbTransaction as any).status || "pending", // Provide default if not present
      createdAt: dbTransaction.createdAt,
      updatedAt: dbTransaction.updatedAt,
    };
  }
}
