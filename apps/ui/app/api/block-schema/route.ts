// ui/app/api/block-schemas/route.ts
import { NextResponse } from "next/server";
import { BlockType, blockSchemas } from "@zyra/types";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type");

  try {
    // If no type provided, return all schemas
    if (!type) {
      return NextResponse.json(blockSchemas);
    }

    // Return schema for specific block type
    // First ensure the type exists in BlockType
    if (Object.values(BlockType).includes(type as BlockType)) {
      const schema = blockSchemas[type as BlockType];
      return NextResponse.json(schema);
    } else {
      return NextResponse.json(
        { error: "Block type not found" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error in block-schema API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
