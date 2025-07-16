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
