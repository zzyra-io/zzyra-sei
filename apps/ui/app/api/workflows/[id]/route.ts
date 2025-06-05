import { NextRequest, NextResponse } from "next/server";
import { WorkflowRepository } from "@zyra/database";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// Initialize repositories
const workflowRepository = new WorkflowRepository();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const resolvedParams = await params;
    console.log("params", resolvedParams);
    const { id } = resolvedParams;
    const workflow = await workflowRepository.findById(id, session.user.id);

    if (!workflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Map the Prisma model to match the expected format in the frontend
    const mappedWorkflow = {
      ...workflow,
      is_public: workflow.isPublic,
      user_id: workflow.userId,
      created_at: workflow.createdAt?.toISOString() || new Date().toISOString(),
      updated_at:
        workflow.updatedAt?.toISOString() ||
        workflow.createdAt?.toISOString() ||
        new Date().toISOString(),
    };

    return NextResponse.json(mappedWorkflow);
  } catch (error) {
    console.error("Error fetching workflow:", error);
    return NextResponse.json(
      { error: "Failed to fetch workflow" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const resolvedParams = await params;
    console.log("params", resolvedParams);
    const { id } = resolvedParams;
    const workflowData = await request.json();

    // Check if workflow exists and user has access
    const existingWorkflow = await workflowRepository.findById(
      id,
      session.user.id
    );
    if (!existingWorkflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Prepare data for update
    // Convert from frontend format to database format
    const updateData = {
      name: workflowData.name,
      description: workflowData.description,
      nodes: workflowData.nodes || existingWorkflow.nodes,
      edges: workflowData.edges || existingWorkflow.edges,
      isPublic:
        workflowData.is_public !== undefined
          ? workflowData.is_public
          : existingWorkflow.isPublic,
      tags: workflowData.tags || existingWorkflow.tags,
    };

    // Update workflow
    const updatedWorkflow = await workflowRepository.update(id, updateData);

    // Map back to frontend format
    const mappedWorkflow = {
      ...updatedWorkflow,
      is_public: updatedWorkflow.isPublic,
      user_id: updatedWorkflow.userId,
      created_at:
        updatedWorkflow.createdAt?.toISOString() || new Date().toISOString(),
      updated_at:
        updatedWorkflow.updatedAt?.toISOString() ||
        updatedWorkflow.createdAt?.toISOString() ||
        new Date().toISOString(),
    };

    return NextResponse.json(mappedWorkflow);
  } catch (error) {
    console.error("Error updating workflow:", error);
    return NextResponse.json(
      { error: "Failed to update workflow" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;

    // Check if workflow exists and user has access
    const existingWorkflow = await workflowRepository.findById(
      id,
      session.user.id
    );
    if (!existingWorkflow) {
      return NextResponse.json(
        { error: "Workflow not found" },
        { status: 404 }
      );
    }

    // Delete workflow
    await workflowRepository.delete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting workflow:", error);
    return NextResponse.json(
      { error: "Failed to delete workflow" },
      { status: 500 }
    );
  }
}
