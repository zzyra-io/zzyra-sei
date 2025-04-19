import { createClient } from "@/lib/supabase/client"
import type { Workflow, WorkflowCreateInput, WorkflowSummary, WorkflowUpdateInput } from "@/lib/supabase/schema"
import { v4 as uuidv4 } from "uuid"

export class CachedWorkflowService {
  private supabase = createClient()
  private cacheTime = 300000 // 5 minutes

  // Cache maps
  private workflowCache = new Map<string, { data: Workflow; timestamp: number }>()
  private userWorkflowsCache = new Map<string, { data: WorkflowSummary[]; timestamp: number }>()

  async createWorkflow(input: WorkflowCreateInput): Promise<Workflow> {
    try {
      const user = (await this.supabase.auth.getUser()).data.user

      if (!user) {
        throw new Error("User not authenticated")
      }

      const workflow: Omit<Workflow, "created_at" | "updated_at"> = {
        id: uuidv4(),
        user_id: user.id,
        name: input.name,
        description: input.description,
        nodes: input.nodes,
        edges: input.edges,
        is_public: input.is_public,
        tags: input.tags,
      }

      const { data, error } = await this.supabase.from("workflows").insert(workflow).select().single()

      if (error) {
        console.error("Error creating workflow:", error)
        throw error
      }

      // Invalidate user workflows cache
      this.userWorkflowsCache.delete(user.id)

      return data as Workflow
    } catch (error) {
      console.error("Error in createWorkflow:", error)
      throw error
    }
  }

  async updateWorkflow(id: string, input: WorkflowUpdateInput): Promise<Workflow> {
    try {
      const user = (await this.supabase.auth.getUser()).data.user

      if (!user) {
        throw new Error("User not authenticated")
      }

      // Invalidate cache for this workflow
      this.workflowCache.delete(id)

      // First verify the user owns this workflow
      const { data: existingWorkflow, error: fetchError } = await this.supabase
        .from("workflows")
        .select()
        .eq("id", id)
        .eq("user_id", user.id)
        .single()

      if (fetchError) {
        throw fetchError
      }

      if (!existingWorkflow) {
        throw new Error("Workflow not found or access denied")
      }

      const { data, error } = await this.supabase
        .from("workflows")
        .update({
          name: input.name,
          description: input.description,
          nodes: input.nodes,
          edges: input.edges,
          is_public: input.is_public,
          tags: input.tags,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single()

      if (error) {
        console.error("Error updating workflow:", error)
        throw error
      }

      // Invalidate user workflows cache
      this.userWorkflowsCache.delete(user.id)

      return data as Workflow
    } catch (error) {
      console.error("Error in updateWorkflow:", error)
      throw error
    }
  }

  async getWorkflow(id: string): Promise<Workflow> {
    try {
      const user = (await this.supabase.auth.getUser()).data.user

      if (!user) {
        throw new Error("User not authenticated")
      }

      // Check cache first
      const cachedWorkflow = this.workflowCache.get(id)
      if (cachedWorkflow && Date.now() - cachedWorkflow.timestamp < this.cacheTime) {
        return cachedWorkflow.data
      }

      const { data, error } = await this.supabase
        .from("workflows")
        .select()
        .eq("id", id)
        .or(`user_id.eq.${user.id},is_public.eq.true`)
        .single()

      if (error) {
        console.error("Error fetching workflow:", error)
        throw error
      }

      // Update cache
      this.workflowCache.set(id, { data: data as Workflow, timestamp: Date.now() })

      return data as Workflow
    } catch (error) {
      console.error("Error in getWorkflow:", error)
      throw error
    }
  }

  async getUserWorkflows(): Promise<WorkflowSummary[]> {
    try {
      const user = (await this.supabase.auth.getUser()).data.user

      if (!user) {
        throw new Error("User not authenticated")
      }

      // Check cache first
      const cachedWorkflows = this.userWorkflowsCache.get(user.id)
      if (cachedWorkflows && Date.now() - cachedWorkflows.timestamp < this.cacheTime) {
        return cachedWorkflows.data
      }

      const { data, error } = await this.supabase
        .from("workflows")
        .select("id, name, description, created_at, updated_at, tags")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })

      if (error) {
        console.error("Error fetching workflows:", error)
        throw error
      }

      // Update cache
      this.userWorkflowsCache.set(user.id, { data: data as WorkflowSummary[], timestamp: Date.now() })

      return data as WorkflowSummary[]
    } catch (error) {
      console.error("Error in getUserWorkflows:", error)
      throw error
    }
  }

  async deleteWorkflow(id: string): Promise<void> {
    try {
      const user = (await this.supabase.auth.getUser()).data.user

      if (!user) {
        throw new Error("User not authenticated")
      }

      const { error } = await this.supabase.from("workflows").delete().eq("id", id).eq("user_id", user.id)

      if (error) {
        console.error("Error deleting workflow:", error)
        throw error
      }

      // Invalidate caches
      this.workflowCache.delete(id)
      this.userWorkflowsCache.delete(user.id)
    } catch (error) {
      console.error("Error in deleteWorkflow:", error)
      throw error
    }
  }

  // Clear all cached data
  clearCache(): void {
    this.workflowCache.clear()
    this.userWorkflowsCache.clear()
  }
}

export const cachedWorkflowService = new CachedWorkflowService()
