/**
 * Defines all available block types for the workflow system
 * This serves as the single source of truth for block types
 */
export enum BlockType {
  // Trigger blocks
  PRICE_MONITOR = "price-monitor",
  SCHEDULE = "schedule",
  WEBHOOK = "webhook",
  
  // Action blocks
  EMAIL = "email",
  NOTIFICATION = "notification",
  TRANSFORM = "transform",
  WALLET = "wallet",
  TRANSACTION = "transaction",
  DATABASE = "database",
  DISCORD = "discord",
  LLM_PROMPT = "llm-prompt",
  API = "api",
  SMS = "sms",
  AI = "ai",
  FINANCE = "finance",
  
  // Logic blocks
  CONDITION = "condition",
  DELAY = "delay",
  
  // Finance blocks
  DEFI_PRICE_MONITOR = "defi-price-monitor",
  DEFI_YIELD_MONITOR = "defi-yield-monitor",
  DEFI_PORTFOLIO = "defi-portfolio",
  DEFI_REBALANCE = "defi-rebalance",
  DEFI_SWAP = "defi-swap",
  DEFI_GAS = "defi-gas",
  DEFI_PROTOCOL = "defi-protocol",
  DEFI_YIELD_STRATEGY = "defi-yield-strategy",
  DEFI_LIQUIDITY = "defi-liquidity",
  DEFI_POSITION = "defi-position",
  AI_BLOCKCHAIN = "ai-blockchain",
  
  // Advanced monitoring
  PROTOCOL_MONITOR = "protocol-monitor",
  POSITION_MANAGER = "position-manager",
  YIELD_STRATEGY = "yield-strategy",
  LIQUIDITY_PROVIDER = "liquidity-provider",
  REBALANCE_CALCULATOR = "rebalance-calculator",
  GAS_OPTIMIZER = "gas-optimizer",
  SWAP_EXECUTOR = "swap-executor",
  PORTFOLIO_BALANCE = "portfolio-balance",
  YIELD_MONITOR = "yield-monitor",
  
  // Custom blocks
  CUSTOM = "custom",
  GOAT_FINANCE = "goat-finance",
  
  // Default/fallback
  UNKNOWN = "unknown"
}