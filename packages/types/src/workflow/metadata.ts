import { BlockType } from '../index';
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
 * Helper function to get block metadata by type
 */
export function getBlockMetadata(blockType: BlockType | string): BlockMetadata | null {
  // Implementation depends on the block catalog
  // This function is implemented in UI and worker separately
  // but with the same signature
  return null;
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
        if (enumValue.toLowerCase().replace(/_/g, "-") === normalizedType) {
          return enumValue as BlockType;
        }
      }
    }
  }

  // Return unknown if no match found
  return BlockType.UNKNOWN;
}
