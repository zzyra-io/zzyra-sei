import { z } from "zod";
import { BlockType } from "../workflow/block-types";

// Import directly from the source file to ensure we get the latest enum values

/**
 * Zod schemas for block configurations
 * Shared between UI and worker for consistent validation
 */
export const blockSchemas: Record<BlockType, z.ZodTypeAny> = {
  [BlockType.PRICE_MONITOR]: z.object({
    asset: z.string(),
    condition: z.enum(["above", "below"]),
    targetPrice: z.string().refine((v) => !isNaN(Number(v)), {
      message: "targetPrice must be numeric string",
    }),
    checkInterval: z.string().refine((v) => !isNaN(Number(v)), {
      message: "checkInterval must be numeric string",
    }),
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

  [BlockType.UNKNOWN]: z.any(),
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
export function safeValidateBlockConfig(
  blockType: BlockType,
  config: any
): { success: boolean; data?: any; error?: string } {
  try {
    const result = validateBlockConfig(blockType, config);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors
          .map((e) => `${e.path.join(".")}: ${e.message}`)
          .join(", "),
      };
    }
    return { success: false, error: String(error) };
  }
}
