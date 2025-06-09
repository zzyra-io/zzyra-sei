import { Injectable, NotFoundException } from "@nestjs/common";
import {
  CreateWorkflowDto,
  PaginatedWorkflowsResponseDto,
  UpdateWorkflowDto,
  WorkflowDto,
} from "./dto/workflow.dto";
import { WorkflowRepository } from "@zyra/database";

@Injectable()
export class WorkflowsService {
  constructor(private workflowRepository: WorkflowRepository) {}

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

  async findOne(id: string): Promise<WorkflowDto> {
    const workflow = await this.workflowRepository.findById(id);
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
      nodes: createWorkflowDto.nodes,
      edges: createWorkflowDto.edges,
      userId,
    });

    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      nodes: workflow.nodes as Record<string, unknown>[],
      edges: workflow.edges as Record<string, unknown>[],
      userId: workflow.userId,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
    };
  }

  async update(
    id: string,
    updateWorkflowDto: UpdateWorkflowDto
  ): Promise<WorkflowDto> {
    const workflow = await this.workflowRepository.update(id, {
      name: updateWorkflowDto.name,
      description: updateWorkflowDto.description,
      nodes: updateWorkflowDto.nodes,
      edges: updateWorkflowDto.edges,
    });

    return {
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      nodes: workflow.nodes as Record<string, unknown>[],
      edges: workflow.edges as Record<string, unknown>[],
      userId: workflow.userId,
      createdAt: workflow.createdAt,
      updatedAt: workflow.updatedAt,
    };
  }

  async remove(id: string): Promise<void> {
    await this.workflowRepository.delete(id);
  }
}
