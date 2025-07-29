import { BlockType } from "./block-types";
import { NodeCategory } from "./categories";

/**
 * Block metadata interface - defines UI-specific properties
 * for each block type such as label, icon, description, etc.
 */
export interface BlockMetadata {
  type: BlockType;
  label: string;
  description: string;
  category: NodeCategory;
  icon: string;
  defaultConfig: Record<string, any>;
  metadata?: {
    customBlockId?: string;
    isOwned?: boolean;
    isPublic?: boolean;
    [key: string]: any;
  };
}

/**
 * Shared block catalog with common metadata for all block types
 * This serves as the single source of truth for block metadata
 */
export const BLOCK_CATALOG: Record<string, BlockMetadata> = {
  // AI Agent block
  [BlockType.AI_AGENT]: {
    type: BlockType.AI_AGENT,
    label: "AI Agent",
    description: "AI-powered agent with tools and reasoning capabilities",
    category: NodeCategory.AI,
    icon: "brain",
    defaultConfig: {
      provider: {
        type: "openrouter",
        model: "openai/gpt-4o-mini",
        temperature: 0.7,
        maxTokens: 2000,
      },
      agent: {
        name: "AI Assistant",
        systemPrompt:
          "You are a helpful AI assistant with access to various tools.",
        userPrompt: "",
        maxSteps: 10,
        thinkingMode: "deliberate",
      },
      selectedTools: [],
      execution: {
        mode: "autonomous",
        timeout: 120000,
        requireApproval: false,
        saveThinking: true,
      },
    },
  },

  // Legacy blocks
  [BlockType.PRICE_MONITOR]: {
    type: BlockType.PRICE_MONITOR,
    label: "Price Monitor",
    description: "Monitor cryptocurrency prices",
    category: NodeCategory.TRIGGER,
    icon: "trending-up",
    defaultConfig: {
      asset: "ETH",
      condition: "above",
      targetPrice: "2000",
      checkInterval: "5",
    },
  },

  [BlockType.EMAIL]: {
    type: BlockType.EMAIL,
    label: "Email",
    description: "Send email notifications",
    category: NodeCategory.ACTION,
    icon: "mail",
    defaultConfig: {
      to: "recipient@example.com",
      subject: "Email Notification",
      body: "This is an email notification from your workflow.",
    },
  },

  [BlockType.NOTIFICATION]: {
    type: BlockType.NOTIFICATION,
    label: "Notification",
    description:
      "Send notifications via email, webhook, Discord, Slack, or Telegram",
    category: NodeCategory.ACTION,
    icon: "bell",
    defaultConfig: {
      notificationType: "email",
      to: "",
      subject: "",
      body: "",
      template: "",
    },
  },

  [BlockType.SCHEDULE]: {
    type: BlockType.SCHEDULE,
    label: "Schedule",
    description: "Trigger workflows on a schedule",
    category: NodeCategory.TRIGGER,
    icon: "calendar",
    defaultConfig: {
      interval: "daily",
      time: "09:00",
    },
  },

  [BlockType.WEBHOOK]: {
    type: BlockType.WEBHOOK,
    label: "Webhook",
    description: "Trigger workflows via HTTP webhook",
    category: NodeCategory.TRIGGER,
    icon: "webhook",
    defaultConfig: {
      url: "",
      method: "POST",
    },
  },

  [BlockType.CONDITION]: {
    type: BlockType.CONDITION,
    label: "Condition",
    description: "Add conditional logic to workflows",
    category: NodeCategory.LOGIC,
    icon: "filter",
    defaultConfig: {
      condition: "",
    },
  },

  // Generic blocks
  [BlockType.HTTP_REQUEST]: {
    type: BlockType.HTTP_REQUEST,
    label: "HTTP Request",
    description: "Make HTTP requests to any API endpoint",
    category: NodeCategory.ACTION,
    icon: "globe",
    defaultConfig: {
      url: "",
      method: "GET",
      headers: {},
      retries: 3,
      timeout: 10000,
    },
  },

  // Unknown fallback
  [BlockType.UNKNOWN]: {
    type: BlockType.UNKNOWN,
    label: "Unknown",
    description: "Unknown block type",
    category: NodeCategory.ACTION,
    icon: "help-circle",
    defaultConfig: {},
  },

  [BlockType.DATA_TRANSFORM]: {
    type: BlockType.DATA_TRANSFORM,
    label: "Data Transform",
    description: "Transform and manipulate data between blocks",
    category: NodeCategory.DATA_PROCESSING,
    icon: "transform",
    defaultConfig: {
      transformations: [],
      outputSchema: {},
    },
  },

  [BlockType.CUSTOM]: {
    type: BlockType.CUSTOM,
    label: "Custom Block",
    description: "Execute custom JavaScript or Python code",
    category: NodeCategory.ACTION,
    icon: "puzzle",
    defaultConfig: {
      customBlockId: "",
      code: "",
      inputs: {},
    },
  },

  [BlockType.WALLET_LISTEN]: {
    type: BlockType.WALLET_LISTEN,
    label: "Wallet Listener",
    description: "Listen for wallet events",
    category: NodeCategory.TRIGGER,
    icon: "wallet",
    defaultConfig: {
      network: "sei",
      walletAddresses: [],
      eventTypes: [],
      minAmount: 0,
    },
  },
};

/**
 * Helper function to get block metadata by type
 */
export function getBlockMetadata(
  blockType: BlockType | string
): BlockMetadata | null {
  return BLOCK_CATALOG[blockType as string] || null;
}

/**
 * Helper to get block type from various sources in a node/data object
 * Used to handle various ways block types might be stored in data
 */
export function getBlockType(data: any): BlockType {
  // Check for custom blocks first
  if (data?.customBlockId || data?.config?.customBlockId) {
    return BlockType.CUSTOM;
  }

  // Check if the block type is explicitly CUSTOM
  const possibleTypes = [data?.blockType, data?.type, data?.id].filter(Boolean);
  for (const type of possibleTypes) {
    const upperType = type.toUpperCase();
    if (upperType === "CUSTOM") {
      return BlockType.CUSTOM;
    }
  }

  // First check if we have a direct nodeType that matches a category
  if (data?.nodeType) {
    const nodeType = data.nodeType.toUpperCase();
    if (Object.values(NodeCategory).includes(nodeType as NodeCategory)) {
      // If it's a valid category, look up the corresponding block type
      const blockType = Object.entries(BLOCK_CATALOG).find(
        ([_, metadata]) => metadata.category === nodeType
      )?.[0];
      if (blockType) {
        return blockType as BlockType;
      }
    }
  }

  // Then check blockType
  for (const type of possibleTypes) {
    // Convert to uppercase for enum matching since BlockType uses uppercase
    const upperType = type.toUpperCase();
    // Check if it matches any BlockType enum value
    if (Object.values(BlockType).includes(upperType as BlockType)) {
      return upperType as BlockType;
    }
  }

  return BlockType.UNKNOWN;
}
