export type Workflow = {
  id: string
  user_id: string
  name: string
  description: string
  nodes: any[]
  edges: any[]
  created_at: string
  updated_at: string
  is_public: boolean
  tags: string[]
}

export type WorkflowSummary = Pick<Workflow, "id" | "name" | "description" | "created_at" | "updated_at" | "tags">

export type WorkflowCreateInput = Omit<Workflow, "id" | "user_id" | "created_at" | "updated_at">

export type WorkflowUpdateInput = Partial<Omit<Workflow, "id" | "user_id" | "created_at" | "updated_at">>
