import { Injectable } from "@nestjs/common";
import { NodeLogDto } from "./dto/execution.dto";

@Injectable()
export class NodeLogsService {
  // Generate realistic mock logs based on node execution ID
  private generateLogsForNodeExecution(nodeExecutionId: string): NodeLogDto[] {
    const logs: NodeLogDto[] = [];
    const baseTime = new Date();

    // Extract node info from ID pattern: node-exec-{executionId}-{nodeIndex}
    const nodeMatch = nodeExecutionId.match(/node-exec-(.+)-(\d+)/);
    if (!nodeMatch) {
      return [];
    }

    const [, executionId, nodeIndex] = nodeMatch;
    const nodeNum = parseInt(nodeIndex, 10);

    // Generate different log patterns based on node type and status
    const logMessages: Array<{
      level: "info" | "warn" | "error" | "debug";
      message: string;
    }> = [
      {
        level: "info",
        message: `Starting node execution for node-${nodeNum}`,
      },
      { level: "debug", message: "Initializing node parameters" },
      { level: "info", message: "Validating input data" },
      { level: "debug", message: "Processing workflow step" },
    ];

    // Add success or failure logs based on node index (simulate some failures)
    if (nodeNum === 2 && Math.random() < 0.3) {
      // Simulate occasional failures on node 2
      logMessages.push(
        {
          level: "warn",
          message: "Retrying operation due to timeout",
        },
        {
          level: "error",
          message: "Node execution failed due to timeout",
        }
      );
    } else if (nodeNum === 4 && Math.random() < 0.2) {
      // Simulate occasional failures on node 4
      logMessages.push(
        {
          level: "warn",
          message: "API rate limit detected, backing off",
        },
        { level: "error", message: "Maximum retry attempts exceeded" }
      );
    } else {
      // Success path
      logMessages.push(
        {
          level: "info",
          message: "Processing completed successfully",
        },
        {
          level: "debug",
          message: `Generated ${Math.floor(Math.random() * 100) + 1} output records`,
        },
        { level: "info", message: "Node execution completed" }
      );
    }

    // Generate logs with realistic timestamps
    logMessages.forEach((logData, index) => {
      const logTime = new Date(
        baseTime.getTime() + index * 500 + Math.random() * 200
      );

      logs.push({
        id: `log-${nodeExecutionId}-${index + 1}`,
        node_execution_id: nodeExecutionId,
        message: logData.message,
        level: logData.level,
        created_at: logTime.toISOString(),
      });
    });

    return logs;
  }

  async findByNodeExecutionId(nodeExecutionId: string): Promise<NodeLogDto[]> {
    // Generate consistent mock data based on node execution ID
    return this.generateLogsForNodeExecution(nodeExecutionId);
  }
}
