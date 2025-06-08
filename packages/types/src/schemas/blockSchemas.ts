import { z } from "zod";
import { BlockType } from "../workflow/block-types";

/**
 * Zod schemas for block configurations
 * Shared between UI and worker for consistent validation
 */
export const blockSchemas: Record<BlockType, z.ZodTypeAny> = {
  [BlockType.PRICE_MONITOR]: z.object({
    asset: z.string().min(1),
    condition: z.enum(["above", "below", "equals", "change"]).optional(),
    targetPrice: z.string().optional(),
    checkInterval: z.string().optional(),
    dataSource: z
      .enum(["coingecko", "coinmarketcap", "binance"])
      .default("coingecko"),
  }),

  [BlockType.EMAIL]: z.object({
    to: z.string().email(),
    subject: z.string().min(1),
    body: z.string().min(1),
    cc: z.string().email().optional(),
    template: z.string().optional(),
  }),

  [BlockType.NOTIFICATION]: z.object({
    channel: z.enum(["email", "push", "sms", "in_app"]).default("in_app"),
    title: z.string().min(1),
    message: z.string().min(1),
  }),

  [BlockType.CONDITION]: z.object({
    condition: z.string().min(1),
    description: z.string().optional(),
  }),

  [BlockType.DELAY]: z.object({
    duration: z.number().positive(),
    unit: z.enum(["seconds", "minutes", "hours", "days"]).default("minutes"),
  }),

  [BlockType.SCHEDULE]: z.object({
    interval: z
      .enum(["once", "minutely", "hourly", "daily", "weekly", "monthly"])
      .default("daily"),
    time: z.string().optional(),
    cron: z.string().optional(),
    timezone: z.string().optional(),
  }),

  [BlockType.WEBHOOK]: z.object({
    url: z.string().url(),
    method: z.enum(["GET", "POST", "PUT", "DELETE"]).default("POST"),
    headers: z.record(z.string()).optional(),
    body: z.string().optional(),
  }),

  [BlockType.UNKNOWN]: z.any(),

  // Generic block schemas
  [BlockType.HTTP_REQUEST]: z.object({
    url: z.string().url(),
    method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]).default("GET"),
    headers: z.record(z.string()).optional(),
    body: z.any().optional(),
    dataPath: z.string().optional(),
    retries: z.number().default(3),
    timeout: z.number().default(10000),
  }),

  [BlockType.CALCULATOR]: z.object({
    operation: z
      .enum([
        "add",
        "subtract",
        "multiply",
        "divide",
        "percentage",
        "percentageOf",
        "average",
        "min",
        "max",
        "sum",
        "round",
        "floor",
        "ceil",
        "abs",
        "sqrt",
        "power",
      ])
      .optional(),
    inputs: z.record(z.any()).optional(),
    formula: z.string().optional(),
    precision: z.number().default(8),
  }),

  [BlockType.COMPARATOR]: z.object({
    operation: z
      .enum([
        "equals",
        "eq",
        "not_equals",
        "neq",
        "greater_than",
        "gt",
        "greater_than_or_equal",
        "gte",
        "less_than",
        "lt",
        "less_than_or_equal",
        "lte",
        "between",
        "not_between",
        "in",
        "not_in",
        "contains",
        "not_contains",
        "starts_with",
        "ends_with",
        "is_null",
        "is_not_null",
        "is_empty",
        "is_not_empty",
        "regex_match",
      ])
      .optional(),
    inputs: z.record(z.any()).optional(),
    conditions: z
      .array(
        z.object({
          operation: z.string(),
          inputs: z.record(z.any()),
          logicalOperator: z.enum(["and", "or", "&&", "||"]).optional(),
        })
      )
      .optional(),
  }),

  [BlockType.BLOCKCHAIN_READ]: z.object({
    operation: z.enum([
      "get_balance",
      "get_token_balance",
      "get_token_info",
      "get_nft_balance",
      "call_contract",
      "get_transaction",
      "get_transaction_receipt",
      "get_block",
      "get_logs",
    ]),
    network: z
      .enum([
        "ethereum",
        "polygon",
        "base",
        "optimism",
        "arbitrum",
        "bsc",
        "sepolia",
        "base_sepolia",
        "polygon-amoy",
      ])
      .default("ethereum"),
    address: z.string().optional(),
    tokenAddress: z.string().optional(),
    contractAddress: z.string().optional(),
    methodName: z.string().optional(),
    methodParams: z.array(z.any()).optional(),
    transactionHash: z.string().optional(),
    txHash: z.string().optional(), // Alternative field name for compatibility
    blockNumber: z.string().optional(),
    tokenId: z.string().optional(),
    retries: z.number().default(3),
  }),

  // Data Input/Output
  [BlockType.DATABASE_QUERY]: z.object({
    query: z.string().min(1),
    parameters: z.record(z.any()).optional(),
    database: z.string().optional(),
  }),

  [BlockType.FILE_READ]: z.object({
    path: z.string().min(1),
    encoding: z.enum(["utf8", "base64", "binary"]).default("utf8"),
    maxSize: z.number().optional(),
  }),

  // Processing
  [BlockType.TRANSFORMER]: z.object({
    transformType: z.enum(["map", "filter", "reduce", "sort", "group"]),
    rules: z.array(z.any()),
    outputFormat: z.enum(["json", "array", "object"]).default("json"),
  }),

  [BlockType.AGGREGATOR]: z.object({
    operation: z.enum(["count", "sum", "average", "min", "max", "group_by"]),
    field: z.string().optional(),
    groupBy: z.string().optional(),
  }),

  // Logic
  [BlockType.LOOP]: z.object({
    loopType: z.enum(["for", "while", "forEach"]),
    condition: z.string().optional(),
    iterations: z.number().optional(),
    items: z.array(z.any()).optional(),
  }),

  // External Actions
  [BlockType.HTTP_CALL]: z.object({
    url: z.string().url(),
    method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]).default("POST"),
    headers: z.record(z.string()).optional(),
    body: z.any().optional(),
    retries: z.number().default(3),
  }),

  [BlockType.MESSAGE_SEND]: z.object({
    channel: z.enum(["email", "sms", "push", "slack", "discord", "webhook"]),
    recipient: z.string().min(1),
    subject: z.string().optional(),
    message: z.string().min(1),
    template: z.string().optional(),
  }),

  [BlockType.DATABASE_WRITE]: z.object({
    operation: z.enum(["insert", "update", "delete", "upsert"]),
    table: z.string().min(1),
    data: z.record(z.any()),
    conditions: z.record(z.any()).optional(),
  }),

  [BlockType.BLOCKCHAIN_WRITE]: z.object({
    operation: z.enum(["send_transaction", "deploy_contract", "call_contract"]),
    network: z
      .enum(["ethereum", "polygon", "base-sepolia", "sepolia", "polygon-amoy"])
      .default("ethereum"),
    to: z.string().optional(),
    value: z.string().optional(),
    data: z.string().optional(),
    gasLimit: z.string().optional(),
    gasPrice: z.string().optional(),
  }),

  [BlockType.FILE_WRITE]: z.object({
    path: z.string().min(1),
    content: z.string(),
    encoding: z.enum(["utf8", "base64", "binary"]).default("utf8"),
    append: z.boolean().default(false),
  }),
};

/**
 * Validate block configuration against its schema
 */
export function validateBlockConfig(blockType: BlockType, config: any): any {
  const schema = blockSchemas[blockType];
  if (!schema) {
    throw new Error(`No schema found for block type: ${blockType}`);
  }
  return schema.parse(config);
}

/**
 * Safely validate block configuration without throwing
 */
export function safeValidateBlockConfig(
  blockType: BlockType,
  config: any
): { success: boolean; data?: any; error?: string } {
  try {
    const schema = blockSchemas[blockType];
    if (!schema) {
      return {
        success: false,
        error: `No schema found for block type: ${blockType}`,
      };
    }
    const data = schema.parse(config);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Validation failed",
    };
  }
}
