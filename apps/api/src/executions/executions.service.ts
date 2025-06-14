import { Injectable, NotFoundException } from "@nestjs/common";
import { ExecutionRepository } from "@zyra/database";
import { CreateExecutionDto, UpdateExecutionDto } from "./dto/execution.dto";

@Injectable()
export class ExecutionsService {
  constructor(private readonly executionRepository: ExecutionRepository) {}

  async findAll(userId?: string, limit = 10): Promise<any[]> {
    if (userId) {
      return this.executionRepository.findByUserId(userId, limit);
    }
    // For admin or system access, get all executions
    return this.executionRepository.findMany({ take: limit });
  }

  async findOne(id: string, userId?: string) {
    const execution = await this.executionRepository.findWithNodesAndLogs(id);

    if (!execution) {
      throw new NotFoundException(`Execution with ID ${id} not found`);
    }

    // Check access permissions
    if (userId && execution.userId !== userId) {
      throw new NotFoundException(`Execution with ID ${id} not found`);
    }

    return execution;
  }

  async create(createExecutionDto: CreateExecutionDto, userId: string): Promise<any> {
    return this.executionRepository.createExecution(
      createExecutionDto.workflowId,
      userId,
      createExecutionDto.input,
      createExecutionDto.triggerType
    );
  }

  async update(
    id: string,
    updateExecutionDto: UpdateExecutionDto,
    userId?: string
  ): Promise<any> {
    // Verify execution exists and user has access
    const execution = await this.findOne(id, userId);

    if (updateExecutionDto.status) {
      return this.executionRepository.updateStatus(
        id,
        updateExecutionDto.status as any,
        updateExecutionDto.error
      );
    }

    // Convert the string status to the expected enum type
    const updateData = {
      ...updateExecutionDto,
      status: updateExecutionDto.status as any // Type assertion to handle the enum conversion
    };
    return this.executionRepository.update(id, updateData);
  }

  async cancel(id: string, userId?: string): Promise<any> {
    await this.findOne(id, userId); // Verify access
    return this.executionRepository.updateStatus(id, "cancelled" as any);
  }

  async pause(id: string, userId?: string): Promise<any> {
    await this.findOne(id, userId); // Verify access
    return this.executionRepository.updateStatus(id, "paused" as any);
  }

  async resume(id: string, userId?: string): Promise<any> {
    await this.findOne(id, userId); // Verify access
    return this.executionRepository.updateStatus(id, "running" as any);
  }

  async retry(id: string, userId?: string): Promise<any> {
    await this.findOne(id, userId); // Verify access
    return this.executionRepository.updateStatus(id, "pending" as any);
  }

  async getStats(userId?: string) {
    // Get recent executions for stats
    const executions = userId
      ? await this.executionRepository.findByUserId(userId, 100)
      : await this.executionRepository.findMany({ take: 100 });

    const total = executions.length;
    const completed = executions.filter((e) => e.status === "completed").length;
    const failed = executions.filter((e) => e.status === "failed").length;
    const running = executions.filter((e) => e.status === "running").length;
    const pending = executions.filter((e) => e.status === "pending").length;

    return {
      total,
      completed,
      failed,
      running,
      pending,
      success_rate: total > 0 ? (completed / total) * 100 : 0,
    };
  }

  async getTrends(userId?: string, days = 7) {
    // Stub implementation - would calculate trends over time
    const executions = userId
      ? await this.executionRepository.findByUserId(userId, 100)
      : await this.executionRepository.findMany({ take: 100 });

    // Group by day and calculate trends
    const trends = Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);

      return {
        date: date.toISOString().split("T")[0],
        executions: Math.floor(Math.random() * 10), // Mock data
        success_rate: Math.floor(Math.random() * 100),
      };
    }).reverse();

    return { trends };
  }

  async getHeatmap(userId?: string) {
    // Stub implementation - would generate execution heatmap
    return {
      heatmap: Array.from({ length: 24 }, (_, hour) => ({
        hour,
        executions: Math.floor(Math.random() * 20),
      })),
    };
  }
}
