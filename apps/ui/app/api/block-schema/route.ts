// ui/app/api/block-schema/route.ts
import { NextResponse } from "next/server";
import { blockSchemas } from "@zyra/types";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type");

  try {
    // If no type provided, return all schemas
    if (!type) {
      return NextResponse.json(blockSchemas);
    }

    // Return schema for specific block type
    const schema = blockSchemas[type as keyof typeof blockSchemas];
    if (schema) {
      return NextResponse.json(schema);
    }

    return NextResponse.json({ error: "Schema not found" }, { status: 404 });
  } catch (error) {
    console.error("Error in block-schema API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
