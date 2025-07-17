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

// Core generic blocks for infinite use cases
export enum GenericBlockType {
  // Data sources
  HTTP_REQUEST = "HTTP_REQUEST",
  DATABASE_QUERY = "DATABASE_QUERY",
  API_CALL = "API_CALL",
  FILE_READ = "FILE_READ",
  WEB_SCRAPER = "WEB_SCRAPER",
  RSS_FEED = "RSS_FEED",
  SOCIAL_MEDIA_MONITOR = "SOCIAL_MEDIA_MONITOR",
  
  // Data transformation
  DATA_MAPPER = "DATA_MAPPER",
  DATA_FILTER = "DATA_FILTER",
  DATA_AGGREGATOR = "DATA_AGGREGATOR",
  JSON_PROCESSOR = "JSON_PROCESSOR",
  TEXT_PROCESSOR = "TEXT_PROCESSOR",
  NUMBER_CALCULATOR = "NUMBER_CALCULATOR",
  
  // Logic and control
  CONDITION = "CONDITION",
  COMPARATOR = "COMPARATOR",
  LOOP = "LOOP",
  DELAY = "DELAY",
  SWITCH = "SWITCH",
  MERGE = "MERGE",
  SPLIT = "SPLIT",
  
  // AI and ML
  AI_PROMPT = "AI_PROMPT",
  AI_ANALYZER = "AI_ANALYZER",
  AI_CLASSIFIER = "AI_CLASSIFIER",
  AI_SENTIMENT = "AI_SENTIMENT",
  AI_SUMMARIZER = "AI_SUMMARIZER",
  AI_TRANSLATOR = "AI_TRANSLATOR",
  
  // Communication
  EMAIL = "EMAIL",
  SMS = "SMS",
  SLACK = "SLACK",
  DISCORD = "DISCORD",
  TELEGRAM = "TELEGRAM",
  PHONE_CALL = "PHONE_CALL",
  PUSH_NOTIFICATION = "PUSH_NOTIFICATION",
  
  // Blockchain and DeFi
  WALLET_MONITOR = "WALLET_MONITOR",
  PRICE_MONITOR = "PRICE_MONITOR",
  DEFI_INTERACTION = "DEFI_INTERACTION",
  TOKEN_TRANSFER = "TOKEN_TRANSFER",
  NFT_MINTER = "NFT_MINTER",
  SMART_CONTRACT_CALL = "SMART_CONTRACT_CALL",
  
  // Storage and databases
  DATABASE_WRITE = "DATABASE_WRITE",
  FILE_WRITE = "FILE_WRITE",
  CLOUD_STORAGE = "CLOUD_STORAGE",
  CACHE_STORE = "CACHE_STORE",
  
  // Triggers
  SCHEDULE = "SCHEDULE",
  WEBHOOK = "WEBHOOK",
  EVENT_LISTENER = "EVENT_LISTENER",
  FILE_WATCHER = "FILE_WATCHER",
  
  // Utilities
  CUSTOM = "CUSTOM",
  JAVASCRIPT = "JAVASCRIPT",
  PYTHON = "PYTHON",
  FUNCTION = "FUNCTION",
  VARIABLE = "VARIABLE",
  
  // Analytics and monitoring
  ANALYTICS_TRACKER = "ANALYTICS_TRACKER",
  METRICS_COLLECTOR = "METRICS_COLLECTOR",
  LOG_ANALYZER = "LOG_ANALYZER",
  ERROR_HANDLER = "ERROR_HANDLER",
  
  // Legacy compatibility
  UNKNOWN = "UNKNOWN"
}
