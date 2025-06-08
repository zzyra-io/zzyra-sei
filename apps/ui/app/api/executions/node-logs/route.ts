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
    // First find the block execution to verify it exists and the user has access
    let blockExecution = await prisma.blockExecution.findFirst({
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
        nodeId: true,
        executionId: true,
      },
    });

    if (!blockExecution) {
      // Try to find by nodeId if it's not found by ID
      // Some clients might pass nodeId instead of the blockExecution ID
      const blockExecutionByNodeId = await prisma.blockExecution.findFirst({
        where: {
          nodeId: nodeExecutionId,
          execution: {
            workflow: {
              userId: session.user.id,
            },
          },
        },
        select: {
          id: true,
          nodeId: true,
          executionId: true,
        },
      });

      if (!blockExecutionByNodeId) {
        return NextResponse.json(
          { error: "Node execution not found or access denied" },
          { status: 404 }
        );
      }

      blockExecution = blockExecutionByNodeId;
    }

    // First try to find logs that explicitly reference this node ID in metadata
    const nodeLogs = await prisma.executionLog.findMany({
      where: {
        executionId: blockExecution.executionId,
        metadata: {
          path: ["node_id"],
          equals: blockExecution.nodeId,
        },
      },
      orderBy: {
        timestamp: "asc",
      },
    });

    // If no logs found with explicit node_id in metadata, get all logs for this execution as a fallback
    if (nodeLogs.length === 0) {
      const allExecutionLogs = await prisma.executionLog.findMany({
        where: {
          executionId: blockExecution.executionId,
        },
        orderBy: {
          timestamp: "asc",
        },
        take: 50,
      });

      if (allExecutionLogs.length > 0) {
        // Check for any logs that might contain node information in metadata
        const logsWithNodeInfo = allExecutionLogs.filter((log) => {
          try {
            const metadata =
              typeof log.metadata === "string"
                ? JSON.parse(log.metadata)
                : log.metadata;
            return (
              metadata &&
              (metadata.node_id === blockExecution.nodeId ||
                metadata.nodeId === blockExecution.nodeId)
            );
          } catch {
            return false;
          }
        });

        // If we found any logs with node info, use those instead
        if (logsWithNodeInfo.length > 0) {
          return NextResponse.json(
            logsWithNodeInfo.map((log) => {
              const metadata =
                typeof log.metadata === "string"
                  ? JSON.parse(log.metadata)
                  : log.metadata;

              return {
                id: log.id,
                node_execution_id: blockExecution.id,
                level: log.level,
                message: log.message,
                created_at: log.timestamp.toISOString(),
                node_id: blockExecution.nodeId,
                data: metadata,
              };
            })
          );
        }
      }
    }

    // Format the response to match the expected structure
    const formattedLogs = nodeLogs.map((log) => {
      let data = null;
      let nodeId = blockExecution.nodeId;

      try {
        if (log.metadata) {
          const metadata =
            typeof log.metadata === "string"
              ? JSON.parse(log.metadata)
              : log.metadata;

          if (metadata && metadata.node_id) {
            nodeId = metadata.node_id;
          }

          data = metadata;
        }
      } catch (error) {
        console.error("Error parsing log metadata:", error);
      }

      return {
        id: log.id,
        node_execution_id: blockExecution.id,
        level: log.level,
        message: log.message,
        created_at: log.timestamp.toISOString(),
        node_id: nodeId,
        data: data,
      };
    });

    return NextResponse.json(formattedLogs);
  } catch (error) {
    console.error("Error fetching node logs:", error);

    // Fallback: try to find logs directly by nodeId
    try {
      if (nodeExecutionId) {
        const fallbackLogs = await prisma.executionLog.findMany({
          where: {
            metadata: {
              path: ["node_id"],
              equals: nodeExecutionId,
            },
          },
          orderBy: {
            timestamp: "asc",
          },
        });

        if (fallbackLogs.length > 0) {
          const formattedFallbackLogs = fallbackLogs.map((log) => {
            let data = null;
            const nodeId = nodeExecutionId;

            try {
              if (log.metadata) {
                const metadata =
                  typeof log.metadata === "string"
                    ? JSON.parse(log.metadata)
                    : log.metadata;
                data = metadata;
              }
            } catch (error) {
              console.error("Error parsing fallback log metadata:", error);
            }

            return {
              id: log.id,
              node_execution_id: nodeExecutionId,
              level: log.level,
              message: log.message,
              created_at: log.timestamp.toISOString(),
              node_id: nodeId,
              data: data,
            };
          });

          return NextResponse.json(formattedFallbackLogs);
        }
      }
    } catch (fallbackError) {
      console.error("Fallback log retrieval failed:", fallbackError);
    }

    return NextResponse.json(
      { error: "Failed to fetch node logs" },
      { status: 500 }
    );
  }
}
