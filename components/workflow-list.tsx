import { getWorkflows } from "@/app/actions/workflow-actions"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, TagIcon } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export async function WorkflowList() {
  const { workflows, error } = await getWorkflows()

  if (error) {
    return <div className="text-red-500">Error: {error}</div>
  }

  if (workflows.length === 0) {
    return (
      <div className="text-center p-12 border rounded-lg bg-muted/40">
        <h3 className="text-lg font-medium mb-2">No workflows found</h3>
        <p className="text-muted-foreground mb-4">Create your first workflow to get started</p>
        <Button asChild>
          <Link href="/workflows/new">Create Workflow</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {workflows.map((workflow) => (
        <Card key={workflow.id} className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="truncate">
              <Link href={`/workflows/${workflow.id}`} className="hover:underline">
                {workflow.name}
              </Link>
            </CardTitle>
            <CardDescription className="line-clamp-2">{workflow.description}</CardDescription>
          </CardHeader>
          <CardContent className="pb-2">
            {workflow.tags && workflow.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {workflow.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    <TagIcon className="h-3 w-3" />
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between text-xs text-muted-foreground pt-2 border-t">
            <div className="flex items-center">
              <CalendarIcon className="h-3 w-3 mr-1" />
              {new Date(workflow.updated_at).toLocaleDateString()}
            </div>
            <div>
              {workflow.is_public ? <Badge variant="outline">Public</Badge> : <Badge variant="outline">Private</Badge>}
            </div>
          </CardFooter>
        </Card>
      ))}
    </div>
  )
}
