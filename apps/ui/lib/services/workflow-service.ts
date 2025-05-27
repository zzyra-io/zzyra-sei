import { v4 as uuidv4 } from "uuid";

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
  const adj: Record<string, string[]> = {}
  nodes.forEach(n => { adj[n.id] = [] })
  edges.forEach(e => {
    const src = (e as any).source ?? (e as any).sourceNodeId
    const tgt = (e as any).target ?? (e as any).targetNodeId
    if (src && tgt && adj[src]) adj[src].push(tgt)
  })
  const visited: Record<string, boolean> = {}
  const recStack: Record<string, boolean> = {}
  function dfs(u: string): boolean {
    if (!visited[u]) {
      visited[u] = true
      recStack[u] = true
      for (const v of adj[u] || []) {
        if (!visited[v] && dfs(v)) return true
        else if (recStack[v]) return true
      }
    }
    recStack[u] = false
    return false
  }
  return nodes.some(n => dfs(n.id))
}

class WorkflowService {
  async getWorkflows(): Promise<Workflow[]> {
    try {
      const response = await fetch('/api/workflows', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch workflows');
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
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch workflow');
      }

      return await response.json();
    } catch (error: any) {
      console.error("Error fetching workflow:", error);
      throw new Error(`Failed to fetch workflow: ${error.message}`);
    }
  }

  async createWorkflow(workflow: Partial<Workflow>): Promise<Workflow> {
    try {
      // Transform property names to match Prisma schema
      const newWorkflow = {
        ...workflow,
        id: uuidv4(),
        nodes: workflow.nodes || [],
        edges: workflow.edges || [],
        tags: workflow.tags || [],
        isPublic: workflow.isPublic ?? workflow.is_public ?? false,
        // Use Prisma-style naming for properties
        userId: workflow.userId ?? workflow.user_id,
      };
      
      // Remove legacy property names
      delete newWorkflow.user_id;
      delete newWorkflow.is_public;
      delete newWorkflow.created_at;
      delete newWorkflow.updated_at;

      // cycle detection
      const nodes = newWorkflow.nodes || []
      const edges = newWorkflow.edges || []
      if (detectCycle(nodes, edges)) {
        throw new Error("Workflow contains a cycle; please remove loops before saving.")
      }

      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newWorkflow),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create workflow');
      }

      return await response.json();
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
          throw new Error("Workflow update contains a cycle; please remove loops before saving.")
        }
      }

      const response = await fetch(`/api/workflows/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update workflow');
      }

      return await response.json();
    } catch (error: any) {
      console.error("Error updating workflow:", error);
      throw new Error(`Failed to update workflow: ${error.message}`);
    }
  }

  async deleteWorkflow(id: string): Promise<void> {
    try {
      const response = await fetch(`/api/workflows/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete workflow');
      }
    } catch (error: any) {
      console.error("Error deleting workflow:", error);
      throw new Error(`Failed to delete workflow: ${error.message}`);
    }
  }

  async executeWorkflow(workflow: { id?: string; nodes: any[]; edges: any[] }): Promise<{ id: string }> {
    try {
      let workflowId = workflow.id;
      
      // If workflow doesn't have an ID, save it first
      if (!workflowId) {
        // Create a temporary workflow first
        const newWorkflow = await this.createWorkflow({
          name: "Temporary Workflow",
          description: "Auto-saved before execution",
          nodes: workflow.nodes,
          edges: workflow.edges,
          isPublic: false, // Updated to camelCase
          tags: []  
        });
        workflowId = newWorkflow.id;
      }
      
      // Use the API endpoint to execute the workflow
      const response = await fetch('/api/execute-workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ workflowId }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to execute workflow');
      }
      
      const data = await response.json();
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
      const response = await fetch(`/api/execute-workflow/${executionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch execution status');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Error fetching execution status:', error);
      throw new Error(`Failed to fetch execution status: ${error.message}`);
    }
  }
}

export const workflowService = new WorkflowService();
