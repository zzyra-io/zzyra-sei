/**
 * Defines all available block types for the workflow system
 * This serves as the single source of truth for block types
 */

export enum BlockType {
  // Trigger blocks
  PRICE_MONITOR = "PRICE_MONITOR",
  SCHEDULE = "SCHEDULE",
  WEBHOOK = "WEBHOOK",

  // Action blocks
  EMAIL = "EMAIL",
  NOTIFICATION = "NOTIFICATION",

  // Default/unknown
  UNKNOWN = "UNKNOWN",
  HTTP_REQUEST = "HTTP_REQUEST",
  DATABASE_QUERY = "DATABASE_QUERY",
  FILE_READ = "FILE_READ",
  BLOCKCHAIN_READ = "BLOCKCHAIN_READ",

  // Processing
  CALCULATOR = "CALCULATOR",
  COMPARATOR = "COMPARATOR",
  TRANSFORMER = "TRANSFORMER",
  AGGREGATOR = "AGGREGATOR",

  // Logic
  CONDITION = "CONDITION",
  DELAY = "DELAY",
  LOOP = "LOOP",

  // External Actions
  HTTP_CALL = "HTTP_CALL",
  MESSAGE_SEND = "MESSAGE_SEND",
  DATABASE_WRITE = "DATABASE_WRITE",
  BLOCKCHAIN_WRITE = "BLOCKCHAIN_WRITE",
  FILE_WRITE = "FILE_WRITE",
}

/**
 * Generic, domain-agnostic block types
 * These blocks can be configured for any use case through their parameters
 */
