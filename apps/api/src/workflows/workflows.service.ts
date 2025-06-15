import { Injectable, NotFoundException } from "@nestjs/common";
import {
  CreateWorkflowDto,
  PaginatedWorkflowsResponseDto,
  UpdateWorkflowDto,
  WorkflowDto,
} from "./dto/workflow.dto";
import { QueueService } from "../queue/queue.service";
import { WorkflowRepository, ExecutionRepository } from "@zyra/database";

@Injectable()
export class WorkflowsService {
  constructor(
    private workflowRepository: WorkflowRepository,
    private executionRepository: ExecutionRepository,
    private queueService: QueueService
  ) {}

  async findAll(
    userId: string,
    page = 1,
    limit = 10
  ): Promise<PaginatedWorkflowsResponseDto> {
    const workflows = await this.workflowRepository.findByUserId(userId, true);

    // Map Prisma model to DTO
    const data = workflows.map((workflow) => ({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description || undefined,
      nodes: workflow.nodes as Record<string, unknown>[],
      edges: workflow.edges as Record<string, unknown>[],
      userId: workflow.userId,
      createdAt: workflow.createdAt || new Date(),
      updatedAt: workflow.updatedAt || new Date(),
    }));

    // Simple pagination simulation
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = data.slice(startIndex, endIndex);

    return {
      data: paginatedData,
      total: data.length,
      page,
      limit,
    };
  }

  async findOne(id: string, userId: string): Promise<WorkflowDto> {
    const workflow = await this.workflowRepository.findById(id, userId);
    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }

    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description || undefined,
      nodes: workflow.nodes as Record<string, unknown>[],
      edges: workflow.edges as Record<string, unknown>[],
      userId: workflow.userId,
    };
  }

  async create(
    createWorkflowDto: CreateWorkflowDto,
    userId: string
  ): Promise<WorkflowDto> {
    const workflow = await this.workflowRepository.create({
      name: createWorkflowDto.name,
      description: createWorkflowDto.description,
      nodes: createWorkflowDto.nodes as any, // Type assertion for JSON compatibility
      edges: createWorkflowDto.edges as any, // Type assertion for JSON compatibility
      user: { connect: { id: userId } }, // Connect to user by ID instead of using userId directly
    });

    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description || undefined,
      nodes: workflow.nodes as Record<string, unknown>[],
      edges: workflow.edges as Record<string, unknown>[],
      userId: workflow.userId,
    };
  }

  async update(
    id: string,
    updateWorkflowDto: UpdateWorkflowDto,
    userId: string
  ): Promise<WorkflowDto> {
    // First verify the user owns this workflow
    const existingWorkflow = await this.workflowRepository.findById(id, userId);
    if (!existingWorkflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }

    const workflow = await this.workflowRepository.update(id, {
      name: updateWorkflowDto.name,
      description: updateWorkflowDto.description,
      nodes: updateWorkflowDto.nodes as any, // Type assertion for JSON compatibility
      edges: updateWorkflowDto.edges as any, // Type assertion for JSON compatibility
    });

    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description || undefined,
      nodes: workflow.nodes as Record<string, unknown>[],
      edges: workflow.edges as Record<string, unknown>[],
      userId: workflow.userId,
    };
  }

  async remove(id: string, userId: string): Promise<void> {
    // First verify the user owns this workflow
    const existingWorkflow = await this.workflowRepository.findById(id, userId);
    if (!existingWorkflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }

    await this.workflowRepository.delete(id);
  }

  async execute(id: string, userId: string): Promise<{ executionId: string }> {
    // First verify the user owns this workflow
    const workflow = await this.workflowRepository.findById(id, userId);
    if (!workflow) {
      throw new NotFoundException(`Workflow with ID ${id} not found`);
    }

    // Create workflow execution using the execution repository
    const execution = await this.executionRepository.createExecution(
      id,
      userId,
      {}, // No input data for now
      "manual" // Trigger type
    );

    if (!execution) {
      throw new Error("Failed to create workflow execution");
    }

    const executionId = execution.id;

    console.log(
      `Created execution ${executionId} for workflow ${id} by user ${userId}`
    );

    // Queue the execution job
    try {
      await this.queueService.addExecutionJob(executionId, id, userId);
      console.log(`Successfully queued execution ${executionId}`);
    } catch (error) {
      console.error(`Failed to queue execution ${executionId}:`, error);
      // Update execution status to failed
      await this.executionRepository.updateStatus(
        executionId,
        "failed" as any,
        "Failed to queue execution"
      );
      throw new Error("Failed to queue workflow execution");
    }

    return { executionId };
  }
}
