import { getWorkflows } from "@/app/actions/workflow-actions"
import { WorkflowList } from "@/components/workflow-list"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import Link from "next/link"
import { DatabaseSetupButton } from "@/components/database-setup-button"

export default async function WorkflowsPage() {
  const { workflows, error } = await getWorkflows()

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Workflows</h1>
          <p className="text-muted-foreground">Create and manage your automated workflows</p>
        </div>
        <div className="flex gap-4">
          <DatabaseSetupButton />
          <Link href="/workflows/new">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Workflow
            </Button>
          </Link>
        </div>
      </div>

      <WorkflowList workflows={workflows} />
    </div>
  )
}
