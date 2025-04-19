import { getWorkflowById } from "@/app/actions/workflow-actions"
import { WorkflowBuilder } from "@/components/workflow-builder/workflow-builder"
import { redirect } from "next/navigation"

export default async function WorkflowBuilderPage({ params }: { params: { id: string } }) {
  const { workflow, error } = await getWorkflowById(params.id)

  if (error || !workflow) {
    redirect("/workflows")
  }

  return <WorkflowBuilder workflow={workflow} />
}
