import { z } from "zod";
import { BlockType } from "../index";

/**
 * Zod schemas for block configurations
 * Shared between UI and worker for consistent validation
 */
export const blockSchemas: Record<BlockType, z.ZodTypeAny> = {
  [BlockType.PRICE_MONITOR]: z.object({
    asset: z.string(),
    condition: z.enum(["above", "below"]),
    targetPrice: z
      .string()
      .refine((v) => !isNaN(Number(v)), {
        message: "targetPrice must be numeric string",
      }),
    checkInterval: z
      .string()
      .refine((v) => !isNaN(Number(v)), {
        message: "checkInterval must be numeric string",
      }),
  }),
  [BlockType.SCHEDULE]: z.object({
    interval: z.string(),
    time: z.string().optional(),
  }),
  [BlockType.WEBHOOK]: z.object({
    url: z.string().url().optional(),
    method: z.enum(["GET", "POST"]).default("POST"),
    headers: z.record(z.string()).optional(),
  }),
  [BlockType.EMAIL]: z.object({
    to: z.string().email(),
    subject: z.string(),
    body: z.string(),
  }),
  [BlockType.NOTIFICATION]: z.object({
    channel: z.enum(["email", "push", "sms", "in_app"]).default("in_app"),
    title: z.string(),
    message: z.string(),
  }),
  [BlockType.CONDITION]: z.object({
    condition: z.string(),
  }),
  [BlockType.DELAY]: z.object({
    duration: z.number().positive(),
    unit: z.enum(["seconds", "minutes", "hours", "days"]),
  }),
  [BlockType.TRANSFORM]: z.object({
    template: z.string(),
    variables: z.record(z.any()).optional(),
  }),
  [BlockType.WALLET]: z.object({
    address: z.string(),
    chain: z.string().default("ethereum"),
    action: z.enum(["check_balance", "send"]).default("check_balance"),
    amount: z.string().optional(),
    to: z.string().optional(),
  }),
  [BlockType.UNKNOWN]: z.any(),

  // DeFi specific blocks
  [BlockType.DEFI_PRICE_MONITOR]: z.object({
    assets: z.array(z.string()).min(1),
    threshold: z.number(),
    monitoringInterval: z.number().min(1),
  }),
  [BlockType.DEFI_YIELD_MONITOR]: z.object({
    protocol: z.string(),
    assets: z.array(z.string()).min(1),
    monitoringInterval: z.number().min(1),
    yieldThreshold: z.number(),
  }),
  [BlockType.DEFI_PORTFOLIO]: z.object({
    assets: z.array(z.string()).min(1),
    protocols: z.array(z.string()),
    monitoringInterval: z.number().min(1),
  }),
  [BlockType.DEFI_REBALANCE]: z.object({
    targetWeights: z.record(z.number()),
    rebalanceThreshold: z.number(),
    slippage: z.number(),
  }),
  [BlockType.DEFI_SWAP]: z.object({
    sourceAsset: z.string(),
    targetAsset: z.string(),
    amount: z.string(),
    slippage: z.number(),
    gasLimit: z.number(),
    maxFee: z.number(),
  }),
  [BlockType.DEFI_GAS]: z.object({
    gasLimit: z.number(),
    maxFee: z.number(),
    optimizationStrategy: z.enum(["gas_price", "block_time", "network_load"]),
  }),
  [BlockType.DEFI_PROTOCOL]: z.object({
    protocol: z.string(),
    monitoringInterval: z.number(),
    healthThreshold: z.number(),
  }),
  [BlockType.DEFI_YIELD_STRATEGY]: z.object({
    strategy: z.string(),
    assets: z.array(z.string()),
    protocols: z.array(z.string()),
    optimizationGoal: z.enum(["max_yield", "min_risk", "balanced"]),
  }),
  [BlockType.DEFI_LIQUIDITY]: z.object({
    poolAddress: z.string(),
    tokenA: z.string(),
    tokenB: z.string(),
    amount: z.string(),
    slippage: z.number(),
  }),
  [BlockType.DEFI_POSITION]: z.object({
    assets: z.array(z.string()),
    protocols: z.array(z.string()),
    riskThreshold: z.number(),
    monitoringInterval: z.number(),
  }),

  // Modern DeFi blocks
  [BlockType.PROTOCOL_MONITOR]: z.object({
    protocol: z.string(),
    metrics: z.array(z.string()).min(1),
    thresholds: z.record(z.object({
      min: z.number().optional(),
      max: z.number().optional(),
      alert: z.boolean().optional().default(true),
    })).optional(),
    monitoringInterval: z.number().min(1).default(60),
  }),
  [BlockType.POSITION_MANAGER]: z.object({
    walletAddress: z.string(),
    protocol: z.string(),
    asset: z.string(),
    amount: z.number().positive(),
    action: z.enum(["open", "close", "adjust"]),
    slippageTolerance: z.number().min(0).max(100).default(0.5),
    maxGas: z.number().positive().optional(),
  }),
  [BlockType.YIELD_STRATEGY]: z.object({
    assets: z.array(z.string()).min(1),
    riskTolerance: z.enum(["low", "medium", "high"]).default("medium"),
    timeHorizon: z.number().positive(),
    excludedProtocols: z.array(z.string()).optional(),
    autoCompound: z.boolean().default(false),
    minAPY: z.number().min(0).optional(),
  }),
  [BlockType.LIQUIDITY_PROVIDER]: z.object({
    poolAddress: z.string(),
    tokenA: z.string(),
    tokenB: z.string(),
    amount: z.string(),
    slippage: z.number(),
  }),
  [BlockType.REBALANCE_CALCULATOR]: z.object({
    portfolio: z.record(z.number()),
    targetAllocation: z.record(z.number()),
    threshold: z.number().min(0).max(100).default(5),
    maxGas: z.number().positive().optional(),
  }),
  [BlockType.GAS_OPTIMIZER]: z.object({
    maxWaitTime: z.number().positive().default(120),
    targetGasPrice: z.number().optional(),
    priorityLevel: z.enum(["low", "medium", "high"]).default("medium"),
  }),
  [BlockType.SWAP_EXECUTOR]: z.object({
    sourceAsset: z.string(),
    targetAsset: z.string(),
    amount: z.string(),
    slippage: z.number(),
    gasLimit: z.number(),
    maxFee: z.number(),
  }),
  [BlockType.PORTFOLIO_BALANCE]: z.object({
    assets: z.array(z.string()).min(1),
    protocols: z.array(z.string()),
    monitoringInterval: z.number().min(1),
  }),
  [BlockType.YIELD_MONITOR]: z.object({
    protocol: z.string(),
    assets: z.array(z.string()).min(1),
    monitoringInterval: z.number().min(1),
    yieldThreshold: z.number(),
  }),

  // Other block types
  [BlockType.DISCORD]: z.object({
    webhookUrl: z.string().url(),
    content: z.string(),
    username: z.string().optional(),
    avatar_url: z.string().optional(),
  }),
  [BlockType.API]: z.object({
    url: z.string().url(),
    method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]).default("GET"),
    headers: z.record(z.string()).optional(),
    body: z.any().optional(),
  }),
  [BlockType.DATABASE]: z.object({
    query: z.string(),
    params: z.array(z.any()).optional(),
  }),
  [BlockType.SMS]: z.object({
    to: z.string(),
    message: z.string(),
  }),
  [BlockType.AI]: z.object({
    prompt: z.string(),
    model: z.string().optional(),
    temperature: z.number().min(0).max(1).default(0.7),
  }),
  [BlockType.FINANCE]: z.object({
    action: z.enum(["payment", "invoice", "subscription"]),
    amount: z.number().positive(),
    currency: z.string().default("USD"),
  }),
  [BlockType.CUSTOM]: z.any(),
  [BlockType.TRANSACTION]: z.object({
    chainId: z.number(),
    to: z.string(),
    value: z.string().optional(),
    data: z.string().optional(),
    gasLimit: z.number().optional(),
  }),
  [BlockType.LLM_PROMPT]: z.object({
    prompt: z.string(),
    model: z.string().optional(),
    temperature: z.number().min(0).max(1).default(0.7),
  }),
  [BlockType.AI_BLOCKCHAIN]: z.object({
    prompt: z.string(),
    model: z.string().optional(),
    chainId: z.number().default(1),
    walletAddress: z.string().optional(),
  }),
  [BlockType.GOAT_FINANCE]: z.object({
    asset: z.string(),
    amount: z.string(),
    strategy: z.string().optional(),
    walletAddress: z.string().optional(),
  }),
};

// Export the function to validate block configs
export function validateBlockConfig(blockType: BlockType, config: any): any {
  const schema = blockSchemas[blockType];
  if (!schema) {
    throw new Error(`No schema found for block type: ${blockType}`);
  }
  
  return schema.parse(config);
}

// Parse and validate with detailed error messages
export function safeValidateBlockConfig(blockType: BlockType, config: any): { success: boolean; data?: any; error?: string } {
  try {
    const result = validateBlockConfig(blockType, config);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { 
        success: false, 
        error: error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      };
    }
    return { success: false, error: String(error) };
  }
}
