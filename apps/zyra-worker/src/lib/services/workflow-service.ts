import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../services/database.service';
import type { WorkflowStatus } from '@zyra/database';

export interface Workflow {
  id: string;
  user_id: string;
  name: string;
  description: string;
  nodes: any[];
  edges: any[];
  is_public: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

// Utility: detect cycles in workflow graph
function detectCycle(nodes: any[], edges: any[]): boolean {
  const adj: Record<string, string[]> = {};
  nodes.forEach((n) => {
    adj[n.id] = [];
  });
  edges.forEach((e) => {
    const src = (e as any).source ?? (e as any).sourceNodeId;
    const tgt = (e as any).target ?? (e as any).targetNodeId;
    if (src && tgt && adj[src]) adj[src].push(tgt);
  });
  const visited: Record<string, boolean> = {};
  const recStack: Record<string, boolean> = {};
  function dfs(u: string): boolean {
    if (!visited[u]) {
      visited[u] = true;
      recStack[u] = true;
      for (const v of adj[u] || []) {
        if (!visited[v] && dfs(v)) return true;
        else if (recStack[v]) return true;
      }
    }
    recStack[u] = false;
    return false;
  }
  return nodes.some((n) => dfs(n.id));
}

@Injectable()
export class WorkflowService {
  private readonly logger = new Logger(WorkflowService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Get all workflows for the system (admin operation)
   */
  async getWorkflows(): Promise<any[]> {
    try {
      // Use direct Prisma client for complex queries with includes
      const workflows = await this.databaseService.prisma.workflow.findMany({
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
      });
      return workflows.map((wf) => ({
        ...wf,
        user_id: wf.userId, // Map to legacy field name
        is_public: wf.isPublic,
        created_at: wf.createdAt?.toISOString(),
        updated_at: wf.updatedAt?.toISOString(),
        nodes: wf.nodes as any as any[],
        edges: wf.edges as any as any[],
      }));
    } catch (error) {
      this.logger.error('Error fetching workflows:', error);
      throw error;
    }
  }

  /**
   * Get workflow by ID with full details
   */
  async getWorkflow(id: string): Promise<any | null> {
    try {
      const workflow = await this.databaseService.prisma.workflow.findUnique({
        where: { id },
        include: {
          user: {
            include: {
              profile: true,
            },
          },
        },
      });

      if (!workflow) return null;

      return {
        ...workflow,
        user_id: workflow.userId,
        is_public: workflow.isPublic,
        created_at: workflow.createdAt?.toISOString(),
        updated_at: workflow.updatedAt?.toISOString(),
        nodes: workflow.nodes as any as any[],
        edges: workflow.edges as any as any[],
      };
    } catch (error) {
      this.logger.error('Error fetching workflow:', error);
      throw error;
    }
  }

  /**
   * Get workflow execution by ID
   */
  async getWorkflowExecution(id: string): Promise<any | null> {
    try {
      const execution =
        await this.databaseService.executions.findWithNodesAndLogs(id);
      return execution;
    } catch (error) {
      this.logger.error('Error fetching workflow execution:', error);
      throw error;
    }
  }

  /**
   * Update workflow execution status
   */
  async updateExecutionStatus(
    id: string,
    status: WorkflowStatus,
    output?: any,
    error?: string,
  ): Promise<void> {
    try {
      await this.databaseService.updateExecutionStatusWithLogging(
        id,
        status,
        output,
        error,
      );
    } catch (err) {
      this.logger.error('Error updating execution status:', err);
      throw err;
    }
  }

  /**
   * Create a new workflow execution
   */
  async createExecution(data: {
    workflowId: string;
    userId: string;
    input?: any;
    triggerType?: string;
    triggerData?: any;
  }): Promise<any> {
    try {
      const execution = await this.databaseService.executions.createExecution(
        data.workflowId,
        data.userId,
        data.input,
        data.triggerType,
      );
      return execution;
    } catch (error) {
      this.logger.error('Error creating workflow execution:', error);
      throw error;
    }
  }

  /**
   * Delete workflow
   */
  async deleteWorkflow(id: string): Promise<void> {
    try {
      await this.databaseService.workflows.delete(id);
    } catch (error) {
      this.logger.error('Error deleting workflow:', error);
      throw error;
    }
  }
}
