import { BlockType } from './block-types';
import { NodeCategory } from './categories';

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
  [BlockType.PRICE_MONITOR]: {
    type: BlockType.PRICE_MONITOR,
    label: 'Price Monitor',
    description: 'Monitor cryptocurrency prices',
    category: NodeCategory.TRIGGER,
    icon: 'trending-up',
    defaultConfig: {
      asset: 'ETHEREUM',
      condition: 'above',
      targetPrice: '2000',
      checkInterval: '5',
    },
  },
  [BlockType.WEBHOOK]: {
    type: BlockType.WEBHOOK,
    label: 'Webhook',
    description: 'Trigger or respond to webhook events',
    category: NodeCategory.TRIGGER,
    icon: 'webhook',
    defaultConfig: {
      url: '',
      method: 'POST',
      headers: {},
    },
  },
  [BlockType.CUSTOM]: {
    type: BlockType.CUSTOM,
    label: 'Custom Block',
    description: 'Create your custom logic block',
    category: NodeCategory.ACTION,
    icon: 'puzzle',
    defaultConfig: {
      customBlockId: '',
      inputs: {},
    },
  },
  [BlockType.EMAIL]: {
    type: BlockType.EMAIL,
    label: 'Email',
    description: 'Send email notifications',
    category: NodeCategory.ACTION,
    icon: 'mail',
    defaultConfig: {
      to: '',
      subject: '',
      body: '',
    },
  },
};

/**
 * Helper function to get block metadata by type
 */
export function getBlockMetadata(blockType: BlockType | string): BlockMetadata | null {
  return BLOCK_CATALOG[blockType as string] || null;
}

/**
 * Helper to get block type from various sources in a node/data object
 * Used to handle various ways block types might be stored in data
 */
export function getBlockType(data: any): BlockType {
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
    if (typeof typeValue === 'string') {
      // Check direct match first
      if (Object.values(BlockType).includes(typeValue as BlockType)) {
        return typeValue as BlockType;
      }
      
      // Try normalized match
      const normalizedType = typeValue.toLowerCase().replace(/_/g, "-");
      for (const [enumKey, enumValue] of Object.entries(BlockType)) {
        // Add proper type assertion for enumValue
        const blockTypeValue = enumValue as string;
        if (blockTypeValue.toLowerCase().replace(/_/g, "-") === normalizedType) {
          return blockTypeValue as BlockType;
        }
      }
    }
  }

  // Return unknown if no match found
  return BlockType.UNKNOWN;
}
