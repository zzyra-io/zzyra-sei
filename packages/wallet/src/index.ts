/**
 * Zyra Wallet Package
 *
 * Centralized wallet management for Zyra platform
 * Connects UI components with database operations using wagmi
 *
 * Main entry point for the @zyra/wallet package
 *
 * This package provides a centralized wallet management solution using wagmi.
 * It integrates with the existing database repositories and provides UI components
 * for wallet connection and display.
 */

// Export components
export { WalletProvider } from "./ui/WalletProvider";
export { WalletDisplay } from "./ui/WalletDisplay";
export { WalletConnect } from "./ui/WalletConnect";

// Export hooks
// export { useWallet } from "./hooks/useWallet";
export { useMagicAuth } from "./hooks/useMagicAuth";

// Export services
export { WalletService } from "./services/wallet.service";

// Export types
export type { Address } from "./core/types";
export { WalletType } from "./core/types";
export { ChainType } from "./core/types";
export { ConnectionStatus } from "./core/types";
export type { MagicConnectionOptions } from "./core/types";
export type { ConnectionOptions } from "./core/types";
export type { WalletConnection } from "./core/types";
export type { TransactionRequest } from "./core/types";
export type { TransactionResponse } from "./core/types";
export type { ChainConfig } from "./core/types";
export type { MagicProviderConfig } from "./core/types";
export type { Wallet } from "./core/types";
export type { WalletTransaction } from "./core/types";
export type { WalletProviderInterface } from "./core/types";
export type { WalletContextState } from "./core/types";

// Export constants
export {
  CHAIN_CONFIG,
  CHAIN_IDS,
  TransactionType,
  DEFAULT_GAS_LIMIT,
  DEFAULT_TRANSACTION_CONFIG,
  DEFAULT_CHAIN,
  DEFAULT_CONNECTION_OPTIONS,
} from "./core/constants";

// Export Wagmi config and query client
export { createWagmiConfig, queryClient } from "./config/wagmi.config";

/**
 * This package provides:
 *
 * 1. Wallet Connection: Multiple wallet providers including Magic Link, MetaMask, WalletConnect, and Coinbase
 * 2. Database Integration: Integration with existing repository patterns
 * 3. UI Components: Ready-to-use React components for wallet operations
 * 4. Type Safety: Shared types between UI and worker components
 */
