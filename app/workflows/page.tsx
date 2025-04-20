import { WorkflowList } from "@/components/workflow-list"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { PlusIcon } from "lucide-react"

export default function WorkflowsPage() {
  return (
    <div className="container py-10 max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workflows</h1>
          <p className="text-muted-foreground mt-1">Manage and create automated workflows</p>
        </div>
        <Button asChild>
          <Link href="/workflows/new">
            <PlusIcon className="h-4 w-4 mr-2" />
            New Workflow
          </Link>
        </Button>
      </div>

      <WorkflowList />
    </div>
  )
}
