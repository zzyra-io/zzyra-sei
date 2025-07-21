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
      const response = await api.get("/workflows");

      if (response.status !== 200) {
        const errorData = response.data;
        throw new Error(errorData.error || "Failed to fetch workflows");
      }

      // The backend returns paginated data, so extract the data array
      return response.data.data || response.data;
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
