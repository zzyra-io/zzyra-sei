// Block type enum for consistent type identification
export enum BlockType {
  // Trigger blocks
  PRICE_MONITOR = "price-monitor",
  SCHEDULE = "schedule",
  WEBHOOK = "webhook",

  // Action blocks
  EMAIL = "email",
  NOTIFICATION = "notification",
  DATABASE = "database",
  WALLET = "wallet",
  TRANSACTION = "transaction",

  // Logic blocks
  CONDITION = "condition",
  DELAY = "delay",
  TRANSFORM = "transform",

  // Finance blocks
  GOAT_FINANCE = "goat-finance",

  // Custom blocks
  CUSTOM = "custom",
  LLM_PROMPT = "llm-prompt",

  // Default/unknown
  UNKNOWN = "unknown",
}

export interface BlockExecutionContext {
  executionId: string;
  userId?: string;
  previousOutputs?: Record<string, any>;
  // Add more as needed
}

// Node type categories
export enum NodeCategory {
  TRIGGER = "trigger",
  ACTION = "action",
  LOGIC = "logic",
  FINANCE = "finance",
}

// Block metadata interface
export interface BlockMetadata {
  type: BlockType;
  label: string;
  description: string;
  category: NodeCategory;
  icon: string;
  defaultConfig: Record<string, any>;
}

// Block catalog definition with metadata for each block type
export const BLOCK_CATALOG: Record<BlockType, BlockMetadata> = {
  [BlockType.PRICE_MONITOR]: {
    type: BlockType.PRICE_MONITOR,
    label: "Price Monitor",
    description: "Monitor cryptocurrency prices",
    category: NodeCategory.TRIGGER,
    icon: "price-monitor",
    defaultConfig: {
      asset: "ETHEREUM",
      condition: "above",
      targetPrice: "2000",
      checkInterval: "5",
    },
  },
  [BlockType.SCHEDULE]: {
    type: BlockType.SCHEDULE,
    label: "Schedule",
    description: "Trigger workflow on a schedule",
    category: NodeCategory.TRIGGER,
    icon: "schedule",
    defaultConfig: {
      interval: "hourly",
      time: "09:00",
    },
  },
  [BlockType.WEBHOOK]: {
    type: BlockType.WEBHOOK,
    label: "Webhook",
    description: "Trigger via HTTP webhook",
    category: NodeCategory.TRIGGER,
    icon: "webhook",
    defaultConfig: {
      method: "POST",
      url: "",
    },
  },
  [BlockType.EMAIL]: {
    type: BlockType.EMAIL,
    label: "Send Email",
    description: "Send an email notification",
    category: NodeCategory.ACTION,
    icon: "email",
    defaultConfig: {
      to: "",
      subject: "Workflow Notification",
      body: "",
    },
  },
  [BlockType.NOTIFICATION]: {
    type: BlockType.NOTIFICATION,
    label: "Notification",
    description: "Send a notification",
    category: NodeCategory.ACTION,
    icon: "notification",
    defaultConfig: {
      type: "info",
      title: "",
      message: "",
    },
  },
  [BlockType.DATABASE]: {
    type: BlockType.DATABASE,
    label: "Database",
    description: "Interact with database",
    category: NodeCategory.ACTION,
    icon: "database",
    defaultConfig: {
      operation: "select",
      table: "",
    },
  },
  [BlockType.WALLET]: {
    type: BlockType.WALLET,
    label: "Wallet",
    description: "Wallet operations",
    category: NodeCategory.ACTION,
    icon: "wallet",
    defaultConfig: {
      blockchain: "ethereum",
      operation: "connect",
    },
  },
  [BlockType.TRANSACTION]: {
    type: BlockType.TRANSACTION,
    label: "Transaction",
    description: "Execute blockchain transaction",
    category: NodeCategory.ACTION,
    icon: "transaction",
    defaultConfig: {
      blockchain: "ethereum",
      type: "transfer",
    },
  },
  [BlockType.CONDITION]: {
    type: BlockType.CONDITION,
    label: "Condition",
    description: "Branch based on condition",
    category: NodeCategory.LOGIC,
    icon: "condition",
    defaultConfig: {
      type: "simple",
      condition: "",
    },
  },
  [BlockType.DELAY]: {
    type: BlockType.DELAY,
    label: "Delay",
    description: "Add delay between steps",
    category: NodeCategory.LOGIC,
    icon: "delay",
    defaultConfig: {
      duration: "5",
      unit: "minutes",
    },
  },
  [BlockType.TRANSFORM]: {
    type: BlockType.TRANSFORM,
    label: "Transform",
    description: "Transform data format",
    category: NodeCategory.LOGIC,
    icon: "transform",
    defaultConfig: {
      transformType: "javascript",
      code: "",
    },
  },
  [BlockType.GOAT_FINANCE]: {
    type: BlockType.GOAT_FINANCE,
    label: "Finance Operations",
    description: "Execute financial operations",
    category: NodeCategory.FINANCE,
    icon: "goat-finance",
    defaultConfig: {
      operation: "balance",
      blockchain: "ethereum",
    },
  },
  [BlockType.CUSTOM]: {
    type: BlockType.CUSTOM,
    label: "Custom Block",
    description: "User-defined custom block",
    category: NodeCategory.ACTION,
    icon: "custom-block",
    defaultConfig: {},
  },
  [BlockType.LLM_PROMPT]: {
    type: BlockType.LLM_PROMPT,
    label: "LLM Prompt",
    description: "Generate text via LLM",
    category: NodeCategory.ACTION,
    icon: "ai",
    defaultConfig: {
      promptTemplate: "",
      model: "gpt-3.5-turbo",
      temperature: 0.7,
      maxTokens: 256,
      stream: false,
    },
  },
  [BlockType.UNKNOWN]: {
    type: BlockType.UNKNOWN,
    label: "Unknown Block",
    description: "Block with unknown type",
    category: NodeCategory.ACTION,
    icon: "unknown",
    defaultConfig: {},
  },
};

// Helper functions for working with block types
export const getBlockMetadata = (
  blockType: BlockType | string
): BlockMetadata => {
  // If it's already a BlockType enum, use it directly
  if (Object.values(BlockType).includes(blockType as BlockType)) {
    return BLOCK_CATALOG[blockType as BlockType];
  }

  // Try to find a matching block type
  const normalizedType = (blockType || "").toLowerCase().replace(/_/g, "-");
  const matchedType = Object.values(BlockType).find(
    (type) => type === normalizedType
  );

  if (matchedType) {
    return BLOCK_CATALOG[matchedType];
  }

  // Return unknown block type if no match found
  return BLOCK_CATALOG[BlockType.UNKNOWN];
};

// Get category color
export const getCategoryColor = (category: NodeCategory): string => {
  switch (category) {
    case NodeCategory.TRIGGER:
      return "blue";
    case NodeCategory.ACTION:
      return "green";
    case NodeCategory.LOGIC:
      return "purple";
    case NodeCategory.FINANCE:
      return "amber";
    default:
      return "gray";
  }
};

// Helper to get block type from various sources
export const getBlockType = (data: any): BlockType => {
  // Check if it's a custom block
  if (data?.customBlockId) {
    return BlockType.CUSTOM;
  }

  // Gather possible type fields
  const possibleTypes = [
    data?.blockType,
    data?.type,
    data?.nodeType,
    data?.id,
  ].filter(Boolean);

  // Try to match each possible type to a BlockType enum
  for (const typeValue of possibleTypes) {
    const normalizedType = (typeValue || "").toLowerCase().replace(/_/g, "-");
    const matchedType = Object.values(BlockType).find(
      (type) => type === normalizedType
    );
    if (matchedType) {
      return matchedType;
    }
  }

  // Return unknown if no match found
  return BlockType.UNKNOWN;
};
