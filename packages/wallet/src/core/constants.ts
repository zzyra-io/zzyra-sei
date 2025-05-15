/**
 * Wallet constants
 *
 * This file contains constants related to blockchain networks and wallet configurations
 */

import { ChainType, ChainConfig } from "./types";

/**
 * Transaction types for wallet operations
 */
export enum TransactionType {
  TRANSFER = "transfer",
  SWAP = "swap",
  APPROVE = "approve",
  CONTRACT_INTERACTION = "contract_interaction",
  TOKEN_TRANSFER = "token_transfer",
}

/**
 * Chain IDs for different networks
 */
export const CHAIN_IDS = {
  ETHEREUM: 1,
  POLYGON: 137,
  ARBITRUM: 42161,
  OPTIMISM: 10,
  GOERLI: 5,
  MUMBAI: 80001,
};

/**
 * Chain configuration for different networks
 */
export const CHAIN_CONFIG: Record<ChainType, ChainConfig> = {
  [ChainType.ETHEREUM]: {
    chainId: 1,
    name: "Ethereum",
    rpcUrl: "https://mainnet.infura.io/v3/",
    symbol: "ETH",
    decimals: 18,
    blockExplorerUrl: "https://etherscan.io",
    getExplorerUrl: (txHash: string) => `https://etherscan.io/tx/${txHash}`,
  },
  [ChainType.POLYGON]: {
    chainId: 137,
    name: "Polygon",
    rpcUrl: "https://polygon-rpc.com",
    symbol: "MATIC",
    decimals: 18,
    blockExplorerUrl: "https://polygonscan.com",
    getExplorerUrl: (txHash: string) => `https://polygonscan.com/tx/${txHash}`,
  },
  [ChainType.OPTIMISM]: {
    chainId: 10,
    name: "Optimism",
    rpcUrl: "https://mainnet.optimism.io",
    symbol: "ETH",
    decimals: 18,
    blockExplorerUrl: "https://optimistic.etherscan.io",
    getExplorerUrl: (txHash: string) =>
      `https://optimistic.etherscan.io/tx/${txHash}`,
  },
  [ChainType.ARBITRUM]: {
    chainId: 42161,
    name: "Arbitrum",
    rpcUrl: "https://arb1.arbitrum.io/rpc",
    symbol: "ETH",
    decimals: 18,
    blockExplorerUrl: "https://arbiscan.io",
    getExplorerUrl: (txHash: string) => `https://arbiscan.io/tx/${txHash}`,
  },
  [ChainType.GOERLI]: {
    chainId: 5,
    name: "Goerli Testnet",
    rpcUrl: "https://goerli.infura.io/v3/",
    symbol: "ETH",
    decimals: 18,
    blockExplorerUrl: "https://goerli.etherscan.io",
    getExplorerUrl: (txHash: string) =>
      `https://goerli.etherscan.io/tx/${txHash}`,
    testnet: true,
  },
  [ChainType.MUMBAI]: {
    chainId: 80001,
    name: "Mumbai Testnet",
    rpcUrl: "https://rpc-mumbai.maticvigil.com",
    symbol: "MATIC",
    decimals: 18,
    blockExplorerUrl: "https://mumbai.polygonscan.com",
    getExplorerUrl: (txHash: string) =>
      `https://mumbai.polygonscan.com/tx/${txHash}`,
    testnet: true,
  },
};

/**
 * Magic Link network configurations
 */
export const MAGIC_NETWORKS = {
  ethereum: {
    chainId: CHAIN_IDS.ETHEREUM,
    rpcUrl: "https://eth-mainnet.g.alchemy.com/v2/your-api-key",
  },
  polygonMainnet: {
    chainId: CHAIN_IDS.POLYGON,
    rpcUrl: "https://polygon-mainnet.g.alchemy.com/v2/your-api-key",
  },
  arbitrum: {
    chainId: CHAIN_IDS.ARBITRUM,
    rpcUrl: "https://arb-mainnet.g.alchemy.com/v2/your-api-key",
  },
  optimism: {
    chainId: CHAIN_IDS.OPTIMISM,
    rpcUrl: "https://opt-mainnet.g.alchemy.com/v2/your-api-key",
  },
  goerli: {
    chainId: CHAIN_IDS.GOERLI,
    rpcUrl: "https://eth-goerli.g.alchemy.com/v2/your-api-key",
  },
  mumbai: {
    chainId: CHAIN_IDS.MUMBAI,
    rpcUrl: "https://polygon-mumbai.g.alchemy.com/v2/your-api-key",
  },
};

/**
 * Default gas limit for transactions in wei
 */
export const DEFAULT_GAS_LIMIT = BigInt(21000);

/**
 * Default transaction configuration
 */
export const DEFAULT_TRANSACTION_CONFIG = {
  gasLimit: DEFAULT_GAS_LIMIT,
};

/**
 * Default chain for new connections
 */
export const DEFAULT_CHAIN = ChainType.ETHEREUM;

/**
 * Default connection options for wallet providers
 */
export const DEFAULT_CONNECTION_OPTIONS = {
  chainId: CHAIN_IDS.ETHEREUM,
  magic: {
    showUI: true,
    email: "", // Empty default value for email
  },
};
