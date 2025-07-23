import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import {
  NodeExecution,
  NodeLog,
  WorkflowExecution,
  WorkflowStatus,
} from "@zyra/database";

@Injectable()
export class ExecutionRepository {
  constructor(private prisma: PrismaService) {}

  async findExecutions(params: {
    workflowId?: string;
    userId?: string;
    page?: number;
    limit?: number;
    sortKey?: string;
    sortOrder?: "asc" | "desc";
  }): Promise<{
    data: WorkflowExecution[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      workflowId,
      userId,
      page = 1,
      limit = 10,
      sortKey = "startedAt",
      sortOrder = "desc",
    } = params;

    const skip = (page - 1) * limit;

    const where: any = {};
    if (workflowId) where.workflowId = workflowId;
    if (userId) where.userId = userId;

    const [data, total] = await Promise.all([
      this.prisma.client.workflowExecution.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortKey]: sortOrder },
      }),
      this.prisma.client.workflowExecution.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findExecutionById(id: string): Promise<WorkflowExecution | null> {
    return this.prisma.client.workflowExecution.findUnique({
      where: { id },
      include: {
        workflow: {
          select: {
            name: true,
            nodes: true,
            edges: true,
          },
        },
      },
    });
  }

  async findNodeExecutions(executionId: string): Promise<NodeExecution[]> {
    return this.prisma.client.nodeExecution.findMany({
      where: { executionId },
      include: {
        nodeInputs: true,
        nodeOutputs: true,
        logs: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { startedAt: "asc" },
    });
  }

  async findNodeExecution(id: string): Promise<NodeExecution | null> {
    return this.prisma.client.nodeExecution.findUnique({
      where: { id },
      include: {
        nodeInputs: true,
        nodeOutputs: true,
      },
    });
  }

  async findNodeLogs(nodeExecutionId: string): Promise<NodeLog[]> {
    return this.prisma.client.nodeLog.findMany({
      where: { nodeExecutionId },
      orderBy: { createdAt: "asc" },
    });
  }

  async findNodeLogsByExecutionAndNode(
    executionId: string,
    nodeId: string
  ): Promise<NodeLog[]> {
    return this.prisma.client.nodeLog.findMany({
      where: {
        nodeExecution: {
          executionId,
          nodeId,
        },
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async updateExecutionStatus(
    id: string,
    status: WorkflowStatus,
    error?: string
  ): Promise<WorkflowExecution> {
    const data: any = { status };

    if (status === "completed" || status === "failed") {
      data.finishedAt = new Date();
    }

    if (error) {
      data.error = error;
    }

    return this.prisma.client.workflowExecution.update({
      where: { id },
      data,
    });
  }

  async createExecution(data: {
    workflowId: string;
    userId: string;
    status?: WorkflowStatus;
  }): Promise<WorkflowExecution> {
    return this.prisma.client.workflowExecution.create({
      data: {
        workflowId: data.workflowId,
        userId: data.userId,
        status: data.status || "pending",
        startedAt: new Date(),
      },
    });
  }

  async findByUserId(userId: string, limit = 10): Promise<WorkflowExecution[]> {
    return this.prisma.client.workflowExecution.findMany({
      where: { userId },
      take: limit,
      orderBy: { createdAt: "desc" },
    });
  }

  async findMany(params: { take?: number }): Promise<WorkflowExecution[]> {
    return this.prisma.client.workflowExecution.findMany({
      take: params.take || 10,
      orderBy: { createdAt: "desc" },
    });
  }

  async findWithNodesAndLogs(id: string): Promise<WorkflowExecution | null> {
    return this.prisma.client.workflowExecution.findUnique({
      where: { id },
      include: {
        nodeExecutions: {
          include: {
            logs: true,
            nodeInputs: true,
            nodeOutputs: true,
          },
        },
        executionLogs: {
          orderBy: { timestamp: "asc" },
        },
        workflow: {
          select: {
            name: true,
            nodes: true,
            edges: true,
          },
        },
      },
    });
  }

  async update(id: string, data: any): Promise<WorkflowExecution> {
    return this.prisma.client.workflowExecution.update({
      where: { id },
      data,
    });
  }

  async updateStatus(
    id: string,
    status: WorkflowStatus,
    error?: string
  ): Promise<WorkflowExecution> {
    return this.updateExecutionStatus(id, status, error);
  }
}
