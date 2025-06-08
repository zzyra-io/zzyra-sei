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
}

/**
 * Shared block catalog with common metadata for all block types
 * This serves as the single source of truth for block metadata
 */
export const BLOCK_CATALOG: Record<string, BlockMetadata> = {
  // Legacy blocks
  [BlockType.PRICE_MONITOR]: {
    type: BlockType.PRICE_MONITOR,
    label: "Price Monitor",
    description: "Monitor cryptocurrency prices",
    category: NodeCategory.TRIGGER,
    icon: "trending-up",
    defaultConfig: {
      asset: "ETHEREUM",
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
      to: "",
      subject: "",
      body: "",
    },
  },

  [BlockType.NOTIFICATION]: {
    type: BlockType.NOTIFICATION,
    label: "Notification",
    description: "Send push notifications",
    category: NodeCategory.ACTION,
    icon: "bell",
    defaultConfig: {
      channel: "in_app",
      title: "",
      message: "",
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

  [BlockType.DELAY]: {
    type: BlockType.DELAY,
    label: "Delay",
    description: "Add a delay to workflow execution",
    category: NodeCategory.LOGIC,
    icon: "clock",
    defaultConfig: {
      duration: 5,
      unit: "minutes",
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

  [BlockType.CALCULATOR]: {
    type: BlockType.CALCULATOR,
    label: "Calculator",
    description: "Perform arithmetic operations and calculations",
    category: NodeCategory.LOGIC,
    icon: "calculator",
    defaultConfig: {
      operation: "add",
      inputs: {},
      precision: 8,
    },
  },

  [BlockType.COMPARATOR]: {
    type: BlockType.COMPARATOR,
    label: "Comparator",
    description: "Compare values with conditions and logical operators",
    category: NodeCategory.LOGIC,
    icon: "scale",
    defaultConfig: {
      operation: "equals",
      inputs: {
        left: "",
        right: "",
      },
    },
  },

  [BlockType.BLOCKCHAIN_READ]: {
    type: BlockType.BLOCKCHAIN_READ,
    label: "Blockchain Read",
    description: "Read data from blockchain networks",
    category: NodeCategory.ACTION,
    icon: "database",
    defaultConfig: {
      operation: "get_balance",
      network: "ethereum",
      address: "",
      retries: 3,
    },
  },

  // Data Input/Output
  [BlockType.DATABASE_QUERY]: {
    type: BlockType.DATABASE_QUERY,
    label: "Database Query",
    description: "Query database for information",
    category: NodeCategory.ACTION,
    icon: "database",
    defaultConfig: {
      query: "",
    },
  },

  [BlockType.FILE_READ]: {
    type: BlockType.FILE_READ,
    label: "File Read",
    description: "Read content from files",
    category: NodeCategory.ACTION,
    icon: "file-text",
    defaultConfig: {
      path: "",
      encoding: "utf8",
    },
  },

  // Processing
  [BlockType.TRANSFORMER]: {
    type: BlockType.TRANSFORMER,
    label: "Transformer",
    description: "Transform and manipulate data",
    category: NodeCategory.LOGIC,
    icon: "shuffle",
    defaultConfig: {
      transformType: "map",
      rules: [],
      outputFormat: "json",
    },
  },

  [BlockType.AGGREGATOR]: {
    type: BlockType.AGGREGATOR,
    label: "Aggregator",
    description: "Aggregate and analyze data",
    category: NodeCategory.LOGIC,
    icon: "pie-chart",
    defaultConfig: {
      operation: "count",
    },
  },

  // Logic
  [BlockType.LOOP]: {
    type: BlockType.LOOP,
    label: "Loop",
    description: "Repeat actions with loop logic",
    category: NodeCategory.LOGIC,
    icon: "repeat",
    defaultConfig: {
      loopType: "for",
      iterations: 1,
    },
  },

  // External Actions
  [BlockType.HTTP_CALL]: {
    type: BlockType.HTTP_CALL,
    label: "HTTP Call",
    description: "Make HTTP calls to external services",
    category: NodeCategory.ACTION,
    icon: "send",
    defaultConfig: {
      url: "",
      method: "POST",
      retries: 3,
    },
  },

  [BlockType.MESSAGE_SEND]: {
    type: BlockType.MESSAGE_SEND,
    label: "Message Send",
    description: "Send messages via various channels",
    category: NodeCategory.ACTION,
    icon: "message-square",
    defaultConfig: {
      channel: "email",
      recipient: "",
      message: "",
    },
  },

  [BlockType.DATABASE_WRITE]: {
    type: BlockType.DATABASE_WRITE,
    label: "Database Write",
    description: "Write data to database",
    category: NodeCategory.ACTION,
    icon: "database",
    defaultConfig: {
      operation: "insert",
      table: "",
      data: {},
    },
  },

  [BlockType.BLOCKCHAIN_WRITE]: {
    type: BlockType.BLOCKCHAIN_WRITE,
    label: "Blockchain Write",
    description: "Write transactions to blockchain",
    category: NodeCategory.ACTION,
    icon: "link",
    defaultConfig: {
      operation: "send_transaction",
      network: "ethereum",
    },
  },

  [BlockType.FILE_WRITE]: {
    type: BlockType.FILE_WRITE,
    label: "File Write",
    description: "Write content to files",
    category: NodeCategory.ACTION,
    icon: "file-plus",
    defaultConfig: {
      path: "",
      content: "",
      encoding: "utf8",
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
  const possibleTypes = [data?.blockType, data?.type, data?.id].filter(Boolean);

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
