import { z } from "zod";
import { BlockType } from "../workflow/block-types";
import { walletListenerSchema } from "./blockchains/wallet-listener/schema";
import {
  seiWalletListenerSchema,
  seiSmartContractCallSchema,
  seiOnchainDataFetchSchema,
  seiPaymentSchema,
  seiNftSchema,
} from "./blockchains/sei";

/**
 * Enhanced block schema definition with input/output schemas
 */
export interface EnhancedBlockSchema {
  configSchema: z.ZodTypeAny;
  inputSchema: z.ZodObject<any>;
  outputSchema: z.ZodObject<any>;
  metadata?: {
    category: string;
    icon: string;
    description: string;
    tags?: string[];
  };
}

/**
 * Enhanced HTTP Request block schema definition
 */
export const enhancedHttpRequestSchema: EnhancedBlockSchema = {
  configSchema: z.object({
    url: z.string().url(),
    method: z.enum(["GET", "POST", "PUT", "DELETE", "PATCH"]).default("GET"),
    headers: z.record(z.string(), z.string()).optional(),
    body: z.any().optional(),
    dataPath: z.string().optional(),
    retries: z.number().min(0).max(10).default(3),
    timeout: z.number().min(1000).max(300000).default(10000),
  }),
  inputSchema: z.object({
    data: z.any().optional(), // Generic data from previous blocks
    context: z
      .object({
        workflowId: z.string(),
        executionId: z.string(),
        userId: z.string(),
        timestamp: z.string(),
      })
      .optional(),
    variables: z.record(z.string(), z.any()).optional(), // Workflow variables
  }),
  outputSchema: z.object({
    statusCode: z.number(),
    data: z.any(),
    headers: z.record(z.string(), z.string()),
    url: z.string(),
    method: z.string(),
    timestamp: z.string(),
    success: z.boolean(),
    error: z.string().optional(),
  }),
  metadata: {
    category: "action",
    icon: "globe",
    description:
      "Make HTTP requests to any API endpoint with schema validation",
    tags: ["http", "api", "request", "web"],
  },
};

/**
 * Enhanced Notification block schema definition
 */
export const enhancedNotificationSchema: EnhancedBlockSchema = {
  configSchema: z.object({
    notificationType: z.literal("email"),
    to: z.string().email(),
    subject: z.string().min(1),
    body: z.string().min(1),
    template: z.string().optional(),
    cc: z.string().email().optional(),
    bcc: z.string().email().optional(),
    emailProvider: z.string().optional(),
    htmlFormat: z.boolean().optional(),
  }),
  inputSchema: z.object({
    data: z.any().optional(), // Generic data from previous blocks
    context: z
      .object({
        workflowId: z.string(),
        executionId: z.string(),
        userId: z.string(),
        timestamp: z.string(),
      })
      .optional(),
    variables: z.record(z.string(), z.any()).optional(), // Workflow variables
  }),
  outputSchema: z.object({
    success: z.boolean(),
    messageId: z.string().optional(),
    timestamp: z.string(),
    notificationType: z.string(),
    recipient: z.string().optional(),
    error: z.string().optional(),
  }),
  metadata: {
    category: "action",
    icon: "bell",
    description: "Send email notifications with template support",
    tags: ["notification", "email", "communication"],
  },
};

/**
 * Enhanced Price Monitor block schema definition
 */
export const enhancedPriceMonitorSchema: EnhancedBlockSchema = {
  configSchema: z.object({
    asset: z.string().min(1),
    condition: z.enum(["above", "below", "equals", "change"]).optional(),
    targetPrice: z.string().optional(),
    checkInterval: z.string().optional(),
    dataSource: z
      .enum(["coingecko", "coinmarketcap", "binance"])
      .default("coingecko"),
  }),
  inputSchema: z.object({
    data: z.any().optional(), // Generic data from previous blocks
    context: z
      .object({
        workflowId: z.string(),
        executionId: z.string(),
        userId: z.string(),
        timestamp: z.string(),
      })
      .optional(),
    variables: z.record(z.string(), z.any()).optional(), // Workflow variables
  }),
  outputSchema: z.object({
    asset: z.string(),
    currentPrice: z.number(),
    targetPrice: z.number().optional(),
    condition: z.string().optional(),
    triggered: z.boolean(),
    timestamp: z.string(),
    dataSource: z.string(),
  }),
  metadata: {
    category: "trigger",
    icon: "trending-up",
    description: "Monitor cryptocurrency prices with conditional triggers",
    tags: ["price", "crypto", "monitor", "trigger", "trading"],
  },
};

/**
 * Enhanced Email block schema definition
 */
export const enhancedEmailSchema: EnhancedBlockSchema = {
  configSchema: z.object({
    to: z.string().email(),
    subject: z.string().min(1),
    body: z.string().min(1),
    cc: z.string().email().optional(),
    template: z.string().optional(),
  }),
  inputSchema: z.object({
    data: z.any().optional(), // Generic data from previous blocks
    context: z
      .object({
        workflowId: z.string(),
        executionId: z.string(),
        userId: z.string(),
        timestamp: z.string(),
      })
      .optional(),
    variables: z.record(z.string(), z.any()).optional(), // Workflow variables
  }),
  outputSchema: z.object({
    success: z.boolean(),
    messageId: z.string().optional(),
    timestamp: z.string(),
    recipient: z.string(),
    subject: z.string(),
    error: z.string().optional(),
  }),
  metadata: {
    category: "action",
    icon: "mail",
    description: "Send email notifications with template support",
    tags: ["email", "notification", "communication"],
  },
};

/**
 * Enhanced Condition block schema definition
 */
export const enhancedConditionSchema: EnhancedBlockSchema = {
  configSchema: z.object({
    condition: z.string().min(1),
    description: z.string().optional(),
  }),
  inputSchema: z.object({
    data: z.any().optional(), // Generic data from previous blocks
    context: z
      .object({
        workflowId: z.string(),
        executionId: z.string(),
        userId: z.string(),
        timestamp: z.string(),
      })
      .optional(),
    variables: z.record(z.string(), z.any()).optional(), // Workflow variables
  }),
  outputSchema: z.object({
    result: z.boolean(),
    condition: z.string(),
    evaluatedAt: z.string(),
    data: z.any().optional(),
  }),
  metadata: {
    category: "logic",
    icon: "filter",
    description: "Add conditional logic and branching to workflows",
    tags: ["condition", "logic", "branching", "control-flow"],
  },
};

/**
 * Enhanced Schedule block schema definition
 */
export const enhancedScheduleSchema: EnhancedBlockSchema = {
  configSchema: z.object({
    interval: z
      .enum(["once", "minutely", "hourly", "daily", "weekly", "monthly"])
      .default("daily"),
    time: z.string().optional(),
    cron: z.string().optional(),
    timezone: z.string().optional(),
  }),
  inputSchema: z.object({
    data: z.any().optional(), // Generic data from previous blocks
    context: z
      .object({
        workflowId: z.string(),
        executionId: z.string(),
        userId: z.string(),
        timestamp: z.string(),
      })
      .optional(),
    variables: z.record(z.string(), z.any()).optional(), // Workflow variables
  }),
  outputSchema: z.object({
    triggered: z.boolean(),
    nextRun: z.string().optional(),
    lastRun: z.string().optional(),
    schedule: z.string(),
    timestamp: z.string(),
  }),
  metadata: {
    category: "trigger",
    icon: "calendar",
    description: "Trigger workflows on a schedule with cron support",
    tags: ["schedule", "trigger", "cron", "automation"],
  },
};

/**
 * Enhanced Webhook block schema definition
 */
export const enhancedWebhookSchema: EnhancedBlockSchema = {
  configSchema: z.object({
    url: z.string().url(),
    method: z.enum(["GET", "POST", "PUT", "DELETE"]).default("POST"),
    headers: z.record(z.string(), z.string()).optional(),
    body: z.string().optional(),
  }),
  inputSchema: z.object({
    data: z.any().optional(), // Generic data from previous blocks
    context: z
      .object({
        workflowId: z.string(),
        executionId: z.string(),
        userId: z.string(),
        timestamp: z.string(),
      })
      .optional(),
    variables: z.record(z.string(), z.any()).optional(), // Workflow variables
  }),
  outputSchema: z.object({
    success: z.boolean(),
    statusCode: z.number(),
    response: z.any(),
    timestamp: z.string(),
    url: z.string(),
    method: z.string(),
    error: z.string().optional(),
  }),
  metadata: {
    category: "trigger",
    icon: "webhook",
    description: "Trigger workflows via HTTP webhook endpoints",
    tags: ["webhook", "trigger", "http", "integration"],
  },
};

/**
 * Enhanced Custom block schema definition
 */
export const enhancedCustomSchema: EnhancedBlockSchema = {
  configSchema: z.object({
    code: z.string().min(1),
    inputs: z.record(z.string(), z.any()).optional(),
    outputs: z.record(z.string(), z.any()).optional(),
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
    defaultConfig: z.record(z.string(), z.any()).optional(),
  }),
  inputSchema: z.object({
    data: z.any().optional(), // Generic data from previous blocks
    context: z
      .object({
        workflowId: z.string(),
        executionId: z.string(),
        userId: z.string(),
        timestamp: z.string(),
      })
      .optional(),
    variables: z.record(z.string(), z.any()).optional(), // Workflow variables
  }),
  outputSchema: z.object({
    success: z.boolean(),
    result: z.any(),
    executionTime: z.number().optional(),
    timestamp: z.string(),
    error: z.string().optional(),
    logs: z.array(z.string()).optional(),
  }),
  metadata: {
    category: "action",
    icon: "puzzle",
    description: "Execute custom JavaScript or Python code",
    tags: ["custom", "code", "javascript", "python", "scripting"],
  },
};

/**
 * Enhanced Data Transform block schema definition
 */
export const enhancedDataTransformSchema: EnhancedBlockSchema = {
  configSchema: z.object({
    transformations: z.array(
      z.object({
        type: z.enum([
          "map",
          "filter",
          "aggregate",
          "format",
          "extract",
          "combine",
          "conditional",
          "loop",
          "sort",
        ]),
        field: z.string(),
        operation: z.string(),
        value: z.any().optional(),
        outputField: z.string().optional(),
      })
    ),
    outputSchema: z.record(z.string(), z.any()).optional(),
    previewMode: z.boolean().default(true),
  }),
  inputSchema: z.object({
    data: z.any().optional(), // Generic data from previous blocks
    context: z
      .object({
        workflowId: z.string(),
        executionId: z.string(),
        userId: z.string(),
        timestamp: z.string(),
      })
      .optional(),
    variables: z.record(z.string(), z.any()).optional(), // Workflow variables
  }),
  outputSchema: z.object({
    transformedData: z.any(), // Transformed data
    originalData: z.any().optional(), // Original data for reference
    transformationLog: z
      .array(
        z.object({
          type: z.string(),
          field: z.string(),
          operation: z.string(),
          success: z.boolean(),
          error: z.string().optional(),
        })
      )
      .optional(),
    metadata: z.object({
      transformationCount: z.number(),
      executionTime: z.number(),
      timestamp: z.string(),
    }),
  }),
  metadata: {
    category: "data_processing",
    icon: "transform",
    description: "Transform and manipulate data between blocks",
  },
};

// AI Agent Schema
const aiAgentConfigSchema = z.object({
  provider: z.object({
    type: z.enum(['openrouter', 'openai', 'anthropic', 'ollama']),
    model: z.string(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().min(1).optional(),
  }),
  agent: z.object({
    name: z.string(),
    systemPrompt: z.string(),
    userPrompt: z.string(),
    maxSteps: z.number().min(1).max(50),
    thinkingMode: z.enum(['fast', 'deliberate', 'collaborative']),
  }),
  selectedTools: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['mcp', 'goat', 'builtin']),
    config: z.record(z.string(), z.any()),
  })),
  execution: z.object({
    mode: z.enum(['autonomous', 'interactive']),
    timeout: z.number().min(1000),
    requireApproval: z.boolean(),
    saveThinking: z.boolean(),
  }),
});

const enhancedAIAgentSchema: EnhancedBlockSchema = {
  configSchema: aiAgentConfigSchema,
  inputSchema: z.object({
    prompt: z.string().optional(),
    context: z.record(z.string(), z.any()).optional(),
  }),
  outputSchema: z.object({
    result: z.string(),
    reasoning: z.array(z.object({
      step: z.number(),
      type: z.string(),
      reasoning: z.string(),
      timestamp: z.string(),
    })).optional(),
    toolCalls: z.array(z.object({
      name: z.string(),
      parameters: z.record(z.string(), z.any()),
      result: z.any().optional(),
    })).optional(),
  }),
  metadata: {
    category: "ai_automation",
    icon: "brain",
    description: "Execute tasks using AI agents with access to various tools",
  }
};

/**
 * Zod schemas for block configurations
 * Shared between UI and worker for consistent validation
 * All schemas now use enhanced format with config/input/output validation
 */
export const blockSchemas: Record<BlockType, z.ZodTypeAny> = {
  [BlockType.PRICE_MONITOR]: enhancedPriceMonitorSchema.configSchema,
  [BlockType.EMAIL]: enhancedEmailSchema.configSchema,
  [BlockType.NOTIFICATION]: enhancedNotificationSchema.configSchema,
  [BlockType.SCHEDULE]: enhancedScheduleSchema.configSchema,
  [BlockType.WEBHOOK]: enhancedWebhookSchema.configSchema,
  [BlockType.CONDITION]: enhancedConditionSchema.configSchema,
  [BlockType.HTTP_REQUEST]: enhancedHttpRequestSchema.configSchema,
  [BlockType.CUSTOM]: enhancedCustomSchema.configSchema,
  [BlockType.DATA_TRANSFORM]: enhancedDataTransformSchema.configSchema,
  [BlockType.AI_AGENT]: enhancedAIAgentSchema.configSchema,
  [BlockType.WALLET_LISTEN]: walletListenerSchema.configSchema,
  [BlockType.SEI_WALLET_LISTEN]: seiWalletListenerSchema.configSchema,
  [BlockType.SEI_CONTRACT_CALL]: seiSmartContractCallSchema.configSchema,
  [BlockType.SEI_DATA_FETCH]: seiOnchainDataFetchSchema.configSchema,
  [BlockType.SEI_PAYMENT]: seiPaymentSchema.configSchema,
  [BlockType.SEI_NFT]: seiNftSchema.configSchema,
  [BlockType.UNKNOWN]: z.any(),
};

/**
 * Enhanced block schemas registry
 * All blocks now use enhanced schemas with config/input/output validation
 */
export const enhancedBlockSchemas: Partial<
  Record<BlockType, EnhancedBlockSchema>
> = {
  [BlockType.HTTP_REQUEST]: enhancedHttpRequestSchema,
  [BlockType.NOTIFICATION]: enhancedNotificationSchema,
  [BlockType.PRICE_MONITOR]: enhancedPriceMonitorSchema,
  [BlockType.EMAIL]: enhancedEmailSchema,
  [BlockType.CONDITION]: enhancedConditionSchema,
  [BlockType.SCHEDULE]: enhancedScheduleSchema,
  [BlockType.WEBHOOK]: enhancedWebhookSchema,
  [BlockType.CUSTOM]: enhancedCustomSchema,
  [BlockType.DATA_TRANSFORM]: enhancedDataTransformSchema,
  [BlockType.AI_AGENT]: enhancedAIAgentSchema,
  [BlockType.WALLET_LISTEN]: walletListenerSchema,
  [BlockType.SEI_WALLET_LISTEN]: seiWalletListenerSchema,
  [BlockType.SEI_CONTRACT_CALL]: seiSmartContractCallSchema,
  [BlockType.SEI_DATA_FETCH]: seiOnchainDataFetchSchema,
  [BlockType.SEI_PAYMENT]: seiPaymentSchema,
  [BlockType.SEI_NFT]: seiNftSchema,
};

/**
 * Get enhanced schema for a block type
 */
export function getEnhancedBlockSchema(
  blockType: BlockType
): EnhancedBlockSchema | undefined {
  return enhancedBlockSchemas[blockType];
}

/**
 * Check if a block type has enhanced schema support
 */
export function hasEnhancedSchema(blockType: BlockType): boolean {
  return blockType in enhancedBlockSchemas;
}

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
 * Validate block configuration against enhanced schema
 */
export function validateEnhancedBlockConfig(
  blockType: BlockType,
  config: any
): any {
  const enhancedSchema = enhancedBlockSchemas[blockType];
  if (enhancedSchema) {
    return enhancedSchema.configSchema.parse(config);
  }
  // Fallback to legacy validation
  return validateBlockConfig(blockType, config);
}

/**
 * Validate block inputs against enhanced schema
 */
export function validateBlockInputs(blockType: BlockType, inputs: any): any {
  const enhancedSchema = enhancedBlockSchemas[blockType];
  if (enhancedSchema) {
    return enhancedSchema.inputSchema.parse(inputs);
  }
  // Legacy blocks don't validate inputs
  return inputs;
}

/**
 * Validate block outputs against enhanced schema
 */
export function validateBlockOutputs(blockType: BlockType, outputs: any): any {
  const enhancedSchema = enhancedBlockSchemas[blockType];
  if (enhancedSchema) {
    return enhancedSchema.outputSchema.parse(outputs);
  }
  // Legacy blocks don't validate outputs
  return outputs;
}

/**
 * Safely validate block configuration without throwing
 */
export function safeValidateBlockConfig(
  blockType: BlockType,
  config: any
): { success: boolean; data?: any; error?: string } {
  try {
    const data = validateEnhancedBlockConfig(blockType, config);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Validation failed",
    };
  }
}

/**
 * Safely validate block inputs without throwing
 */
export function safeValidateBlockInputs(
  blockType: BlockType,
  inputs: any
): { success: boolean; data?: any; error?: string } {
  try {
    const data = validateBlockInputs(blockType, inputs);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Input validation failed",
    };
  }
}

/**
 * Safely validate block outputs without throwing
 */
export function safeValidateBlockOutputs(
  blockType: BlockType,
  outputs: any
): { success: boolean; data?: any; error?: string } {
  try {
    const data = validateBlockOutputs(blockType, outputs);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Output validation failed",
    };
  }
}

// Enhanced schemas are already exported above
