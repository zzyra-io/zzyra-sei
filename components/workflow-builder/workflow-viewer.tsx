"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AuthGate } from "@/components/auth-gate"
import { FlowCanvas } from "@/components/flow-canvas"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { executeWorkflow, type Workflow } from "@/app/actions/workflow-actions"
import { useToast } from "@/components/ui/use-toast"
import { ArrowLeft, Play, Calendar, Tag, Eye, EyeOff, Loader2, PenSquare } from "lucide-react"
import { ExecutionLogsList } from "@/components/execution-logs-list"
import { ExecutionResultsDialog } from "./execution-results-dialog"

interface WorkflowViewerProps {
  workflow: Workflow
  executions: any[]
}

export function WorkflowViewer({ workflow, executions }: WorkflowViewerProps) {
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionId, setExecutionId] = useState<string | null>(null)
  const [isExecutionResultsOpen, setIsExecutionResultsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    // Simulate loading for a smoother experience
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  const handleExecuteWorkflow = async () => {
    if (workflow.nodes.length === 0) {
      toast({
        title: "Cannot execute",
        description: "This workflow is empty. Please add some blocks first.",
        variant: "destructive",
      })
      return
    }

    setIsExecuting(true)
    try {
      const result = await executeWorkflow(workflow.id)

      if (result.error) {
        toast({
          title: "Execution failed",
          description: result.error,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Workflow executed",
          description: "Your workflow has been executed successfully.",
        })

        // Store the execution ID and open the results dialog
        if (result.executionId) {
          setExecutionId(result.executionId)
          setIsExecutionResultsOpen(true)
        }
      }
    } catch (error: any) {
      toast({
        title: "Execution failed",
        description: error.message || "Failed to execute workflow",
        variant: "destructive",
      })
    } finally {
      setIsExecuting(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString() + " " + date.toLocaleTimeString()
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading workflow...</span>
      </div>
    )
  }

  return (
    <AuthGate>
      <div className="container mx-auto py-6 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button variant="ghost" size="sm" onClick={() => router.push("/workflows")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Workflows
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => router.push(`/workflow-builder/${workflow.id}`)}>
              <PenSquare className="mr-2 h-4 w-4" />
              Edit Workflow
            </Button>
            <Button size="sm" onClick={handleExecuteWorkflow} disabled={isExecuting || workflow.nodes.length === 0}>
              {isExecuting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Executing...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-4 w-4" />
                  Execute Workflow
                </>
              )}
            </Button>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{workflow.name}</CardTitle>
                <CardDescription>{workflow.description}</CardDescription>
              </div>
              <Badge variant={workflow.is_public ? "default" : "outline"}>
                {workflow.is_public ? (
                  <>
                    <Eye className="mr-1 h-3 w-3" /> Public
                  </>
                ) : (
                  <>
                    <EyeOff className="mr-1 h-3 w-3" /> Private
                  </>
                )}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="mr-1 h-4 w-4" />
                Created: {formatDate(workflow.created_at)}
              </div>
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="mr-1 h-4 w-4" />
                Updated: {formatDate(workflow.updated_at)}
              </div>
            </div>
            {workflow.tags && workflow.tags.length > 0 && (
              <div className="flex items-center gap-2 mt-2">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-wrap gap-1">
                  {workflow.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardHeader>
        </Card>

        <Tabs defaultValue="diagram" className="mb-6">
          <TabsList>
            <TabsTrigger value="diagram">Workflow Diagram</TabsTrigger>
            <TabsTrigger value="executions">Execution History</TabsTrigger>
          </TabsList>
          <TabsContent value="diagram" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <div className="h-[600px] w-full">
                  <FlowCanvas
                    nodes={workflow.nodes}
                    edges={workflow.edges}
                    setNodes={() => {}}
                    setEdges={() => {}}
                    readOnly={true}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="executions" className="mt-4">
            <Card>
              <CardContent className="p-6">
                <ExecutionLogsList logs={executions} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {executionId && (
        <ExecutionResultsDialog
          open={isExecutionResultsOpen}
          onOpenChange={setIsExecutionResultsOpen}
          executionId={executionId}
          workflowId={workflow.id}
        />
      )}
    </AuthGate>
  )
}
