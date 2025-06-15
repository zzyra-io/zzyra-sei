import { Injectable } from "@nestjs/common";
import { NodeExecutionDto } from "./dto/execution.dto";
import { BlockType } from "@zyra/types";

@Injectable()
export class NodeExecutionsService {
  // Generate realistic mock node executions based on execution ID
  private generateNodeExecutionsForExecution(
    executionId: string
  ): NodeExecutionDto[] {
    const baseTime = new Date();
    const nodeTypes = Object.values(BlockType);
    const statuses = ["completed", "failed", "running", "paused"] as const;

    // Generate 3-6 nodes per execution
    const nodeCount = Math.floor(Math.random() * 4) + 3;
    const nodes: NodeExecutionDto[] = [];

    for (let i = 0; i < nodeCount; i++) {
      const nodeStartTime = new Date(
        baseTime.getTime() + i * 2000 + Math.random() * 1000
      );
      const isCompleted = i < nodeCount - 1 || Math.random() > 0.3;
      const isFailed = isCompleted && Math.random() < 0.1;
      const isPaused = !isCompleted && !isFailed && Math.random() < 0.2;
      const isRunning = !isCompleted && !isFailed && !isPaused;

      let status: (typeof statuses)[number];
      let completedAt: string | undefined;
      let error: string | undefined;

      if (isFailed) {
        status = "failed";
        completedAt = new Date(
          nodeStartTime.getTime() + Math.random() * 5000 + 1000
        ).toISOString();
        error = "Node execution failed due to timeout";
      } else if (isPaused) {
        status = "paused";
      } else if (isRunning) {
        status = "running";
      } else {
        status = "completed";
        completedAt = new Date(
          nodeStartTime.getTime() + Math.random() * 5000 + 1000
        ).toISOString();
      }

      nodes.push({
        id: `node-exec-${executionId}-${i + 1}`,
        execution_id: executionId,
        node_id: `node-${i + 1}`,
        status,
        started_at: nodeStartTime.toISOString(),
        completed_at: completedAt,
        input_data: {
          parameters: {
            url: "https://api.example.com/data",
            method: "GET",
            timeout: 30000,
            nodeType: nodeTypes[i % nodeTypes.length], // Store node type in input_data
          },
          data: {
            userId: 12345,
            action: "process",
          },
        },
        output_data:
          status === "completed"
            ? {
                result: "success",
                data: {
                  processedItems: Math.floor(Math.random() * 100) + 1,
                  duration: Math.floor(Math.random() * 5000) + 500,
                },
              }
            : undefined,
        error,
      });
    }

    return nodes;
  }

  async findByExecutionId(executionId: string): Promise<NodeExecutionDto[]> {
    // Generate consistent mock data based on execution ID
    return this.generateNodeExecutionsForExecution(executionId);
  }

  async findById(id: string): Promise<NodeExecutionDto | undefined> {
    // Extract execution ID from node execution ID
    const executionIdMatch = id.match(/node-exec-(.+)-\d+/);
    if (!executionIdMatch) {
      return undefined;
    }

    const executionId = executionIdMatch[1];
    const nodes = this.generateNodeExecutionsForExecution(executionId);
    return nodes.find((node) => node.id === id);
  }
}
