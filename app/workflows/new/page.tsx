import { createWorkflow } from "@/app/actions/workflow-actions"
import { WorkflowForm } from "@/components/workflow-form"
import { AuthGate } from "@/components/auth-gate"

export default function NewWorkflowPage() {
  return (
    <AuthGate>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">Create New Workflow</h1>
        <WorkflowForm action={createWorkflow} />
      </div>
    </AuthGate>
  )
}
