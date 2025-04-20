import { createClient } from "@/lib/supabase/client";
import { v4 as uuidv4 } from "uuid";

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
      const supabase = createClient();
      const { data, error } = await supabase
        .from("workflows")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        throw new Error(`Error fetching workflows: ${error.message}`);
      }

      return data || [];
    } catch (error: any) {
      console.error("Error fetching workflows:", error);
      throw new Error(`Failed to fetch workflows: ${error.message}`);
    }
  }

  async getWorkflow(id: string): Promise<Workflow> {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("workflows")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        throw new Error(`Error fetching workflow: ${error.message}`);
      }

      return data;
    } catch (error: any) {
      console.error("Error fetching workflow:", error);
      throw new Error(`Failed to fetch workflow: ${error.message}`);
    }
  }

  async createWorkflow(workflow: Partial<Workflow>): Promise<Workflow> {
    try {
      const supabase = createClient();
      const newWorkflow = {
        ...workflow,
        id: uuidv4(),
        nodes: workflow.nodes || [],
        edges: workflow.edges || [],
        tags: workflow.tags || [],
        is_public: workflow.is_public || false,
      };

      // cycle detection
      const nodes = newWorkflow.nodes || []
      const edges = newWorkflow.edges || []
      if (detectCycle(nodes, edges)) {
        throw new Error("Workflow contains a cycle; please remove loops before saving.")
      }

      const { data, error } = await supabase
        .from("workflows")
        .insert(newWorkflow)
        .select()
        .single();

      if (error) {
        throw new Error(`Error creating workflow: ${error.message}`);
      }

      return data;
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
      const supabase = createClient();
      const { data, error } = await supabase
        .from("workflows")
        .update(workflow)
        .eq("id", id)
        .select()
        .single();

      // cycle detection for updated graph
      if (workflow.nodes && workflow.edges) {
        if (detectCycle(workflow.nodes, workflow.edges)) {
          throw new Error("Workflow update contains a cycle; please remove loops before saving.")
        }
      }

      if (error) {
        throw new Error(`Error updating workflow: ${error.message}`);
      }

      return data;
    } catch (error: any) {
      console.error("Error updating workflow:", error);
      throw new Error(`Failed to update workflow: ${error.message}`);
    }
  }

  async deleteWorkflow(id: string): Promise<void> {
    try {
      const supabase = createClient();
      const { error } = await supabase.from("workflows").delete().eq("id", id);

      if (error) {
        throw new Error(`Error deleting workflow: ${error.message}`);
      }
    } catch (error: any) {
      console.error("Error deleting workflow:", error);
      throw new Error(`Failed to delete workflow: ${error.message}`);
    }
  }
}

export const workflowService = new WorkflowService();
