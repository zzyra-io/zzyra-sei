import { NextResponse } from "next/server";
import { BlockType } from "@zyra/types";
import { BLOCK_CATALOG, BlockMetadata } from "@/types/workflow";

export async function GET() {
  // Return all available block types metadata
  const blockTypes: BlockMetadata[] = Object.values(BLOCK_CATALOG);
  return NextResponse.json(blockTypes);
}
