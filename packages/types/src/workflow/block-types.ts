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

  // Default/unknown
  UNKNOWN = "UNKNOWN",
  HTTP_REQUEST = "HTTP_REQUEST",
  CUSTOM = "CUSTOM",
  CONDITION = "CONDITION",

  // AGENT = "AGENT", //TODO: Future block type
}

/**
 * Generic, domain-agnostic block types
 * These blocks can be configured for any use case through their parameters
 */
