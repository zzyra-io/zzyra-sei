import api from "@/lib/services/api";

export interface ExecutionResult {
  id: string;
  workflowId: string;
  status:
    | "pending"
    | "running"
    | "completed"
    | "failed"
    | "cancelled"
    | "paused";
  startedAt?: string;
  finishedAt?: string;
  error?: string;
  result?: any;
  progress?: number;
  currentNodeId?: string;
  nodesCompleted?: string[];
  nodesFailed?: string[];
  nodesPending?: string[];
  logs?: Array<{
    id: string;
    level: "info" | "error" | "warn" | "debug";
    message: string;
    timestamp: string;
    nodeId?: string;
  }>;
}

export interface ExecutionStats {
  total: number;
  completed: number;
  failed: number;
  running: number;
  pending: number;
  success_rate: number;
}

export interface ExecutionTrends {
  trends: Array<{
    date: string;
    executions: number;
    success_rate: number;
  }>;
}

export interface ExecutionHeatmap {
  heatmap: Array<{
    hour: number;
    executions: number;
  }>;
}

class ExecutionService {
  async getExecution(executionId: string): Promise<ExecutionResult> {
    try {
      const response = await api.get(`/executions/${executionId}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching execution:", error);
      throw new Error("Failed to fetch execution details");
    }
  }

  async getExecutions(params?: {
    workflowId?: string;
    limit?: number;
    offset?: number;
    status?: string;
    sortKey?: string;
    sortOrder?: "asc" | "desc";
  }): Promise<{ executions: ExecutionResult[]; total: number }> {
    try {
      const searchParams = new URLSearchParams();

      if (params?.workflowId)
        searchParams.append("workflowId", params.workflowId);
      if (params?.limit) searchParams.append("limit", params.limit.toString());
      if (params?.offset)
        searchParams.append("offset", params.offset.toString());
      if (params?.status) searchParams.append("status", params.status);
      if (params?.sortKey) searchParams.append("sortKey", params.sortKey);
      if (params?.sortOrder) searchParams.append("sortOrder", params.sortOrder);

      const response = await api.get(`/executions?${searchParams.toString()}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching executions:", error);
      throw new Error("Failed to fetch executions");
    }
  }

  async retryExecution(
    executionId: string,
    nodeId?: string
  ): Promise<ExecutionResult> {
    try {
      const response = await api.post(`/executions/${executionId}/retry`, {
        nodeId,
      });
      return response.data;
    } catch (error) {
      console.error("Error retrying execution:", error);
      throw new Error("Failed to retry execution");
    }
  }

  async cancelExecution(
    executionId: string,
    nodeId?: string
  ): Promise<ExecutionResult> {
    try {
      const response = await api.post(`/executions/${executionId}/cancel`, {
        nodeId,
      });
      return response.data;
    } catch (error) {
      console.error("Error cancelling execution:", error);
      throw new Error("Failed to cancel execution");
    }
  }

  async pauseExecution(
    executionId: string,
    nodeId?: string
  ): Promise<ExecutionResult> {
    try {
      const response = await api.post(`/executions/${executionId}/pause`, {
        nodeId,
      });
      return response.data;
    } catch (error) {
      console.error("Error pausing execution:", error);
      throw new Error("Failed to pause execution");
    }
  }

  async resumeExecution(
    executionId: string,
    nodeId?: string
  ): Promise<ExecutionResult> {
    try {
      const response = await api.post(`/executions/${executionId}/resume`, {
        nodeId,
      });
      return response.data;
    } catch (error) {
      console.error("Error resuming execution:", error);
      throw new Error("Failed to resume execution");
    }
  }

  async getExecutionStats(): Promise<ExecutionStats> {
    try {
      const response = await api.get("/executions/stats");
      return response.data;
    } catch (error) {
      console.error("Error fetching execution stats:", error);
      throw new Error("Failed to fetch execution statistics");
    }
  }

  async getExecutionTrends(days = 7): Promise<ExecutionTrends> {
    try {
      const response = await api.get(`/executions/trends?days=${days}`);
      return response.data;
    } catch (error) {
      console.error("Error fetching execution trends:", error);
      throw new Error("Failed to fetch execution trends");
    }
  }

  async getExecutionHeatmap(): Promise<ExecutionHeatmap> {
    try {
      const response = await api.get("/executions/heatmap");
      return response.data;
    } catch (error) {
      console.error("Error fetching execution heatmap:", error);
      throw new Error("Failed to fetch execution heatmap");
    }
  }

  async getNodeExecutions(executionId: string): Promise<any[]> {
    try {
      const response = await api.get(
        `/executions/nodes?executionId=${executionId}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching node executions:", error);
      throw new Error("Failed to fetch node executions");
    }
  }

  async getNodeLogs(nodeExecutionId: string): Promise<any[]> {
    try {
      const response = await api.get(
        `/executions/node-logs?nodeExecutionId=${nodeExecutionId}`
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching node logs:", error);
      throw new Error("Failed to fetch node logs");
    }
  }
}

export const executionService = new ExecutionService();
