import api from "./api";

export interface Workflow {
  id: string;
  userId: string; // Changed from user_id to match Prisma schema
  user_id?: string; // For backward compatibility
  name: string;
  description: string;
  nodes: any[];
  edges: any[];
  isPublic: boolean; // Changed from is_public to match Prisma schema
  is_public?: boolean; // For backward compatibility
  tags: string[];
  createdAt: string; // Changed from created_at to match Prisma schema
  created_at?: string; // For backward compatibility
  updatedAt: string; // Changed from updated_at to match Prisma schema
  updated_at?: string; // For backward compatibility
  version?: number; // Added to match Prisma schema
  definition?: any; // Added to match Prisma schema
  // Enhanced fields from repository
  statistics?: {
    totalExecutions: number;
    successRate: number;
    avgExecutionTime: number;
    nodeCount: number;
    lastStatus: string;
    lastExecutedAt?: string;
    recentActivity: {
      successful: number;
      failed: number;
      running: number;
    };
  };
  recentExecutions?: any[];
  isFavorite?: boolean;
  is_favorite?: boolean; // For backward compatibility
  last_status?: string;
  last_run?: string; // Derived from statistics.lastExecutedAt
}

// Utility: detect cycles in workflow graph
function detectCycle(nodes: any[], edges: any[]): boolean {
  // Early return for empty graphs
  if (!nodes || nodes.length === 0) {
    return false;
  }

  const adj: Record<string, string[]> = {};

  // Initialize adjacency list
  nodes.forEach((n) => {
    adj[n.id] = [];
  });

  // Build adjacency list from edges
  edges.forEach((e) => {
    const src = (e as any).source ?? (e as any).sourceNodeId;
    const tgt = (e as any).target ?? (e as any).targetNodeId;
    if (src && tgt && adj[src]) {
      adj[src].push(tgt);
    }
  });

  const visited: Record<string, boolean> = {};
  const recStack: Record<string, boolean> = {};

  function dfs(u: string): boolean {
    // Prevent infinite recursion with a maximum depth
    if (recStack[u]) {
      return true; // Found a cycle
    }

    if (visited[u]) {
      return false; // Already processed this node
    }

    visited[u] = true;
    recStack[u] = true;

    // Check all adjacent nodes
    for (const v of adj[u] || []) {
      if (dfs(v)) {
        return true; // Found a cycle
      }
    }

    recStack[u] = false;
    return false;
  }

  // Check for cycles starting from each node
  for (const node of nodes) {
    if (!visited[node.id]) {
      if (dfs(node.id)) {
        return true; // Found a cycle
      }
    }
  }

  return false; // No cycles found
}

class WorkflowService {
  async getWorkflows(
    page = 1,
    limit = 10
  ): Promise<{ data: Workflow[]; total: number; page: number; limit: number }> {
    try {
      const response = await api.get(`/workflows?page=${page}&limit=${limit}`);

      if (response.status !== 200) {
        const errorData = response.data;
        throw new Error(errorData.error || "Failed to fetch workflows");
      }

      // The backend returns paginated data
      const paginatedData = response.data;
      const workflows = paginatedData.data || [];

      // Map enhanced workflow data to match frontend interface
      const mappedWorkflows = workflows.map((workflow: any) => {
        return {
          ...workflow,
          // Ensure camelCase compatibility for frontend
          created_at: workflow.createdAt || workflow.created_at,
          updated_at: workflow.updatedAt || workflow.updated_at,
          isFavorite: workflow.isFavorite || workflow.is_favorite || false,
          is_favorite: workflow.isFavorite || workflow.is_favorite || false,
          last_run:
            workflow.lastRun ||
            workflow.statistics?.lastExecutedAt ||
            workflow.last_run,
          last_status: workflow.statistics?.lastStatus || workflow.last_status,
          tags: workflow.tags || [],
          isPublic: workflow.isPublic || workflow.is_public || false,
          is_public: workflow.isPublic || workflow.is_public || false,
          // Ensure statistics are properly mapped
          statistics: workflow.statistics || {
            totalExecutions: 0,
            successRate: 0,
            avgExecutionTime: 0,
            nodeCount: workflow.nodes?.length || 0,
            lastStatus: "never",
            lastExecutedAt: undefined,
            recentActivity: {
              successful: 0,
              failed: 0,
              running: 0,
            },
          },
        };
      });

      return {
        data: mappedWorkflows,
        total: paginatedData.total || workflows.length,
        page: paginatedData.page || page,
        limit: paginatedData.limit || limit,
      };
    } catch (error: any) {
      console.error("Error fetching workflows:", error);
      throw new Error(`Failed to fetch workflows: ${error.message}`);
    }
  }

  async getWorkflow(id: string): Promise<Workflow> {
    try {
      const response = await api.get(`/workflows/${id}`);

      if (response.status !== 200) {
        const errorData = response.data;
        throw new Error(errorData.error || "Failed to fetch workflow");
      }

      return response.data;
    } catch (error: any) {
      console.error("Error fetching workflow:", error);
      throw new Error(`Failed to fetch workflow: ${error.message}`);
    }
  }

  async createWorkflow(workflow: Partial<Workflow>): Promise<Workflow> {
    try {
      // cycle detection
      const nodes = workflow.nodes || [];
      const edges = workflow.edges || [];
      if (detectCycle(nodes, edges)) {
        throw new Error(
          "Workflow contains a cycle; please remove loops before saving."
        );
      }
      // Prevent saving empty workflows
      if (!nodes || nodes.length === 0) {
        throw new Error("Workflow must have at least one block.");
      }

      // Only send fields that the backend expects (CreateWorkflowDto)
      const createWorkflowData = {
        name: workflow.name || "Untitled Workflow",
        description: workflow.description || "",
        nodes: workflow.nodes || [],
        edges: workflow.edges || [],
      };

      const response = await api.post("/workflows", createWorkflowData);

      if (response.status !== 200 && response.status !== 201) {
        const errorData = response.data;
        throw new Error(errorData.error || "Failed to create workflow");
      }

      return response.data;
    } catch (error: any) {
      console.error("Error creating workflow:", error);
      throw new Error(`Failed to create workflow: ${error.message}`);
    }
  }

  async updateWorkflow(
    id: string,
    workflow: Partial<Workflow>
  ): Promise<Workflow> {
    try {
      // cycle detection for updated graph
      if (workflow.nodes && workflow.edges) {
        if (detectCycle(workflow.nodes, workflow.edges)) {
          throw new Error(
            "Workflow update contains a cycle; please remove loops before saving."
          );
        }
      }
      // Prevent saving empty workflows
      if (workflow.nodes && workflow.nodes.length === 0) {
        throw new Error("Workflow must have at least one block.");
      }

      // Only send fields that the backend expects (UpdateWorkflowDto)
      const updateData: Record<string, unknown> = {};
      if (workflow.name !== undefined) updateData.name = workflow.name;
      if (workflow.description !== undefined)
        updateData.description = workflow.description;
      if (workflow.nodes !== undefined) updateData.nodes = workflow.nodes;
      if (workflow.edges !== undefined) updateData.edges = workflow.edges;
      if (workflow.is_public !== undefined) updateData.isPublic = workflow.is_public;

      const response = await api.put(`/workflows/${id}`, updateData);
      console.log("updateData", updateData);
      console.log("response", response);

      if (response.status !== 200) {
        const errorData = response.data;
        throw new Error(errorData.error || "Failed to update workflow");
      }

      return response.data;
    } catch (error) {
      console.error("Error updating workflow:", error);
      throw error;
    }
  }

  async deleteWorkflow(id: string): Promise<void> {
    try {
      const response = await api.delete(`/workflows/${id}`);

      if (response.status !== 200) {
        const errorData = response.data;
        throw new Error(errorData.error || "Failed to delete workflow");
      }
    } catch (error: any) {
      console.error("Error deleting workflow:", error);
      throw new Error(`Failed to delete workflow: ${error.message}`);
    }
  }

  async executeWorkflow(workflow: {
    id?: string;
    name?: string;
    description?: string;
    nodes: any[];
    edges: any[];
  }): Promise<{ id: string }> {
    try {
      let workflowId = workflow.id;

      // If workflow doesn't have an ID, save it first
      if (!workflowId) {
        console.log("Workflow has no ID, creating it first...");
        const savedWorkflow = await this.createWorkflow({
          name: workflow.name || "Untitled Workflow",
          description: workflow.description || "",
          nodes: workflow.nodes,
          edges: workflow.edges,
        });
        workflowId = savedWorkflow.id;
      }

      // Use the API endpoint to execute the workflow
      const response = await api.post(`/workflows/${workflowId}/execute`);

      if (response.status !== 200 && response.status !== 201) {
        const errorData = response.data;
        throw new Error(errorData.error || "Failed to execute workflow");
      }

      const data = response.data;
      return { id: data.executionId };
    } catch (error: any) {
      console.error("Error executing workflow:", error);
      throw new Error(`Failed to execute workflow: ${error.message}`);
    }
  }

  /**
   * Get the status and details of a workflow execution
   */
  async getExecutionStatus(executionId: string): Promise<{
    id: string;
    status: string;
    currentNodeId?: string;
    current_node_id?: string; // For backward compatibility
    executionProgress?: number;
    execution_progress?: number; // For backward compatibility
    nodesCompleted?: string[];
    nodes_completed?: string[]; // For backward compatibility
    nodesFailed?: string[];
    nodes_failed?: string[]; // For backward compatibility
    nodesPending?: string[];
    nodes_pending?: string[]; // For backward compatibility
    result?: unknown;
    error?: string;
    logs?: string[];
  }> {
    try {
      const response = await api.get(`/executions/${executionId}`);

      if (response.status !== 200) {
        const errorData = response.data;
        throw new Error(errorData.error || "Failed to fetch execution status");
      }

      return response.data;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error("Error fetching execution status:", error);
      throw new Error(`Failed to fetch execution status: ${errorMessage}`);
    }
  }
}

export const workflowService = new WorkflowService();
