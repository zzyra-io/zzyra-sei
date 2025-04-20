"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { v4 as uuidv4 } from "uuid"

export type WorkflowFormData = {
  name: string
  description: string
  isPublic: boolean
  tags: string[]
}

export async function createWorkflow(formData: FormData) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Not authenticated" }
  }

  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const isPublic = formData.get("isPublic") === "true"
  const tagsString = formData.get("tags") as string
  const tags = tagsString ? tagsString.split(",").map((tag) => tag.trim()) : []

  const workflowId = uuidv4()

  const { error } = await supabase.from("workflows").insert({
    id: workflowId,
    user_id: user.id,
    name,
    description,
    is_public: isPublic,
    tags,
    nodes: [],
    edges: [],
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/workflows")
  redirect("/workflows")
}

export async function updateWorkflow(workflowId: string, formData: FormData) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Not authenticated" }
  }

  const name = formData.get("name") as string
  const description = formData.get("description") as string
  const isPublic = formData.get("isPublic") === "true"
  const tagsString = formData.get("tags") as string
  const tags = tagsString ? tagsString.split(",").map((tag) => tag.trim()) : []

  const { error } = await supabase
    .from("workflows")
    .update({
      name,
      description,
      is_public: isPublic,
      tags,
      updated_at: new Date().toISOString(),
    })
    .eq("id", workflowId)
    .eq("user_id", user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/workflows")
  revalidatePath(`/workflows/${workflowId}`)
  redirect(`/workflows/${workflowId}`)
}

export async function deleteWorkflow(workflowId: string) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: "Not authenticated" }
  }

  const { error } = await supabase.from("workflows").delete().eq("id", workflowId).eq("user_id", user.id)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/workflows")
  redirect("/workflows")
}

export async function getWorkflows() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { workflows: [], error: "Not authenticated" }
  }

  const { data: workflows, error } = await supabase
    .from("workflows")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })

  if (error) {
    return { workflows: [], error: error.message }
  }

  return { workflows, error: null }
}

export async function getWorkflow(workflowId: string) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { workflow: null, error: "Not authenticated" }
  }

  const { data: workflow, error } = await supabase.from("workflows").select("*").eq("id", workflowId).single()

  if (error) {
    return { workflow: null, error: error.message }
  }

  return { workflow, error: null }
}
