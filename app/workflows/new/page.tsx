import { WorkflowForm } from "@/components/workflow-form"

export default function NewWorkflowPage() {
  return (
    <div className="container py-10 max-w-7xl">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Create New Workflow</h1>
      <WorkflowForm mode="create" />
    </div>
  )
}
