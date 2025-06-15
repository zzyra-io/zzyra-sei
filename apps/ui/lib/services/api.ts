/**
 * API service for communicating with the backend
 */
import useAuthStore from "@/lib/store/auth-store";
import axios from "axios";

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
  config: Record<string, unknown>;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  output_data: Record<string, unknown>;
  error: string | null;
  logs: NodeLog[];
}

export interface NodeLog {
  timestamp: string;
  level: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  nodes: Record<string, unknown>[];
  edges: Record<string, unknown>[];
  createdAt: string;
  updatedAt: string;
}

export interface LoginCredentials {
  email: string;
  didToken: string;
}

export interface AuthResponse {
  success: boolean;
  user: Record<string, unknown>;
  token: {
    accessToken: string;
    refreshToken: string;
  };
  callbackUrl?: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  createdAt?: Date;
  updatedAt?: Date;
  walletAddress?: string;
}

export interface Profile {
  id: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  subscriptionTier: string;
  subscriptionStatus: string;
  subscriptionExpiresAt?: Date;
  monthlyExecutionQuota: number;
  monthlyExecutionCount: number;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  createdAt: Date;
  updatedAt: Date;
  lastSeenAt?: Date;
  monthlyExecutionsUsed: number;
  discordWebhookUrl?: string;
}

export interface BlockType {
  id: string;
  name: string;
  category: string;
  description?: string;
  schema: Record<string, unknown>;
}

export interface CustomBlock {
  id: string;
  name: string;
  description?: string;
  code: string;
  schema: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

// Use the NestJS API URL instead of Next.js API routes
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Function to get auth store token (avoiding circular dependency)
const getAuthToken = (): string | null => {
  if (typeof window === "undefined") return null;

  try {
    const token = useAuthStore.getState().token.accessToken;
    if (token) {
      return token;
    }
  } catch (error) {
    console.error("Error parsing auth store:", error);
  }

  return null;
};

// Request interceptor to add auth headers
api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized errors by clearing auth and redirecting
      if (typeof window !== "undefined") {
        try {
          // Clear auth store
          localStorage.removeItem("auth-store");

          // Dynamic import to avoid circular dependency
          const { default: useAuthStore } = await import(
            "@/lib/store/auth-store"
          );
          useAuthStore.getState().executeLogout();

          // Redirect to login
          window.location.href = "/login";
        } catch (err) {
          console.error("Error handling auth failure:", err);
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export const executionsApi = {
  /**
   * Get workflow executions
   */
  async getWorkflowExecutions(
    workflowId: string,
    limit = 10,
    offset = 0,
    status = "all",
    sortKey = "started_at",
    sortOrder = "desc"
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
    const response = await api.get(
      `/executions/nodes?executionId=${executionId}`
    );
    return response.data.nodes;
  },

  /**
   * Get logs for a node execution
   */
  async getNodeLogs(nodeExecutionId: string): Promise<NodeLog[]> {
    const response = await api.get(
      `/executions/node-logs?nodeExecutionId=${nodeExecutionId}`
    );
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
  async getWorkflows(
    page = 1,
    limit = 10
  ): Promise<PaginatedResponse<Workflow>> {
    const response = await api.get(`/workflows?page=${page}&limit=${limit}`);
    return response.data;
  },

  async getWorkflow(id: string): Promise<Workflow> {
    const response = await api.get(`/workflows/${id}`);
    return response.data;
  },

  async createWorkflow(data: Partial<Workflow>): Promise<Workflow> {
    const response = await api.post("/workflows", data);
    return response.data;
  },

  async updateWorkflow(id: string, data: Partial<Workflow>): Promise<Workflow> {
    const response = await api.put(`/workflows/${id}`, data);
    return response.data;
  },

  async deleteWorkflow(id: string): Promise<void> {
    await api.delete(`/workflows/${id}`);
  },

  async executeWorkflow(workflowId: string): Promise<{ executionId: string }> {
    const response = await api.post("/executions", { workflowId });
    return response.data;
  },
};

export const authApi = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await api.post("/auth/login", credentials);
    return response.data;
  },

  async logout(): Promise<void> {
    await api.post("/auth/logout");
  },

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const response = await api.post("/auth/refresh-token", { refreshToken });
    return response.data;
  },

  async getProfile(): Promise<Record<string, unknown>> {
    const response = await api.get("/user/profile");
    return response.data;
  },
};

export const usageApi = {
  async getUsage(): Promise<any> {
    const response = await api.get("/usage");
    return response.data;
  },

  async getUserUsage(): Promise<any> {
    const response = await api.get("/user/usage");
    return response.data;
  },
};

export const userApi = {
  async getUserUsage(): Promise<Record<string, unknown>> {
    const response = await api.get("/user/usage");
    return response.data;
  },

  async getProfile(): Promise<Record<string, unknown>> {
    const response = await api.get("/user/profile");
    return response.data;
  },

  async updateProfile(
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const response = await api.put("/user/profile", data);
    return response.data;
  },
};

export const blocksApi = {
  async getBlockTypes(): Promise<Record<string, unknown>> {
    const response = await api.get("/blocks/types");
    return response.data;
  },

  async getBlockSchema(type?: string): Promise<Record<string, unknown>> {
    const url = type ? `/blocks/schema?type=${type}` : "/blocks/schema";
    const response = await api.get(url);
    return response.data;
  },

  async getCustomBlocks(
    params?: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const response = await api.get("/blocks/custom", { params });
    return response.data;
  },

  async createCustomBlock(
    data: Record<string, unknown>
  ): Promise<Record<string, unknown>> {
    const response = await api.post("/blocks/custom", data);
    return response.data;
  },

  async getCustomBlock(id: string): Promise<Record<string, unknown>> {
    const response = await api.get(`/blocks/custom/${id}`);
    return response.data;
  },

  async deleteCustomBlock(id: string): Promise<Record<string, unknown>> {
    const response = await api.delete(`/blocks/custom/${id}`);
    return response.data;
  },
};

export default api;
