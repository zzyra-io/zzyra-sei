// ui/app/api/block-schema/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";

// Define simple hardcoded schemas for the most common block types
const localBlockSchemas: Record<string, z.ZodTypeAny> = {
  WEBHOOK: z.object({
    url: z.string().url().optional(),
    method: z.enum(["GET", "POST"]).default("POST"),
    headers: z.record(z.string()).optional(),
  }),
  EMAIL: z.object({
    to: z.string().email(),
    subject: z.string(),
    body: z.string(),
  }),
  NOTIFICATION: z.object({
    channel: z.enum(["email", "push", "sms", "in_app"]).default("in_app"),
    title: z.string(),
    message: z.string(),
  }),
  CUSTOM: z.object({
    customBlockId: z.string(),
    inputs: z.record(z.any()).optional().default({}),
  }),
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type");

  try {
    // If no type provided, return all schemas
    if (!type) {
      return NextResponse.json(localBlockSchemas);
    }

    // Return schema for specific block type
    const schema = localBlockSchemas[type];
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
