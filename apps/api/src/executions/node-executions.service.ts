import { Injectable, Inject, Logger } from "@nestjs/common";
import { NodeExecutionDto } from "./dto/execution.dto";
import { ExecutionRepository } from "../database/repositories/execution.repository";
import { NodeExecution, NodeInput, NodeOutput } from "@zzyra/database";

@Injectable()
export class NodeExecutionsService {
  private readonly logger = new Logger(NodeExecutionsService.name);

  constructor(
    @Inject("NODE_EXECUTIONS_REPOSITORY")
    private readonly executionRepository: ExecutionRepository
  ) {}

  async findByExecutionId(executionId: string): Promise<NodeExecutionDto[]> {
    try {
      this.logger.debug(
        `Fetching node executions for execution ${executionId}`
      );

      const nodeExecutions =
        await this.executionRepository.findNodeExecutions(executionId);

      this.logger.debug(
        `Found ${nodeExecutions.length} node executions for execution ${executionId}`
      );

      return nodeExecutions.map((nodeExec) =>
        this.mapToNodeExecutionDto(nodeExec)
      );
    } catch (error) {
      this.logger.error(
        `Failed to fetch node executions for execution ${executionId}:`,
        error
      );
      return [];
    }
  }

  async findById(id: string): Promise<NodeExecutionDto | undefined> {
    try {
      this.logger.debug(`Fetching node execution ${id}`);

      const nodeExecution =
        await this.executionRepository.findNodeExecution(id);

      if (!nodeExecution) {
        this.logger.debug(`Node execution ${id} not found`);
        return undefined;
      }

      return this.mapToNodeExecutionDto(nodeExecution);
    } catch (error) {
      this.logger.error(`Failed to fetch node execution ${id}:`, error);
      return undefined;
    }
  }

  private mapToNodeExecutionDto(
    nodeExec: NodeExecution & {
      nodeInputs?: NodeInput[];
      nodeOutputs?: NodeOutput[];
    }
  ): NodeExecutionDto {
    const inputData = this.extractInputData(nodeExec);
    const outputData = this.extractOutputData(nodeExec);

    return new NodeExecutionDto({
      id: nodeExec.id,
      execution_id: nodeExec.executionId,
      node_id: nodeExec.nodeId,
      status: this.validateStatus(nodeExec.status),
      started_at: nodeExec.startedAt?.toISOString() || undefined,
      completed_at: nodeExec.completedAt?.toISOString() || undefined,
      error: nodeExec.error || undefined,
      input_data: inputData,
      output_data: outputData,
    });
  }

  private extractInputData(
    nodeExec: NodeExecution & {
      nodeInputs?: NodeInput[];
    }
  ): Record<string, unknown> {
    if (!nodeExec.nodeInputs || nodeExec.nodeInputs.length === 0) {
      return {};
    }

    const firstInput = nodeExec.nodeInputs[0];
    if (!firstInput?.inputData) {
      return {};
    }

    try {
      return typeof firstInput.inputData === "object" &&
        firstInput.inputData !== null
        ? (firstInput.inputData as Record<string, unknown>)
        : {};
    } catch (error) {
      this.logger.warn(
        `Failed to parse input data for node execution ${nodeExec.id}:`,
        error
      );
      return {};
    }
  }

  private extractOutputData(nodeExec: NodeExecution): Record<string, unknown> {
    if (!nodeExec.outputData) {
      return {};
    }

    try {
      return typeof nodeExec.outputData === "object" &&
        nodeExec.outputData !== null
        ? (nodeExec.outputData as Record<string, unknown>)
        : {};
    } catch (error) {
      this.logger.warn(
        `Failed to parse output data for node execution ${nodeExec.id}:`,
        error
      );
      return {};
    }
  }

  private validateStatus(
    status: string
  ): "pending" | "running" | "completed" | "failed" | "paused" {
    const validStatuses = [
      "pending",
      "running",
      "completed",
      "failed",
      "paused",
    ] as const;

    if (validStatuses.includes(status as any)) {
      return status as
        | "pending"
        | "running"
        | "completed"
        | "failed"
        | "paused";
    }

    this.logger.warn(
      `Invalid status "${status}" for node execution, defaulting to "pending"`
    );
    return "pending";
  }
}
