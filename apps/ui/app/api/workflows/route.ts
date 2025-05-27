import { NextRequest, NextResponse } from "next/server";
import { WorkflowRepository } from "@zyra/database";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// Initialize repositories
const workflowRepository = new WorkflowRepository();

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    console.log("session", session);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("session", session);
    const workflows = await workflowRepository.findByUserId(session.user.id);
    console.log("workflows", workflows);

    // Map the Prisma model to match the expected format in the frontend
    const mappedWorkflows = workflows.map((workflow) => ({
      ...workflow,
      is_public: workflow.isPublic,
      user_id: workflow.userId,
      created_at: workflow.createdAt?.toISOString() || new Date().toISOString(),
      updated_at:
        workflow.updatedAt?.toISOString() ||
        workflow.createdAt?.toISOString() ||
        new Date().toISOString(),
      isFavorite: false, // Default value, would need to be set based on user preferences
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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    console.log("session", session);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workflowData = await request.json();

    // Prepare data for creation
    const createData = {
      name: workflowData.name || "New Workflow",
      description: workflowData.description || "",
      nodes: workflowData.nodes || [],
      edges: workflowData.edges || [],
      isPublic: workflowData.is_public || false,
      tags: workflowData.tags || [],
      userId: session.user.id,
    };

    // Create workflow
    const newWorkflow = await workflowRepository.create(
      createData,
      session.user.id
    );

    // Map back to frontend format
    const mappedWorkflow = {
      ...newWorkflow,
      is_public: newWorkflow.isPublic,
      user_id: newWorkflow.userId,
      created_at:
        newWorkflow.createdAt?.toISOString() || new Date().toISOString(),
      updated_at:
        newWorkflow.updatedAt?.toISOString() ||
        newWorkflow.createdAt?.toISOString() ||
        new Date().toISOString(),
    };

    return NextResponse.json(mappedWorkflow);
  } catch (error) {
    console.error("Error creating workflow:", error);
    return NextResponse.json(
      { error: "Failed to create workflow" },
      { status: 500 }
    );
  }
}
