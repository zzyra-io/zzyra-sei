"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AuthGate } from "@/components/auth-gate"
import { DashboardHeader } from "@/components/dashboard-header"
import { ExecutionLogsList } from "@/components/execution-logs-list"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { workflowService } from "@/lib/services/workflow-service"
import { executionService } from "@/lib/services/execution-service"
import type { Workflow } from "@/lib/supabase/schema"
import type { ExecutionLog } from "@/lib/services/execution-service"
import { ArrowLeft, Play, Settings, Loader2 } from "lucide-react"

interface WorkflowDetailPageProps {
  params: {
    id: string
  }
}

export default function WorkflowDetailPage({ params }: WorkflowDetailPageProps) {
  const [workflow, setWorkflow] = useState<Workflow | null>(null)
  const [executionLogs, setExecutionLogs] = useState<ExecutionLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExecuting, setIsExecuting] = useState(false)
  const [activeTab, setActiveTab] = useState("overview")
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        // First fetch the workflow data
        const workflowData = await workflowService.getWorkflow(params.id)
        setWorkflow(workflowData)

        // Then try to fetch execution logs, but don't fail if they can't be fetched
        try {
          const logsData = await executionService.getExecutionLogs(params.id)
          setExecutionLogs(logsData)
        } catch (logsError) {
          console.error("Error fetching execution logs:", logsError)
          // Set empty logs array if there's an error
          setExecutionLogs([])
          // Show a toast notification about the logs error
          toast({
            title: "Warning",
            description: "Could not load execution history. Some features may be limited.",
            variant: "warning",
          })
        }
      } catch (error) {
        toast({
          title: "Error fetching workflow",
          description: "Failed to load workflow details. Please try again.",
          variant: "destructive",
        })
        router.push("/dashboard")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [params.id, toast, router])

  const handleExecute = async () => {
    try {
      setIsExecuting(true)
      const executionLog = await executionService.executeWorkflow(params.id)

      // Update the execution logs list
      setExecutionLogs([executionLog, ...executionLogs])

      toast({
        title: "Workflow executed",
        description: "Your workflow has been executed successfully.",
      })

      // Switch to the history tab to show the execution result
      setActiveTab("history")
    } catch (error) {
      toast({
        title: "Execution failed",
        description: error instanceof Error ? error.message : "Failed to execute workflow. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsExecuting(false)
    }
  }

  const handleEdit = () => {
    router.push(`/builder/${params.id}`)
  }

  if (isLoading) {
    return (
      <AuthGate>
        <div className="flex min-h-screen flex-col">
          <DashboardHeader />
          <main className="flex flex-1 items-center justify-center bg-muted/30">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </main>
        </div>
      </AuthGate>
    )
  }

  if (!workflow) {
    return (
      <AuthGate>
        <div className="flex min-h-screen flex-col">
          <DashboardHeader />
          <main className="flex-1 bg-muted/30 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">
              <div className="mb-6 flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </div>
              <div className="rounded-lg border bg-card p-8 text-center">
                <h2 className="text-xl font-semibold">Workflow not found</h2>
                <p className="mt-2 text-muted-foreground">
                  The workflow you're looking for doesn't exist or you don't have permission to view it.
                </p>
                <Button className="mt-4" onClick={() => router.push("/dashboard")}>
                  Return to Dashboard
                </Button>
              </div>
            </div>
          </main>
        </div>
      </AuthGate>
    )
  }

  return (
    <AuthGate>
      <div className="flex min-h-screen flex-col">
        <DashboardHeader />
        <main className="flex-1 bg-muted/30 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard")}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <h1 className="text-2xl font-bold tracking-tight">{workflow.name}</h1>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleEdit}>
                  <Settings className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button onClick={handleExecute} disabled={isExecuting}>
                  {isExecuting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Execute
                    </>
                  )}
                </Button>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="history">Execution History</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Workflow Details</CardTitle>
                    <CardDescription>Created on {new Date(workflow.created_at).toLocaleDateString()}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium">Description</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {workflow.description || "No description provided."}
                        </p>
                      </div>
                      {workflow.tags && workflow.tags.length > 0 && (
                        <div>
                          <h3 className="text-sm font-medium">Tags</h3>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {workflow.tags.map((tag) => (
                              <div
                                key={tag}
                                className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground"
                              >
                                {tag}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div>
                        <h3 className="text-sm font-medium">Workflow Structure</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          This workflow contains {workflow.nodes.length} nodes and {workflow.edges.length} connections.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Execution Summary</CardTitle>
                    <CardDescription>Recent execution statistics</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 sm:grid-cols-3">
                      <div className="rounded-lg border p-4">
                        <div className="text-sm font-medium text-muted-foreground">Total Executions</div>
                        <div className="mt-1 text-2xl font-bold">{executionLogs.length}</div>
                      </div>
                      <div className="rounded-lg border p-4">
                        <div className="text-sm font-medium text-muted-foreground">Successful</div>
                        <div className="mt-1 text-2xl font-bold text-green-500">
                          {executionLogs.filter((log) => log.status === "completed").length}
                        </div>
                      </div>
                      <div className="rounded-lg border p-4">
                        <div className="text-sm font-medium text-muted-foreground">Failed</div>
                        <div className="mt-1 text-2xl font-bold text-red-500">
                          {executionLogs.filter((log) => log.status === "failed").length}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history">
                <Card>
                  <CardHeader>
                    <CardTitle>Execution History</CardTitle>
                    <CardDescription>View the history of all executions for this workflow</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ExecutionLogsList logs={executionLogs} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </AuthGate>
  )
}
