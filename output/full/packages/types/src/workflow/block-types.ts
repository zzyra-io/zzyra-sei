/**
 * Defines all available block types for the workflow system
 * This serves as the single source of truth for block types
 */

export enum BlockType {
  // Core blocks
  HTTP_REQUEST = "HTTP_REQUEST",
  EMAIL = "EMAIL",
  NOTIFICATION = "NOTIFICATION",
  PRICE_MONITOR = "PRICE_MONITOR",
  CONDITION = "CONDITION",
  SCHEDULE = "SCHEDULE",
  WEBHOOK = "WEBHOOK",
  CUSTOM = "CUSTOM",
  DATA_TRANSFORM = "DATA_TRANSFORM", // Enhanced transformation block
  WALLET_LISTEN = "WALLET_LISTEN",
  AI_AGENT = "AI_AGENT",
  CALCULATOR = "CALCULATOR",
  MAGIC_WALLET = "MAGIC_WALLET",

  // Blockchain operation blocks - direct transaction capabilities
  SEND_TRANSACTION = "SEND_TRANSACTION",
  CHECK_BALANCE = "CHECK_BALANCE",
  SWAP_TOKENS = "SWAP_TOKENS",
  CREATE_WALLET = "CREATE_WALLET",

  // Sei blockchain operations also available through @sei-js/mcp-server via AI_AGENT blocks

  // Default/unknown
  UNKNOWN = "UNKNOWN",
}

/**
 * Generic, domain-agnostic block types
 * These blocks can be configured for any use case through their parameters
 */

/**
 * Blockchain-related interfaces for authorization
 */
export interface BlockchainAuthConfig {
  selectedChains: ChainAuthConfig[];
  duration: number; // hours
  timestamp: number;
}

export interface ChainAuthConfig {
  chainId: string;
  chainName: string;
  maxDailySpending: string;
  allowedOperations: string[];
  tokenSymbol: string;
  enabled: boolean;
  rpcUrl?: string;
}

export interface BlockchainNode {
  node: any;
  type: "AI_AGENT" | "BLOCKCHAIN";
  chains: string[];
  tools: any[];
}

export const SUPPORTED_CHAINS = {
  "1328": {
    name: "SEI Testnet",
    symbol: "SEI",
    rpcUrl: "https://rpc-testnet.sei-labs.org",
    explorer: "https://testnet.seitrace.com",
    faucet: "https://faucet.1328.org",
  },
  "base-sepolia": {
    name: "Base Sepolia",
    symbol: "ETH",
    rpcUrl: "https://sepolia.base.org",
    explorer: "https://sepolia.basescan.org",
    faucet: "https://faucet.quicknode.com/base/sepolia",
  },
  "ethereum-sepolia": {
    name: "Ethereum Sepolia",
    symbol: "ETH",
    rpcUrl: "https://sepolia.infura.io/v3/",
    explorer: "https://sepolia.etherscan.io",
    faucet: "https://faucet.sepolia.dev",
  },
} as const;

export * from "./metadata";

// Note: blockchain types are defined inline above and exported automatically

export const BLOCK_TYPES = [
  "HTTP_REQUEST",
  "EMAIL",
  "NOTIFICATION",
  "PRICE_MONITOR",
  "CONDITION",
  "SCHEDULE",
  "WEBHOOK",
  "CUSTOM",
  "DATA_TRANSFORM", // Enhanced transformation block
  "WALLET_LISTEN",
  "AI_AGENT",
  "CALCULATOR",
  "MAGIC_WALLET",
  // Sei blockchain operations now available through @sei-js/mcp-server
] as const;
