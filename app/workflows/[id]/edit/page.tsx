import { getWorkflowById, updateWorkflow } from "@/app/actions/workflow-actions"
import { WorkflowForm } from "@/components/workflow-form"
import { AuthGate } from "@/components/auth-gate"
import { notFound } from "next/navigation"

interface EditWorkflowPageProps {
  params: {
    id: string
  }
}

export default async function EditWorkflowPage({ params }: EditWorkflowPageProps) {
  const { workflow, error } = await getWorkflowById(params.id)

  if (error || !workflow) {
    notFound()
  }

  const updateWorkflowWithId = async (formData: FormData) => {
    "use server"
    return updateWorkflow(params.id, formData)
  }

  return (
    <AuthGate>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Edit Workflow: {workflow.name}</h1>
        <WorkflowForm workflow={workflow} action={updateWorkflowWithId} />
      </div>
    </AuthGate>
  )
}
