import { createClient } from "@/lib/supabase/client"
import type { Workflow, WorkflowCreateInput } from "@/lib/supabase/schema"
import { workflowService } from "@/lib/services/workflow-service"

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: string
  nodes: any[]
  edges: any[]
  tags: string[]
  is_premium: boolean
  created_at: string
  updated_at: string
}

export class TemplateService {
  private supabase = createClient()

  async getTemplates(category?: string): Promise<WorkflowTemplate[]> {
    try {
      let query = this.supabase.from("workflow_templates").select("*")

      if (category) {
        query = query.eq("category", category)
      }

      const { data, error } = await query.order("name")

      if (error) {
        // Check if the error is because the table doesn't exist
        if (error.message.includes("relation") && error.message.includes("does not exist")) {
          console.warn("workflow_templates table does not exist yet. Returning empty array.")
          return []
        }
        console.error("Error fetching templates:", error)
        throw error
      }

      return data as WorkflowTemplate[]
    } catch (error) {
      console.error("Error in getTemplates:", error)
      // Return empty array instead of throwing to prevent UI errors
      return []
    }
  }

  async getTemplate(id: string): Promise<WorkflowTemplate | null> {
    try {
      const { data, error } = await this.supabase.from("workflow_templates").select("*").eq("id", id).single()

      if (error) {
        // Check if the error is because the table doesn't exist
        if (error.message.includes("relation") && error.message.includes("does not exist")) {
          console.warn("workflow_templates table does not exist yet. Returning null.")
          return null
        }
        console.error("Error fetching template:", error)
        throw error
      }

      return data as WorkflowTemplate
    } catch (error) {
      console.error("Error in getTemplate:", error)
      return null
    }
  }

  async createWorkflowFromTemplate(templateId: string, name?: string): Promise<Workflow> {
    try {
      // Get the template
      const template = await this.getTemplate(templateId)

      if (!template) {
        throw new Error("Template not found or templates table does not exist yet")
      }

      // Check if user has access to premium templates
      if (template.is_premium) {
        const { data: profile } = await this.supabase
          .from("profiles")
          .select("subscription_tier")
          .eq("id", (await this.supabase.auth.getUser()).data.user?.id)
          .single()

        if (!profile || profile.subscription_tier === "free") {
          throw new Error("Premium templates require a paid subscription")
        }
      }

      // Create a workflow from the template
      const workflowInput: WorkflowCreateInput = {
        name: name || template.name,
        description: template.description,
        nodes: template.nodes,
        edges: template.edges,
        is_public: false,
        tags: template.tags,
      }

      return await workflowService.createWorkflow(workflowInput)
    } catch (error) {
      console.error("Error in createWorkflowFromTemplate:", error)
      throw error
    }
  }

  async getCategories(): Promise<string[]> {
    try {
      const { data, error } = await this.supabase.from("workflow_templates").select("category").order("category")

      if (error) {
        // Check if the error is because the table doesn't exist
        if (error.message.includes("relation") && error.message.includes("does not exist")) {
          console.warn("workflow_templates table does not exist yet. Returning empty array.")
          return []
        }
        console.error("Error fetching template categories:", error)
        throw error
      }

      // Extract unique categories
      const categories = [...new Set(data.map((item) => item.category))]
      return categories
    } catch (error) {
      console.error("Error in getCategories:", error)
      // Return empty array instead of throwing to prevent UI errors
      return []
    }
  }
}

export const templateService = new TemplateService()
