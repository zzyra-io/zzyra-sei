import { getWorkflow } from "@/app/actions/workflow-actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarIcon, EditIcon, TagIcon } from "lucide-react"
import Link from "next/link"
import { notFound } from "next/navigation"
import { DeleteWorkflowButton } from "@/components/delete-workflow-button"

interface WorkflowPageProps {
  params: {
    id: string
  }
}

export default async function WorkflowPage({ params }: WorkflowPageProps) {
  const { workflow, error } = await getWorkflow(params.id)

  if (error || !workflow) {
    notFound()
  }

  return (
    <div className="container py-10 max-w-7xl">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{workflow.name}</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href={`/workflows/${workflow.id}/edit`}>
              <EditIcon className="h-4 w-4 mr-2" />
              Edit
            </Link>
          </Button>
          <DeleteWorkflowButton id={workflow.id} />
        </div>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Details</CardTitle>
          <CardDescription>Workflow information and metadata</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-medium mb-1">Description</h3>
            <p className="text-muted-foreground">{workflow.description || "No description provided"}</p>
          </div>

          {workflow.tags && workflow.tags.length > 0 && (
            <div>
              <h3 className="font-medium mb-1">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {workflow.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    <TagIcon className="h-3 w-3" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-6">
            <div>
              <h3 className="font-medium mb-1">Visibility</h3>
              <Badge variant="outline">{workflow.is_public ? "Public" : "Private"}</Badge>
            </div>
            <div>
              <h3 className="font-medium mb-1">Last Updated</h3>
              <div className="flex items-center text-muted-foreground">
                <CalendarIcon className="h-4 w-4 mr-1" />
                {new Date(workflow.updated_at).toLocaleString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Workflow Canvas</CardTitle>
          <CardDescription>Visual representation of your workflow</CardDescription>
        </CardHeader>
        <CardContent className="min-h-[400px] flex items-center justify-center bg-muted/40">
          <div className="text-center">
            <p className="text-muted-foreground mb-2">Workflow editor coming soon</p>
            <p className="text-xs text-muted-foreground">
              This workflow has {workflow.nodes.length} nodes and {workflow.edges.length} connections
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button disabled>Edit Workflow Canvas</Button>
        </CardFooter>
      </Card>
    </div>
  )
}
