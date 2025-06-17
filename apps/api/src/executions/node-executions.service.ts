import { Injectable, Inject } from "@nestjs/common";
import { NodeExecutionDto } from "./dto/execution.dto";
import { ExecutionRepository } from "../database/repositories/execution.repository";

@Injectable()
export class NodeExecutionsService {
  constructor(
    @Inject("NODE_EXECUTIONS_REPOSITORY")
    private readonly executionRepository: ExecutionRepository
  ) {}

  async findByExecutionId(executionId: string): Promise<NodeExecutionDto[]> {
    try {
      // Get node executions from database
      const nodeExecutions =
        await this.executionRepository.findNodeExecutions(executionId);

      // Transform database records to DTOs
      return nodeExecutions.map(
        (nodeExec) =>
          new NodeExecutionDto({
            id: nodeExec.id,
            execution_id: nodeExec.executionId,
            node_id: nodeExec.nodeId,
            status: nodeExec.status as
              | "pending"
              | "running"
              | "completed"
              | "failed"
              | "paused",
            started_at: nodeExec.startedAt?.toISOString() || undefined,
            completed_at: nodeExec.completedAt?.toISOString() || undefined,
            error: nodeExec.error || undefined,
            input_data:
              ((nodeExec as any).nodeInputs?.[0]?.inputData as Record<
                string,
                unknown
              >) || {},
            output_data: (nodeExec.outputData as Record<string, unknown>) || {},
          })
      );
    } catch (error) {
      console.error(
        `Failed to fetch node executions for execution ${executionId}:`,
        error
      );
      // Return empty array instead of throwing to prevent breaking the UI
      return [];
    }
  }

  async findById(id: string): Promise<NodeExecutionDto | undefined> {
    try {
      // Get single node execution from database
      const nodeExecution =
        await this.executionRepository.findNodeExecution(id);

      if (!nodeExecution) {
        return undefined;
      }

      return new NodeExecutionDto({
        id: nodeExecution.id,
        execution_id: nodeExecution.executionId,
        node_id: nodeExecution.nodeId,
        status: nodeExecution.status as
          | "pending"
          | "running"
          | "completed"
          | "failed"
          | "paused",
        started_at: nodeExecution.startedAt?.toISOString() || undefined,
        completed_at: nodeExecution.completedAt?.toISOString() || undefined,
        error: nodeExecution.error || undefined,
        input_data:
          ((nodeExecution as any).nodeInputs?.[0]?.inputData as Record<
            string,
            unknown
          >) || {},
        output_data:
          (nodeExecution.outputData as Record<string, unknown>) || {},
      });
    } catch (error) {
      console.error(`Failed to fetch node execution ${id}:`, error);
      return undefined;
    }
  }
}
