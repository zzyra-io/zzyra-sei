import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const workflows = await prisma.workflow.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        userId: true,
        name: true,
        description: true,
        nodes: true,
        edges: true,
        isPublic: true,
        tags: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Map the Prisma model to match the expected format in the frontend
    const mappedWorkflows = workflows.map(workflow => ({
      ...workflow,
      is_public: workflow.isPublic,
      user_id: workflow.userId,
      created_at: workflow.createdAt.toISOString(),
      updated_at: workflow.updatedAt?.toISOString() || workflow.createdAt.toISOString(),
      isFavorite: false // Default value, would need to be set based on user preferences
    }));

    return NextResponse.json(mappedWorkflows);
  } catch (error) {
    console.error("Error fetching workflows:", error);
    return NextResponse.json(
      { error: "Failed to fetch workflows" },
      { status: 500 }
    );
  }
}
