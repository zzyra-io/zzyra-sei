import { Injectable, Inject, Logger } from "@nestjs/common";
import { NodeLogDto } from "./dto/execution.dto";
import { ExecutionRepository } from "../database/repositories/execution.repository";
import { NodeLog } from "@zzyra/database";

@Injectable()
export class NodeLogsService {
  private readonly logger = new Logger(NodeLogsService.name);

  constructor(
    @Inject("NODE_EXECUTIONS_REPOSITORY")
    private readonly executionRepository: ExecutionRepository
  ) {}

  async findByNodeExecutionId(nodeExecutionId: string): Promise<NodeLogDto[]> {
    try {
      this.logger.debug(
        `Fetching node logs for node execution ${nodeExecutionId}`
      );

      const nodeLogs =
        await this.executionRepository.findNodeLogs(nodeExecutionId);

      this.logger.debug(
        `Found ${nodeLogs.length} logs for node execution ${nodeExecutionId}`
      );

      return nodeLogs.map((log) => this.mapToNodeLogDto(log));
    } catch (error) {
      this.logger.error(
        `Failed to fetch node logs for node execution ${nodeExecutionId}:`,
        error
      );
      return [];
    }
  }

  async findByExecutionAndNode(
    executionId: string,
    nodeId: string
  ): Promise<NodeLogDto[]> {
    try {
      this.logger.debug(
        `Fetching node logs for execution ${executionId} and node ${nodeId}`
      );

      const nodeLogs =
        await this.executionRepository.findNodeLogsByExecutionAndNode(
          executionId,
          nodeId
        );

      this.logger.debug(
        `Found ${nodeLogs.length} logs for execution ${executionId} and node ${nodeId}`
      );

      return nodeLogs.map((log) => this.mapToNodeLogDto(log));
    } catch (error) {
      this.logger.error(
        `Failed to fetch node logs for execution ${executionId} and node ${nodeId}:`,
        error
      );
      return [];
    }
  }

  private mapToNodeLogDto(log: NodeLog): NodeLogDto {
    return new NodeLogDto({
      id: log.id,
      node_execution_id: log.nodeExecutionId,
      message: log.message,
      level: this.validateLogLevel(log.level),
      created_at: log.createdAt.toISOString(),
    });
  }

  private validateLogLevel(level: string): "info" | "warn" | "error" | "debug" {
    const validLevels = ["info", "warn", "error", "debug"] as const;

    if (validLevels.includes(level as any)) {
      return level as "info" | "warn" | "error" | "debug";
    }

    this.logger.warn(`Invalid log level "${level}", defaulting to "info"`);
    return "info";
  }
}
