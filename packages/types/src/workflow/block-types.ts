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

  // Sei blockchain operations now available through @sei-js/mcp-server via AI_AGENT blocks

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
  "CALCULATOR",
  "MAGIC_WALLET",
  // Sei blockchain operations now available through @sei-js/mcp-server
] as const;
