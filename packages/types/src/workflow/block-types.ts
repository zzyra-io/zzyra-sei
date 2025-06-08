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
  DISCORD = "DISCORD",
  DATABASE = "DATABASE",
  WALLET = "WALLET",
  TRANSACTION = "TRANSACTION",

  // Logic blocks
  CONDITION = "CONDITION",
  DELAY = "DELAY",
  TRANSFORM = "TRANSFORM",

  // Finance blocks
  AI_BLOCKCHAIN = "AI_BLOCKCHAIN",

  // Custom blocks
  CUSTOM = "CUSTOM",
  LLM_PROMPT = "LLM_PROMPT",

  // Default/unknown
  UNKNOWN = "UNKNOWN",
}
