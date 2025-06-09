/**
 * API service for communicating with the backend
 */
import axios from 'axios';

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
  triggeredBy: string;
  error?: string;
}

export interface NodeExecution {
  node_id: string;
  node_type: string;
  config: any;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  output_data: any;
  error: string | null;
  logs: any[];
}

export interface NodeLog {
  timestamp: string;
  level: string;
  message: string;
  metadata?: any;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const executionsApi = {
  /**
   * Get workflow executions
   */
  async getWorkflowExecutions(
    workflowId: string,
    limit = 10,
    offset = 0,
    status = 'all',
    sortKey = 'started_at',
    sortOrder = 'desc'
  ): Promise<PaginatedResponse<WorkflowExecution>> {
    const params = new URLSearchParams({
      workflowId,
      limit: limit.toString(),
      offset: offset.toString(),
      status,
      sortKey,
      sortOrder,
    });

    const response = await api.get(`/executions?${params.toString()}`);
    return response.data;
  },

  /**
   * Get node executions for a workflow execution
   */
  async getNodeExecutions(executionId: string): Promise<NodeExecution[]> {
    const response = await api.get(`/executions/nodes?executionId=${executionId}`);
    return response.data.nodes;
  },

  /**
   * Get logs for a node execution
   */
  async getNodeLogs(nodeExecutionId: string): Promise<NodeLog[]> {
    const response = await api.get(`/executions/node-logs?nodeExecutionId=${nodeExecutionId}`);
    return response.data.logs;
  },

  /**
   * Retry a workflow execution
   */
  async retryExecution(executionId: string, nodeId?: string): Promise<void> {
    await api.post(`/executions/${executionId}/retry`, { nodeId });
  },

  /**
   * Cancel a workflow execution
   */
  async cancelExecution(executionId: string, nodeId?: string): Promise<void> {
    await api.post(`/executions/${executionId}/cancel`, { nodeId });
  },

  /**
   * Pause a workflow execution
   */
  async pauseExecution(executionId: string, nodeId?: string): Promise<void> {
    await api.post(`/executions/${executionId}/pause`, { nodeId });
  },

  /**
   * Resume a workflow execution
   */
  async resumeExecution(executionId: string, nodeId?: string): Promise<void> {
    await api.post(`/executions/${executionId}/resume`, { nodeId });
  },
};

// Create additional API modules for other endpoints
export const workflowsApi = {
  async getWorkflows(page = 1, limit = 10): Promise<PaginatedResponse<any>> {
    const response = await api.get(`/workflows?page=${page}&limit=${limit}`);
    return response.data;
  },
  
  async getWorkflow(id: string): Promise<any> {
    const response = await api.get(`/workflows/${id}`);
    return response.data;
  },
  
  async createWorkflow(data: any): Promise<any> {
    const response = await api.post('/workflows', data);
    return response.data;
  },
  
  async updateWorkflow(id: string, data: any): Promise<any> {
    const response = await api.put(`/workflows/${id}`, data);
    return response.data;
  },
  
  async deleteWorkflow(id: string): Promise<void> {
    await api.delete(`/workflows/${id}`);
  },
  
  async executeWorkflow(workflowId: string): Promise<{executionId: string}> {
    const response = await api.post('/executions', { workflowId });
    return response.data;
  }
};

export const authApi = {
  async login(credentials: any): Promise<any> {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },
  
  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },
  
  async getProfile(): Promise<any> {
    const response = await api.get('/user/profile');
    return response.data;
  }
};

export const usageApi = {
  async getUsage(): Promise<any> {
    const response = await api.get('/usage');
    return response.data;
  },
  
  async getUserUsage(): Promise<any> {
    const response = await api.get('/user/usage');
    return response.data;
  }
};

export default api;
