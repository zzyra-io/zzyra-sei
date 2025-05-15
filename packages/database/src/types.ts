/**
 * Type definitions for the database package
 */

import { Prisma } from "@prisma/client";

// Re-export Prisma types
export type {
  UserWallet,
  WalletTransaction,
  BlockchainTransaction,
} from "@prisma/client";

// Export repository types
export type {
  WalletCreateInput,
  WalletUpdateInput,
  WalletTransactionCreateInput,
  BlockchainTransactionCreateInput,
  WalletTransactionFindManyInput,
  WalletWithTransactions,
} from "./repositories/wallet.repository";

// Export repository classes
export { WalletRepository } from "./repositories/wallet.repository";

// Export Prisma namespace
export { Prisma };
