import { NextResponse } from "next/server";
import { BLOCK_CATALOG } from "@zyra/types";

export async function GET() {
  try {
    // Convert the shared block catalog to an array for the API response
    const blockTypes = Object.values(BLOCK_CATALOG);

    return NextResponse.json(blockTypes);
  } catch (error) {
    console.error("Error in block-types API:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
