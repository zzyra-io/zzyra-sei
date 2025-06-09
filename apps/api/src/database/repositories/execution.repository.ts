import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { NodeExecution, NodeLog, WorkflowExecution, WorkflowStatus } from '@prisma/client';

@Injectable()
export class ExecutionRepository {
  constructor(private prisma: PrismaService) {}

  async findExecutions(
    params: {
      workflowId?: string;
      userId?: string;
      page?: number;
      limit?: number;
      sortKey?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ): Promise<{ data: WorkflowExecution[]; total: number; page: number; limit: number }> {
    const { 
      workflowId, 
      userId, 
      page = 1, 
      limit = 10, 
      sortKey = 'startedAt', 
      sortOrder = 'desc' 
    } = params;
    
    const skip = (page - 1) * limit;
    const where = {
      ...(workflowId && { workflowId }),
      ...(userId && { userId }),
    };
    
    const [executions, total] = await Promise.all([
      this.prisma.client.workflowExecution.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortKey]: sortOrder },
        include: {
          workflow: {
            select: {
              name: true,
            },
          },
        },
      }),
      this.prisma.client.workflowExecution.count({ where }),
    ]);

    return {
      data: executions,
      total,
      page,
      limit,
    };
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
      orderBy: { startedAt: 'asc' },
    });
  }

  async findNodeLogs(nodeExecutionId: string): Promise<NodeLog[]> {
    return this.prisma.client.nodeLog.findMany({
      where: { nodeExecutionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateExecutionStatus(
    id: string, 
    status: WorkflowStatus, 
    error?: string
  ): Promise<WorkflowExecution> {
    const data: any = { status };
    
    if (status === 'completed' || status === 'failed') {
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
        status: data.status || 'pending',
        startedAt: new Date(),
      },
    });
  }
}
