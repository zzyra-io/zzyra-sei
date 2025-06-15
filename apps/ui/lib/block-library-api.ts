import { SaveBlockParams, SearchBlocksParams } from "@/types/block-library";

/**
 * API methods for interacting with the block library
 */

/**
 * Get all blocks available to the user  (personal, shared, verified)
 */
export async function getUserBlockLibrary() {
  // Get the current user
  // const { data: userData } = await supabase.auth.getUser();
  // if (!userData?.user) {
  //   throw new Error('User not authenticated');
  // }

  // // Get user's own blocks
  // const { data: userBlocks, error: userBlocksError } = await supabase
  //   .from('block_library')
  //   .select('*')
  //   .eq('user_id', userData.user.id)
  //   .order('created_at', { ascending: false });

  // if (userBlocksError) {
  //   console.error('Error fetching user blocks:', userBlocksError);
  //   throw new Error('Failed to fetch user blocks');
  // }

  // // Get public shared blocks from other users
  // const { data: sharedBlocks, error: sharedBlocksError } = await supabase
  //   .from('block_library')
  //   .select('*')
  //   .neq('user_id', userData.user.id)
  //   .eq('is_public', true)
  //   .eq('is_verified', false)
  //   .order('usage_count', { ascending: false })
  //   .limit(50);

  // if (sharedBlocksError) {
  //   console.error('Error fetching shared blocks:', sharedBlocksError);
  //   throw new Error('Failed to fetch shared blocks');
  // }

  // // Get verified blocks (curated by platform)
  // const { data: verifiedBlocks, error: verifiedBlocksError } = await supabase
  //   .from('block_library')
  //   .select('*')
  //   .eq('is_verified', true)
  //   .order('created_at', { ascending: false });

  // if (verifiedBlocksError) {
  //   console.error('Error fetching verified blocks:', verifiedBlocksError);
  //   throw new Error('Failed to fetch verified blocks');
  // }

  // // Transform data from snake_case to camelCase
  // const transformBlock = (block: any): BlockLibraryEntry => ({
  //   id: block.id,
  //   userId: block.user_id,
  //   name: block.name,
  //   description: block.description,
  //   blockType: block.block_type,
  //   category: block.category,
  //   blockData: block.block_data,
  //   isPublic: block.is_public,
  //   tags: block.tags || [],
  //   createdAt: block.created_at,
  //   updatedAt: block.updated_at,
  //   rating: block.rating || 0,
  //   usageCount: block.usage_count || 0,
  //   version: block.version || '1.0.0',
  //   isVerified: block.is_verified || false
  // });

  return {
    userBlocks: [],
    sharedBlocks: [],
    verifiedBlocks: [],
  };
}

/**
 * Save a block to the user's library
 */
export async function saveBlock(params: SaveBlockParams) {
  // Get the current user
  // const { data: userData } = await supabase.auth.getUser();
  // if (!userData?.user) {
  //   throw new Error('User not authenticated');
  // }

  const { blockData, blockType, isPublic, tags } = params;

  // Create the block entry
  const blockEntry = {
    user_id: "",
    name: blockData.name,
    description: blockData.description,
    block_type: blockType,
    category: blockData.category,
    block_data: blockData,
    is_public: isPublic,
    tags: tags || [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    rating: 0,
    usage_count: 0,
    version: "1.0.0",
    is_verified: false,
  };

  // Insert into Supabase
  // const { data, error } = await supabase
  //   .from('block_library')
  //   .insert(blockEntry)
  //   .select()
  //   .single();

  // if (error) {
  //   console.error('Error saving block:', error);
  //   throw new Error('Failed to save block');
  // }

  // Transform to camelCase
  return {};
}

/**
 * Search for blocks based on query parameters
 */
export async function searchBlocks(params: SearchBlocksParams) {
  // Transform results
  return [];
}

/**
 * Share a block with other users
 */
export async function shareBlock(blockId: string) {
  //   // Get the current user
  //   const { data: userData } = await supabase.auth.getUser();
  //   if (!userData?.user) {
  //     throw new Error("User not authenticated");
  //   }
  //   // Check if the block exists and belongs to the user
  //   const { data: blockData, error: blockError } = await supabase
  //     .from("block_library")
  //     .select("*")
  //     .eq("id", blockId)
  //     .eq("user_id", userData.user.id)
  //     .single();
  //   if (blockError || !blockData) {
  //     console.error("Error fetching block:", blockError);
  //     throw new Error("Block not found or access denied");
  //   }
  //   // Update the block to be public
  //   const { error: updateError } = await supabase
  //     .from("block_library")
  //     .update({ is_public: true })
  //     .eq("id", blockId);
  //   if (updateError) {
  //     console.error("Error updating block visibility:", updateError);
  //     throw new Error("Failed to make block public");
  //   }
  //   // Create a shareable link
  //   const shareId = `share_${blockId}`;
  //   const shareUrl = `${window.location.origin}/blocks/shared/${shareId}`;
  //   return {
  //     shareId,
  //     shareUrl,
  //   };
  // }
}
/**
 * Rate a block
 */
export async function rateBlock(
  blockId: string,
  rating: number
): Promise<void> {
  // Get the current user
  // const { data: userData } = await supabase.auth.getUser();
  // if (!userData?.user) {
  //   throw new Error("User not authenticated");
  // }
  // // Ensure rating is between 1-5
  // const validRating = Math.min(Math.max(1, rating), 5);
  // // Record the rating
  // const { error } = await supabase.from("block_ratings").upsert({
  //   block_id: blockId,
  //   user_id: userData.user.id,
  //   rating: validRating,
  //   created_at: new Date().toISOString(),
  // });
  // if (error) {
  //   console.error("Error rating block:", error);
  //   throw new Error("Failed to rate block");
  // }
  // // Update the average rating on the block
  // await supabase.rpc("update_block_rating", { block_id: blockId });
}

/**
 * Increment the usage count for a block
 */
export async function incrementBlockUsage(blockId: string): Promise<void> {
  // const { error } = await supabase
  //   .from("block_library")
  //   .update({
  //     usage_count: supabase.rpc("increment_counter", {
  //       row_id: blockId,
  //       counter_name: "usage_count",
  //     }),
  //   })
  //   .eq("id", blockId);
  // if (error) {
  //   console.error("Error incrementing usage count:", error);
  //   // Non-blocking error, just log it
  // }
}
