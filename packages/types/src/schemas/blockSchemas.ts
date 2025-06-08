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
