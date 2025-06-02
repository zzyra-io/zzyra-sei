import { NextResponse } from "next/server";
import prisma from "@zyra/database/src/client";
import { getServerSession } from "next-auth/next";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const { id: executionId } = params;
  
  // Validate session
  const session = await getServerSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
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
    
    // Update execution status to failed (since there's no 'canceled' status in the enum)
    await prisma.workflowExecution.update({
      where: { id: executionId },
      data: { status: "failed", error: "Execution canceled by user" }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error canceling execution:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to cancel execution" },
      { status: 500 }
    );
  }
}
