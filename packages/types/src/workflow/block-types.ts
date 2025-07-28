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
  
  // Sei blockchain blocks
  SEI_WALLET_LISTEN = "SEI_WALLET_LISTEN",
  SEI_CONTRACT_CALL = "SEI_CONTRACT_CALL",
  SEI_DATA_FETCH = "SEI_DATA_FETCH",
  SEI_PAYMENT = "SEI_PAYMENT",
  SEI_NFT = "SEI_NFT",
  
  // Default/unknown
  UNKNOWN = "UNKNOWN",
}

/**
 * Generic, domain-agnostic block types
 * These blocks can be configured for any use case through their parameters
 */

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
  "SEI_WALLET_LISTEN",
  "SEI_CONTRACT_CALL",
  "SEI_DATA_FETCH",
  "SEI_PAYMENT",
  "SEI_NFT",
] as const;
