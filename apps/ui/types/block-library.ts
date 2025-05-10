import { BlockType } from "@zyra/types";
import { AICustomBlockData } from "@zyra/types";

/**
 * Interface for shared/saved DeFi block entry
 */
export interface BlockLibraryEntry {
  id: string;
  userId: string;
  name: string;
  description: string;
  blockType: BlockType;
  category: string;
  blockData: AICustomBlockData;
  isPublic: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  rating: number;
  usageCount: number;
  version: string;
  isVerified: boolean;
}

/**
 * A library of reusable, shared DeFi blocks
 */
export interface BlockLibrary {
  userBlocks: BlockLibraryEntry[];
  sharedBlocks: BlockLibraryEntry[];
  verifiedBlocks: BlockLibraryEntry[];
}

/**
 * Parameters for saving a block to the library
 */
export interface SaveBlockParams {
  blockData: AICustomBlockData;
  blockType: BlockType;
  isPublic: boolean;
  tags: string[];
}

/**
 * Parameters for searching blocks
 */
export interface SearchBlocksParams {
  query?: string;
  blockType?: BlockType;
  tags?: string[];
  includePublic?: boolean;
  includeVerified?: boolean;
  sortBy?: "rating" | "usageCount" | "createdAt";
  sortDirection?: "asc" | "desc";
}

/**
 * The result of a block sharing operation
 */
export interface ShareBlockResult {
  shareId: string;
  shareUrl: string;
  expiresAt?: string;
}
