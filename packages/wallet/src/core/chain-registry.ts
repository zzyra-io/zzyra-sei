/**
 * @zyra/wallet - Chain Registry
 *
 * This file contains the registry of supported blockchain networks with their configurations.
 */

import {
  ChainType,
  ChainConfig,
  EVMChainConfig,
  SolanaChainConfig,
} from "../core/types";

/**
 * Base Sepolia chain configuration
 */
export const BASE_SEPOLIA: EVMChainConfig = {
  id: 84532,
  chainId: 84532,
  name: "Base Sepolia",
  type: ChainType.EVM,
  rpcUrl: "https://sepolia.base.org",
  blockExplorerUrl: "https://sepolia.basescan.org",
  symbol: "ETH",
  decimals: 18,
  testnet: true,
};

/**
 * Polygon Mumbai Testnet configuration
 */
export const POLYGON_MUMBAI: EVMChainConfig = {
  id: 80001,
  chainId: 80001,
  name: "Polygon Mumbai",
  type: ChainType.EVM,
  rpcUrl: "https://rpc-mumbai.maticvigil.com",
  blockExplorerUrl: "https://mumbai.polygonscan.com",
  symbol: "MATIC",
  decimals: 18,
  testnet: true,
};

/**
 * Solana Devnet configuration
 */
export const SOLANA_DEVNET: SolanaChainConfig = {
  id: "devnet",
  name: "Solana Devnet",
  type: ChainType.SOLANA,
  rpcUrl: "https://api.devnet.solana.com",
  blockExplorerUrl: "https://explorer.solana.com/?cluster=devnet",
  symbol: "SOL",
  decimals: 9,
  testnet: true,
};

/**
 * Solana Mainnet configuration
 */
export const SOLANA_MAINNET: SolanaChainConfig = {
  id: "mainnet-beta",
  name: "Solana",
  type: ChainType.SOLANA,
  rpcUrl: "https://api.mainnet-beta.solana.com",
  blockExplorerUrl: "https://explorer.solana.com",
  symbol: "SOL",
  decimals: 9,
  testnet: false,
};

/**
 * Map of all supported chains
 */
export const SUPPORTED_CHAINS: Record<string | number, ChainConfig> = {
  [BASE_SEPOLIA.id]: BASE_SEPOLIA,
  [POLYGON_MUMBAI.id]: POLYGON_MUMBAI,
  [SOLANA_DEVNET.id]: SOLANA_DEVNET,
  [SOLANA_MAINNET.id]: SOLANA_MAINNET,
};

/**
 * Default chains by type
 */
export const DEFAULT_CHAINS: Record<ChainType, ChainConfig> = {
  [ChainType.EVM]: POLYGON_MUMBAI,
  [ChainType.SOLANA]: SOLANA_DEVNET,
};

/**
 * Get a chain configuration by ID
 */
export function getChainById(
  chainId: number | string
): ChainConfig | undefined {
  return SUPPORTED_CHAINS[chainId];
}

/**
 * Get chains by type
 */
export function getChainsByType(type: ChainType): ChainConfig[] {
  return Object.values(SUPPORTED_CHAINS).filter((chain) => chain.type === type);
}

/**
 * Get the default chain for a given type
 */
export function getDefaultChain(type: ChainType): ChainConfig {
  return DEFAULT_CHAINS[type];
}
