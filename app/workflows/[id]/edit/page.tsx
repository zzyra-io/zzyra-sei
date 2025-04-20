import { getWorkflow } from "@/app/actions/workflow-actions"
import { WorkflowForm } from "@/components/workflow-form"
import { notFound } from "next/navigation"

interface EditWorkflowPageProps {
  params: {
    id: string
  }
}

export default async function EditWorkflowPage({ params }: EditWorkflowPageProps) {
  const { workflow, error } = await getWorkflow(params.id)

  if (error || !workflow) {
    notFound()
  }

  return (
    <div className="container py-10 max-w-7xl">
      <h1 className="text-3xl font-bold tracking-tight mb-8">Edit Workflow</h1>
      <WorkflowForm mode="edit" workflow={workflow} />
    </div>
  )
}
