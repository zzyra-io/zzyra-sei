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

  [BlockType.CONDITION]: z.object({
    condition: z.string().min(1),
    description: z.string().optional(),
  }),

  // [BlockType.DELAY]: z.object({
  //   duration: z.number().positive(),
  //   unit: z.enum(["seconds", "minutes", "hours", "days"]).default("minutes"),
  // }),

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

  [BlockType.CUSTOM]: z.object({
    code: z.string().min(1),
    inputs: z.record(z.any()).optional(),
    outputs: z.record(z.any()).optional(),
    logicType: z.enum(["javascript", "python"]).default("javascript"),
    tags: z.array(z.string()).optional(),
    isPublic: z.boolean().default(false),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
    createdBy: z.string().optional(),
    version: z.number().default(1),
    description: z.string().optional(),
    category: z.string().optional(),
    name: z.string().optional(),
    icon: z.string().optional(),
    defaultConfig: z.record(z.any()).optional(),
  }),

  // [BlockType.CALCULATOR]: z.object({
  //   operation: z
  //     .enum([
  //       "add",
  //       "subtract",
  //       "multiply",
  //       "divide",
  //       "percentage",
  //       "percentageOf",
  //       "average",
  //       "min",
  //       "max",
  //       "sum",
  //       "round",
  //       "floor",
  //       "ceil",
  //       "abs",
  //       "sqrt",
  //       "power",
  //     ])
  //     .optional(),
  //   inputs: z.record(z.any()).optional(),
  //   formula: z.string().optional(),
  //   precision: z.number().default(8),
  // }),

  // [BlockType.COMPARATOR]: z.object({
  //   operation: z
  //     .enum([
  //       "equals",
  //       "eq",
  //       "not_equals",
  //       "neq",
  //       "greater_than",
  //       "gt",
  //       "greater_than_or_equal",
  //       "gte",
  //       "less_than",
  //       "lt",
  //       "less_than_or_equal",
  //       "lte",
  //       "between",
  //       "not_between",
  //       "in",
  //       "not_in",
  //       "contains",
  //       "not_contains",
  //       "starts_with",
  //       "ends_with",
  //       "is_null",
  //       "is_not_null",
  //       "is_empty",
  //       "is_not_empty",
  //       "regex_match",
  //     ])
  //     .optional(),
  //   inputs: z.record(z.any()).optional(),
  //   conditions: z
  //     .array(
  //       z.object({
  //         operation: z.string(),
  //         inputs: z.record(z.any()),
  //         logicalOperator: z.enum(["and", "or", "&&", "||"]).optional(),
  //       })
  //     )
  //     .optional(),
  // }),
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
