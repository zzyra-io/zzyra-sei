import { NextResponse } from "next/server";
import prisma from "@zyra/database/src/client";
import { getServerSession } from "next-auth/next";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  // Validate session
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: executionId } = params;
  const { nodeId } = await request.json();

  try {
    // Verify user has access to this execution
    const execution = await prisma.workflowExecution.findFirst({
      where: {
        id: executionId,
        workflow: {
          userId: session.user.id
        }
      },
      select: {
        id: true
      }
    });

    if (!execution) {
      return NextResponse.json({ error: "Execution not found or access denied" }, { status: 404 });
    }
    
    // TODO: enqueue retry logic for specific node
    // For now, mark execution as running and let worker handle retry
    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: { status: "running" }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error retrying execution:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to retry execution" },
      { status: 500 }
    );
  }
}
