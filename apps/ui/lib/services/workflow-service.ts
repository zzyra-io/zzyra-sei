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

class WorkflowService {
  async getWorkflows(): Promise<Workflow[]> {
    try {
      const response = await fetch("/api/workflows", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch workflows");
      }

      return await response.json();
    } catch (error: any) {
      console.error("Error fetching workflows:", error);
      throw new Error(`Failed to fetch workflows: ${error.message}`);
    }
  }

  async getWorkflow(id: string): Promise<Workflow> {
    try {
      const response = await fetch(`/api/workflows/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch workflow");
      }

      return await response.json();
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
      // Transform property names to match Prisma schema
      const updateData = {
        ...workflow,
        isPublic: workflow.isPublic ?? workflow.is_public,
        userId: workflow.userId ?? workflow.user_id,
      };

      // Remove legacy property names
      delete updateData.user_id;
      delete updateData.is_public;
      delete updateData.created_at;
      delete updateData.updated_at;

      // cycle detection for updated graph
      if (workflow.nodes && workflow.edges) {
        if (detectCycle(workflow.nodes, workflow.edges)) {
          throw new Error(
            "Workflow update contains a cycle; please remove loops before saving."
          );
        }
      }

      const response = await api.put(`/workflows/${id}`, updateData);

      if (response.status !== 200) {
        const errorData = response.data;
        throw new Error(errorData.error || "Failed to update workflow");
      }

      return response.data;
    } catch (error: any) {
      console.error("Error updating workflow:", error);
      throw new Error(`Failed to update workflow: ${error.message}`);
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
    nodes: any[];
    edges: any[];
  }): Promise<{ id: string }> {
    try {
      let workflowId = workflow.id;

      // If workflow doesn't have an ID, save it first
      if (!workflowId) {
        // Create a temporary workflow first
        // TODO: this should prompt the user to save the workflow first, and then execute it, add ui
        // throw new Error("Workflow must be saved before execution");
        // workflowId = newWorkflow.id;
      }

      // Use the API endpoint to execute the workflow
      const response = await api.post("/execute-workflow", { workflowId });

      if (response.status !== 200) {
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
    currentNodeId?: string; // Changed from snake_case to camelCase
    current_node_id?: string; // For backward compatibility
    executionProgress?: number; // Changed from snake_case to camelCase
    execution_progress?: number; // For backward compatibility
    nodesCompleted?: string[]; // Changed from snake_case to camelCase
    nodes_completed?: string[]; // For backward compatibility
    nodesFailed?: string[]; // Changed from snake_case to camelCase
    nodes_failed?: string[]; // For backward compatibility
    nodesPending?: string[]; // Changed from snake_case to camelCase
    nodes_pending?: string[]; // For backward compatibility
    result?: any;
    error?: string;
    logs?: string[];
  }> {
    try {
      const response = await api.get(`/execute-workflow/${executionId}`);

      if (response.status !== 200) {
        const errorData = response.data;
        throw new Error(errorData.error || "Failed to fetch execution status");
      }

      return response.data;
    } catch (error: any) {
      console.error("Error fetching execution status:", error);
      throw new Error(`Failed to fetch execution status: ${error.message}`);
    }
  }
}

export const workflowService = new WorkflowService();
