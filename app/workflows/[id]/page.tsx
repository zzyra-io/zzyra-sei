import Link from "next/link"
import { getWorkflowById } from "@/app/actions/workflow-actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Edit, ArrowLeft } from "lucide-react"
import { AuthGate } from "@/components/auth-gate"
import { notFound } from "next/navigation"

interface WorkflowPageProps {
  params: {
    id: string
  }
}

export default async function WorkflowPage({ params }: WorkflowPageProps) {
  const { workflow, error } = await getWorkflowById(params.id)

  if (error || !workflow) {
    notFound()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  return (
    <AuthGate>
      <div className="container mx-auto py-8">
        <div className="mb-6">
          <Link href="/workflows">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Workflows
            </Button>
          </Link>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">{workflow.name}</h1>
          <Link href={`/workflows/${workflow.id}/edit`}>
            <Button>
              <Edit className="mr-2 h-4 w-4" />
              Edit Workflow
            </Button>
          </Link>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-xl">Details</CardTitle>
                <CardDescription>{workflow.description || "No description provided"}</CardDescription>
              </div>
              {workflow.is_public && <Badge variant="outline">Public</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Tags</h3>
                <div className="flex flex-wrap gap-2 mt-1">
                  {workflow.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                  {workflow.tags.length === 0 && <span className="text-sm text-gray-500">No tags</span>}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Created</h3>
                  <p>{formatDate(workflow.created_at)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Last Updated</h3>
                  <p>{formatDate(workflow.updated_at)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Workflow Editor</CardTitle>
            <CardDescription>
              This is where the workflow editor would be displayed. You can implement a visual editor using React Flow
              or a similar library.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-96 bg-gray-100 rounded-md flex items-center justify-center">
            <p className="text-gray-500">Workflow Editor Placeholder</p>
          </CardContent>
        </Card>
      </div>
    </AuthGate>
  )
}
