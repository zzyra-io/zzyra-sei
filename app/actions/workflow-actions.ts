"use server"

import { createClient } from "@/lib/supabase/server"
import { v4 as uuidv4 } from "uuid"
import { revalidatePath } from "next/cache"
import { executionService } from "@/lib/services/execution-service"

export type Workflow = {
  id: string
  user_id: string
  name: string
  description: string | null
  nodes: any[]
  edges: any[]
  is_public: boolean
  tags: string[]
  created_at: string
  updated_at: string
}

export type WorkflowFormData = {
  name: string
  description: string
  is_public: boolean
  tags: string[]
}

export type Node = {
  id: string
  type: string
  position: {
    x: number
    y: number
  }
  data: any
}

export type Edge = {
  id: string
  source: string
  target: string
  type?: string
  animated?: boolean
  label?: string
  style?: any
}

export async function getWorkflows() {
  const supabase = createClient()

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated", workflows: [] }
  }

  // Get workflows for the current user
  const { data, error } = await supabase
    .from("workflows")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })

  if (error) {
    console.error("Error fetching workflows:", error)
    return { error: error.message, workflows: [] }
  }

  return { workflows: data as Workflow[] }
}

export async function createWorkflow(formData: FormData) {
  const supabase = createClient()

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const isPublic = formData.get("is_public") === "on"
  const tagsString = formData.get("tags") as string
  const tags = tagsString
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)

  // Create a new workflow
  const { error } = await supabase.from("workflows").insert({
    id: uuidv4(),
    user_id: user.id,
    name,
    description,
    nodes: [],
    edges: [],
    is_public: isPublic,
    tags,
  })

  if (error) {
    console.error("Error creating workflow:", error)
    return { error: error.message }
  }

  revalidatePath("/workflows")
  return { success: true }
}

export async function updateWorkflow(id: string, formData: FormData) {
  const supabase = createClient()

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const isPublic = formData.get("is_public") === "on"
  const tagsString = formData.get("tags") as string
  const tags = tagsString
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)

  // Update the workflow
  const { error } = await supabase
    .from("workflows")
    .update({
      name,
      description,
      is_public: isPublic,
      tags,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    console.error("Error updating workflow:", error)
    return { error: error.message }
  }

  revalidatePath("/workflows")
  revalidatePath(`/workflows/${id}`)
  return { success: true }
}

export async function deleteWorkflow(id: string) {
  const supabase = createClient()

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Delete the workflow
  const { error } = await supabase.from("workflows").delete().eq("id", id).eq("user_id", user.id)

  if (error) {
    console.error("Error deleting workflow:", error)
    return { error: error.message }
  }

  revalidatePath("/workflows")
  return { success: true }
}

export async function getWorkflowById(id: string) {
  const supabase = createClient()

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated", workflow: null }
  }

  // Get the workflow
  const { data, error } = await supabase.from("workflows").select("*").eq("id", id).eq("user_id", user.id).single()

  if (error) {
    console.error("Error fetching workflow:", error)
    return { error: error.message, workflow: null }
  }

  return { workflow: data as Workflow }
}

export async function saveWorkflowNodes(id: string, nodes: Node[], edges: Edge[]) {
  const supabase = createClient()

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  // Update the workflow nodes and edges
  const { error } = await supabase
    .from("workflows")
    .update({
      nodes,
      edges,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)

  if (error) {
    console.error("Error saving workflow nodes:", error)
    return { error: error.message }
  }

  return { success: true }
}

export async function executeWorkflow(id: string) {
  const supabase = createClient()

  // Get the current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "Not authenticated" }
  }

  try {
    // Get the workflow
    const { data, error } = await supabase.from("workflows").select("*").eq("id", id).eq("user_id", user.id).single()

    if (error) {
      console.error("Error fetching workflow for execution:", error)
      return { error: error.message }
    }

    // Execute the workflow
    const executionResult = await executionService.executeWorkflow(id)

    return { success: true, executionId: executionResult.id }
  } catch (error: any) {
    console.error("Error executing workflow:", error)
    return { error: error.message || "Failed to execute workflow" }
  }
}

export async function getWorkflowExecutions(workflowId: string) {
  try {
    const executions = await executionService.getExecutionLogs(workflowId)
    return { executions }
  } catch (error: any) {
    console.error("Error fetching workflow executions:", error)
    return { error: error.message, executions: [] }
  }
}
