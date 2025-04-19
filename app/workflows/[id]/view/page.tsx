import { getWorkflowById, getWorkflowExecutions } from "@/app/actions/workflow-actions"
import { WorkflowViewer } from "@/components/workflow-builder/workflow-viewer"
import { redirect } from "next/navigation"

export default async function WorkflowViewPage({ params }: { params: { id: string } }) {
  const { workflow, error } = await getWorkflowById(params.id)
  const { executions } = await getWorkflowExecutions(params.id)

  if (error || !workflow) {
    redirect("/workflows")
  }

  return <WorkflowViewer workflow={workflow} executions={executions || []} />
}
