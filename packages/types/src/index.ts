import { z } from "zod";

// Block types (shared between UI and worker)
export enum BlockType {
  // DeFi Blocks
  PROTOCOL_MONITOR = "PROTOCOL_MONITOR",
  POSITION_MANAGER = "POSITION_MANAGER",
  YIELD_STRATEGY = "YIELD_STRATEGY",
  LIQUIDITY_PROVIDER = "LIQUIDITY_PROVIDER",
  REBALANCE_CALCULATOR = "REBALANCE_CALCULATOR",
  GAS_OPTIMIZER = "GAS_OPTIMIZER",
  SWAP_EXECUTOR = "SWAP_EXECUTOR",
  PORTFOLIO_BALANCE = "PORTFOLIO_BALANCE",
  YIELD_MONITOR = "YIELD_MONITOR",
  
  // DeFi category blocks (legacy naming, use the ones above instead)
  DEFI_YIELD_STRATEGY = "DEFI_YIELD_STRATEGY",
  DEFI_SWAP = "DEFI_SWAP",
  DEFI_PROTOCOL = "DEFI_PROTOCOL",
  DEFI_REBALANCE = "DEFI_REBALANCE",
  DEFI_POSITION = "DEFI_POSITION",
  DEFI_LIQUIDITY = "DEFI_LIQUIDITY",
  DEFI_GAS = "DEFI_GAS",
  
  // Other block categories
  WEBHOOK = "WEBHOOK",
  API = "API",
  DISCORD = "DISCORD",
  DATABASE = "DATABASE",
  NOTIFICATION = "NOTIFICATION",
  EMAIL = "EMAIL",
  SMS = "SMS",
  AI = "AI",
  FINANCE = "FINANCE",
  CUSTOM = "CUSTOM",
  PRICE_MONITOR = "PRICE_MONITOR",
  
  // Legacy DeFi monitor blocks (use the new ones above instead)
  DEFI_PRICE_MONITOR = "DEFI_PRICE_MONITOR",
  DEFI_YIELD_MONITOR = "DEFI_YIELD_MONITOR",
  DEFI_PORTFOLIO = "DEFI_PORTFOLIO",
  
  // Utility block types
  DELAY = "DELAY",
  TRANSFORM = "TRANSFORM",
  UNKNOWN = "UNKNOWN",
  SCHEDULE = "SCHEDULE",
  TRANSACTION = "TRANSACTION",
  WALLET = "WALLET",
  LLM_PROMPT = "LLM_PROMPT",
  CONDITION = "CONDITION",
  AI_BLOCKCHAIN = "AI_BLOCKCHAIN"
}

// Shared execution context types
export interface BlockExecutionContext {
  executionId: string;
  workflowId?: string; // Made optional for backward compatibility
  nodeId?: string;
  userId?: string;
  tenantId?: string;
  inputs?: Record<string, any>;
  outputs?: Record<string, any>;
  previousResults?: Record<string, any>;
  previousOutputs?: Record<string, any>; // Legacy field used in some handlers
  workflowData?: Record<string, any>; // Legacy field used in some handlers
  logger?: any; // Used in node-executor
  [key: string]: any; // Allow additional properties for backward compatibility
}

// Block Handler Interface - ensures consistent implementation across handlers
export interface BlockHandler {
  /**
   * Execute the block with the given node and context
   * This is the only required method for a block handler
   */
  execute(node: any, ctx: BlockExecutionContext): Promise<any>;
  
  // Optional methods - can be implemented as public, protected, or private
  // TypeScript interfaces can't enforce privacy level, so handlers can implement these as needed
  // The implementing class should decide the visibility level based on its requirements
}

// Standard logging interface
export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

// --- DeFi Block Schemas ---

export const ProtocolMonitorConfigSchema = z.object({
  protocol: z.string(),
  metrics: z.array(z.string()).min(1),
  thresholds: z
    .record(
      z.string(),
      z.object({
        min: z.number().optional(),
        max: z.number().optional(),
        alert: z.boolean().optional().default(true),
      })
    )
    .optional(),
  monitoringInterval: z.number().min(1).default(60),
});
export type ProtocolMonitorConfig = z.infer<typeof ProtocolMonitorConfigSchema>;

// Position Manager
export const PositionManagerConfigSchema = z.object({
  walletAddress: z.string(),
  protocol: z.string(),
  asset: z.string(),
  amount: z.number().positive(),
  action: z.enum(["open", "close", "adjust"]),
  slippageTolerance: z.number().min(0).max(100).default(0.5),
  maxGas: z.number().positive().optional(),
});
export type PositionManagerConfig = z.infer<typeof PositionManagerConfigSchema>;

// Yield Strategy
export const YieldStrategyConfigSchema = z.object({
  assets: z.array(z.string()).min(1),
  riskTolerance: z.enum(["low", "medium", "high"]).default("medium"),
  timeHorizon: z.number().positive(),
  excludedProtocols: z.array(z.string()).optional(),
  autoCompound: z.boolean().default(false),
  minAPY: z.number().min(0).optional(),
});
export type YieldStrategyConfig = z.infer<typeof YieldStrategyConfigSchema>;

// Rebalance Calculator
export const RebalanceCalculatorConfigSchema = z.object({
  portfolio: z.record(z.string(), z.number()),
  targetAllocation: z.record(z.string(), z.number()),
  threshold: z.number().min(0).max(100).default(5),
  maxGas: z.number().positive().optional(),
});
export type RebalanceCalculatorConfig = z.infer<typeof RebalanceCalculatorConfigSchema>;

// Gas Optimizer
export const GasOptimizerConfigSchema = z.object({
  maxWaitTime: z.number().positive().default(120),
  targetGasPrice: z.number().optional(),
  priorityLevel: z.enum(["low", "medium", "high"]).default("medium"),
});
export type GasOptimizerConfig = z.infer<typeof GasOptimizerConfigSchema>;

// --- Additional DeFi Block Configurations ---

// Base configuration for all DeFi blocks
export interface DefiBlockConfig {
  type: BlockType;
  protocol?: string;
  assets?: string[];
  threshold?: number;
  slippage?: number;
  gasLimit?: number;
  maxFee?: number;
  rebalancePercentage?: number;
  yieldStrategy?: string;
  monitoringInterval?: number;
}

// Price Monitor Configuration
export interface PriceMonitorConfig extends DefiBlockConfig {
  type: BlockType.PRICE_MONITOR;
  assets: string[];
  threshold: number;
  monitoringInterval: number;
}

// Yield Monitor Configuration
export interface YieldMonitorConfig extends DefiBlockConfig {
  type: BlockType.YIELD_MONITOR;
  protocol: string;
  assets: string[];
  monitoringInterval: number;
  yieldThreshold: number;
}

// Portfolio Balance Configuration
export interface PortfolioBalanceConfig extends DefiBlockConfig {
  type: BlockType.PORTFOLIO_BALANCE;
  assets: string[];
  protocols: string[];
  monitoringInterval: number;
}

// Swap Executor Configuration
export interface SwapExecutorConfig extends DefiBlockConfig {
  type: BlockType.SWAP_EXECUTOR;
  sourceAsset: string;
  targetAsset: string;
  amount: string;
  slippage: number;
  gasLimit: number;
  maxFee: number;
}

// Liquidity Provider Configuration
export interface LiquidityProviderConfig extends DefiBlockConfig {
  type: BlockType.LIQUIDITY_PROVIDER;
  poolAddress: string;
  tokenA: string;
  tokenB: string;
  amount: string;
  slippage: number;
}

// Export block schemas
export * from './schemas/blockSchemas';

// Export all workflow types
export * from './workflow';

// Add more shared types and schemas as needed
