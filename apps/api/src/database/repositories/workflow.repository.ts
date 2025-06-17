import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { Workflow } from "@zyra/database";

@Injectable()
export class WorkflowRepository {
  constructor(private prisma: PrismaService) {}

  async findAll(
    userId: string,
    page = 1,
    limit = 10
  ): Promise<{ data: Workflow[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const [workflows, total] = await Promise.all([
      this.prisma.client.workflow.findMany({
        where: { userId },
        skip,
        take: limit,
        include: {
          _count: {
            select: {
              executions: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      }),
      this.prisma.client.workflow.count({
        where: { userId },
      }),
    ]);

    return {
      data: workflows,
      total,
      page,
      limit,
    };
  }

  async findById(id: string): Promise<Workflow | null> {
    return this.prisma.client.workflow.findUnique({
      where: { id },
    });
  }

  async findByUserId(userId: string): Promise<Workflow[]> {
    return this.prisma.client.workflow.findMany({
      where: { userId },
      include: {
        _count: {
          select: {
            executions: true,
          },
        },
      },
    });
  }

  async create(data: {
    name: string;
    description?: string;
    nodes: Record<string, unknown>[];
    edges: Record<string, unknown>[];
    userId: string;
  }): Promise<Workflow> {
    return this.prisma.client.workflow.create({
      data: {
        name: data.name,
        description: data.description,
        nodes: data.nodes as any,
        edges: data.edges as any,
        userId: data.userId,
      },
    });
  }

  async update(
    id: string,
    data: Partial<{
      name: string;
      description: string;
      nodes: Record<string, unknown>[];
      edges: Record<string, unknown>[];
    }>
  ): Promise<Workflow> {
    return this.prisma.client.workflow.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.description && { description: data.description }),
        ...(data.nodes && { nodes: data.nodes as any }),
        ...(data.edges && { edges: data.edges as any }),
        updatedAt: new Date(),
      },
    });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.client.workflow.delete({
      where: { id },
    });
  }
}
