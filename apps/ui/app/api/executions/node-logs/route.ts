import { NextResponse } from "next/server";
import prisma from "@zyra/database/src/client";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const nodeExecutionId = searchParams.get("nodeExecutionId");

  // Validate session
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!nodeExecutionId) {
    return NextResponse.json(
      { error: "Missing nodeExecutionId" },
      { status: 400 }
    );
  }

  try {
    // Verify user has access to this node execution
    const nodeExecution = await prisma.nodeExecution.findFirst({
      where: {
        id: nodeExecutionId,
        execution: {
          workflow: {
            userId: session.user.id,
          },
        },
      },
      select: {
        id: true,
      },
    });

    if (!nodeExecution) {
      return NextResponse.json(
        { error: "Node execution not found or access denied" },
        { status: 404 }
      );
    }

    // Fetch node logs
    const nodeLogs = await prisma.nodeLog.findMany({
      where: {
        nodeExecutionId: nodeExecutionId,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Format the response to match the expected structure
    const formattedLogs = nodeLogs.map((log) => ({
      id: log.id,
      node_execution_id: log.nodeExecutionId,
      level: log.level,
      message: log.message,
      created_at: log.createdAt.toISOString(),
    }));

    return NextResponse.json(formattedLogs);
  } catch (error) {
    console.error("Error fetching node logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch node logs" },
      { status: 500 }
    );
  }
}
