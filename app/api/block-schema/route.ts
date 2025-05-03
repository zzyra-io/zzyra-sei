// ui/app/api/block-schemas/route.ts
import { NextResponse } from "next/server";
import { blockSchemas } from "@/lib/schemas/blockSchemas";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type");

  // If no type provided, return all schemas
  if (!type) {
    return NextResponse.json(blockSchemas);
  }

  // Return schema for specific block type
  const schema = (blockSchemas as Record<string, unknown>)[type];
  if (!schema) {
    return NextResponse.json({ error: "Schema not found" }, { status: 404 });
  }

  return NextResponse.json(schema);
}
