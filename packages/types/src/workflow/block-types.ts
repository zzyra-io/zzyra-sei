/**
 * Defines all available block types for the workflow system
 * This serves as the single source of truth for block types
 */
export enum BlockType {
  // Trigger blocks
  PRICE_MONITOR = "PRICE_MONITOR",

  // Action blocks
  EMAIL = "EMAIL",
  NOTIFICATION = "NOTIFICATION",

  // Logic blocks
  CONDITION = "CONDITION",
  DELAY = "DELAY",

  // Default/fallback
  UNKNOWN = "UNKNOWN",
}
