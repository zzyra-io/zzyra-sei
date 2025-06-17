import { Injectable, Inject } from "@nestjs/common";
import { NodeLogDto } from "./dto/execution.dto";
import { ExecutionRepository } from "../database/repositories/execution.repository";

@Injectable()
export class NodeLogsService {
  constructor(
    @Inject("NODE_EXECUTIONS_REPOSITORY")
    private readonly executionRepository: ExecutionRepository
  ) {}

  async findByNodeExecutionId(nodeExecutionId: string): Promise<NodeLogDto[]> {
    try {
      // Get node logs from database
      const nodeLogs =
        await this.executionRepository.findNodeLogs(nodeExecutionId);

      // Transform database records to DTOs
      return nodeLogs.map(
        (log) =>
          new NodeLogDto({
            id: log.id,
            node_execution_id: log.nodeExecutionId,
            message: log.message,
            level: log.level,
            created_at: log.createdAt.toISOString(),
          })
      );
    } catch (error) {
      console.error(
        `Failed to fetch node logs for node execution ${nodeExecutionId}:`,
        error
      );
      // Return empty array instead of throwing to prevent breaking the UI
      return [];
    }
  }
}
