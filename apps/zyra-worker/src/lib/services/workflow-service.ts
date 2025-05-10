import { createServiceClient } from '@/lib/supabase/serviceClient';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { v4 as uuidv4 } from 'uuid';
import { Injectable } from '@nestjs/common';

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
  nodes.forEach(n => { adj[n.id] = []; });
  edges.forEach(e => {
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
  return nodes.some(n => dfs(n.id));
}

@Injectable()
export class WorkflowService {
  async getWorkflows(): Promise<Workflow[]> {
    const supabase: SupabaseClient<Database> = createServiceClient();
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Error fetching workflows: ${error.message}`);
    return (data || []).map(d => ({
      ...d,
      nodes: (d.nodes as any) as any[],
      edges: (d.edges as any) as any[],
    }));
  }

  async getWorkflow(id: string): Promise<Workflow> {
    const supabase: SupabaseClient<Database> = createServiceClient();
    const { data, error } = await supabase
      .from('workflows')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw new Error(`Error fetching workflow: ${error.message}`);
    return {
      ...(data as any),
      nodes: (data?.nodes as any) as any[],
      edges: (data?.edges as any) as any[],
    };
  }

  async createWorkflow(workflow: Partial<Workflow>): Promise<Workflow> {
    const supabase: SupabaseClient<Database> = createServiceClient();
    const newWorkflow = {
      ...workflow,
      id: uuidv4(),
      nodes: workflow.nodes || [],
      edges: workflow.edges || [],
      tags: workflow.tags || [],
      is_public: workflow.is_public || false,
    };
    if (detectCycle(newWorkflow.nodes, newWorkflow.edges)) {
      throw new Error('Workflow contains a cycle; please remove loops before saving.');
    }
    const { data, error } = await supabase
      .from('workflows')
      .insert(newWorkflow as any)
      .select()
      .single();
    if (error) throw new Error(`Error creating workflow: ${error.message}`);
    return data as Workflow;
  }

  async updateWorkflow(
    id: string,
    workflow: Partial<Workflow>
  ): Promise<Workflow> {
    const supabase: SupabaseClient<Database> = createServiceClient();
    if (workflow.nodes && workflow.edges && detectCycle(workflow.nodes, workflow.edges)) {
      throw new Error('Workflow update contains a cycle; please remove loops before saving.');
    }
    const { data, error } = await supabase
      .from('workflows')
      .update(workflow as any)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(`Error updating workflow: ${error.message}`);
    return data as Workflow;
  }

  async deleteWorkflow(id: string): Promise<void> {
    const supabase: SupabaseClient<Database> = createServiceClient();
    const { error } = await supabase
      .from('workflows')
      .delete()
      .eq('id', id);
    if (error) throw new Error(`Error deleting workflow: ${error.message}`);
  }
}
