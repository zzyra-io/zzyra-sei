import { createClient } from "@/lib/supabase/server"
import { v4 as uuidv4 } from "uuid"

export interface Workflow {
  id: string
  user_id: string
  name: string
  description: string
  nodes: any[]
  edges: any[]
  is_public: boolean
  tags: string[]
  created_at: string
  updated_at: string
}

class WorkflowService {
  async getWorkflows(): Promise<Workflow[]> {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("workflows").select("*").order("created_at", { ascending: false })

      if (error) {
        throw new Error(`Error fetching workflows: ${error.message}`)
      }

      return data || []
    } catch (error: any) {
      console.error("Error fetching workflows:", error)
      throw new Error(`Failed to fetch workflows: ${error.message}`)
    }
  }

  async getWorkflow(id: string): Promise<Workflow> {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("workflows").select("*").eq("id", id).single()

      if (error) {
        throw new Error(`Error fetching workflow: ${error.message}`)
      }

      return data
    } catch (error: any) {
      console.error("Error fetching workflow:", error)
      throw new Error(`Failed to fetch workflow: ${error.message}`)
    }
  }

  async createWorkflow(workflow: Partial<Workflow>): Promise<Workflow> {
    try {
      const supabase = createClient()
      const newWorkflow = {
        ...workflow,
        id: uuidv4(),
        nodes: workflow.nodes || [],
        edges: workflow.edges || [],
        tags: workflow.tags || [],
        is_public: workflow.is_public || false,
      }

      const { data, error } = await supabase.from("workflows").insert(newWorkflow).select().single()

      if (error) {
        throw new Error(`Error creating workflow: ${error.message}`)
      }

      return data
    } catch (error: any) {
      console.error("Error creating workflow:", error)
      throw new Error(`Failed to create workflow: ${error.message}`)
    }
  }

  async updateWorkflow(id: string, workflow: Partial<Workflow>): Promise<Workflow> {
    try {
      const supabase = createClient()
      const { data, error } = await supabase.from("workflows").update(workflow).eq("id", id).select().single()

      if (error) {
        throw new Error(`Error updating workflow: ${error.message}`)
      }

      return data
    } catch (error: any) {
      console.error("Error updating workflow:", error)
      throw new Error(`Failed to update workflow: ${error.message}`)
    }
  }

  async deleteWorkflow(id: string): Promise<void> {
    try {
      const supabase = createClient()
      const { error } = await supabase.from("workflows").delete().eq("id", id)

      if (error) {
        throw new Error(`Error deleting workflow: ${error.message}`)
      }
    } catch (error: any) {
      console.error("Error deleting workflow:", error)
      throw new Error(`Failed to delete workflow: ${error.message}`)
    }
  }
}

export const workflowService = new WorkflowService()
