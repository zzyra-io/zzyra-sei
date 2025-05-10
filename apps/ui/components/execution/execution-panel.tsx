"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Play, AlertCircle, CheckCircle, Clock, Loader2, Pause, RotateCw } from "lucide-react"
import { startExecution, resumeExecution, pauseExecution, retryExecution } from "@/app/actions/execution-actions"
import { ExecutionHistory } from "@/components/execution/execution-history"
import { ExecutionLogs } from "@/components/execution/execution-logs"
import { ExecutionNodeExecutions } from "@/components/execution/execution-node-executions"
import { toast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"

interface ExecutionPanelProps {
  workflowId: string
  executions: any[]
  activeExecutionId?: string
}

export function ExecutionPanel({ workflowId, executions, activeExecutionId }: ExecutionPanelProps) {
  const [isExecuting, setIsExecuting] = useState(false)
  const [isResuming, setIsResuming] = useState(false)
  const [isPausing, setIsPausing] = useState(false)
  const [isRetrying, setIsRetrying] = useState(false)
  const [currentExecutionId, setCurrentExecutionId] = useState<string | undefined>(activeExecutionId)
  const router = useRouter()

  // Set up real-time subscription to execution updates
  useEffect(() => {
    if (!currentExecutionId) return
    
    const supabase = createClient()
    const channel = supabase
      .channel(`execution-${currentExecutionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'workflow_executions', filter: `id=eq.${currentExecutionId}` },
        () => {
          // Trigger a refresh when execution is updated
          router.refresh()
        }
      )
      .subscribe()
      
    return () => {
      channel.unsubscribe()
    }
  }, [currentExecutionId, router])
  
  // Get the active execution
  const activeExecution = currentExecutionId
    ? executions.find((execution) => execution.id === currentExecutionId)
    : undefined
    
  // Poll for updates every 3 seconds for running executions
  useEffect(() => {
    if (!currentExecutionId) return
    if (!activeExecution || activeExecution.status !== 'running') return
    
    const interval = setInterval(() => {
      router.refresh()
    }, 3000)
    
    return () => clearInterval(interval)
  }, [currentExecutionId, router, activeExecution])

  async function handleExecute() {
    setIsExecuting(true)
    try {
      const result = await startExecution(workflowId)

      if (result.error) {
        toast({
          title: "Execution failed",
          description: result.error,
          variant: "destructive",
        })
        return
      }

      setCurrentExecutionId(result.executionId)
      toast({
        title: "Execution started",
        description: "Your workflow is now running.",
      })

      // Refresh to show the new execution
      router.refresh()
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsExecuting(false)
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-muted">
            <Clock className="h-3 w-3 mr-1" /> Pending
          </Badge>
        )
      case "running":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Running
          </Badge>
        )
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" /> Completed
          </Badge>
        )
      case "failed":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            <AlertCircle className="h-3 w-3 mr-1" /> Failed
          </Badge>
        )
      case "paused":
        return (
          <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
            <AlertCircle className="h-3 w-3 mr-1" /> Paused
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Execution</span>
          <Button onClick={handleExecute} disabled={isExecuting}>
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
        </CardTitle>
        <CardDescription>Run and monitor your workflow execution</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow overflow-auto">
        <Tabs defaultValue="current" className="h-full flex flex-col">
          <TabsList>
            <TabsTrigger value="current">Current Execution</TabsTrigger>
            <TabsTrigger value="history">Execution History</TabsTrigger>
          </TabsList>
          <TabsContent value="current" className="flex-grow">
            {activeExecution ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium">Execution ID</p>
                    <p className="text-xs text-muted-foreground">{activeExecution.id}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(activeExecution.status)}
                    {activeExecution.status === 'running' && (
                      <Button size="sm" variant="outline" onClick={async () => {
                        setIsPausing(true)
                        try {
                          const res = await pauseExecution(activeExecution.id)
                          if (res.error) throw new Error(res.error)
                          toast({ title: 'Execution paused' })
                          router.refresh()
                        } catch (err) {
                          const errorMessage = err instanceof Error ? err.message : 'Unknown error'
                          toast({ title: 'Pause failed', description: errorMessage, variant: 'destructive' })
                        } finally { setIsPausing(false) }
                      }} disabled={isPausing}>
                        {isPausing ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            Pausing...
                          </>
                        ) : (
                          <>
                            <Pause className="mr-2 h-3 w-3" />
                            Pause
                          </>
                        )}
                      </Button>
                    )}
                    
                    {activeExecution.status === 'paused' && (
                      <Button size="sm" variant="outline" onClick={async () => {
                        setIsResuming(true)
                        try {
                          const res = await resumeExecution(activeExecution.id)
                          if (res.error) throw new Error(res.error)
                          toast({ title: 'Execution resumed' })
                          router.refresh()
                        } catch (err) {
                          const errorMessage = err instanceof Error ? err.message : 'Unknown error'
                          toast({ title: 'Resume failed', description: errorMessage, variant: 'destructive' })
                        } finally { setIsResuming(false) }
                      }} disabled={isResuming}>
                        {isResuming ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            Resuming...
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-3 w-3" />
                            Resume
                          </>
                        )}
                      </Button>
                    )}
                    
                    {activeExecution.status === 'failed' && (
                      <Button size="sm" variant="outline" onClick={async () => {
                        setIsRetrying(true)
                        try {
                          const res = await retryExecution(activeExecution.id, workflowId)
                          if (res.error) throw new Error(res.error)
                          toast({ title: 'Execution retry initiated' })
                          router.refresh()
                        } catch (err) {
                          const errorMessage = err instanceof Error ? err.message : 'Unknown error'
                          toast({ title: 'Retry failed', description: errorMessage, variant: 'destructive' })
                        } finally { setIsRetrying(false) }
                      }} disabled={isRetrying}>
                        {isRetrying ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            Retrying...
                          </>
                        ) : (
                          <>
                            <RotateCw className="mr-2 h-3 w-3" />
                            Retry
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Started</p>
                    <p className="text-xs text-muted-foreground">
                      {activeExecution.started_at
                        ? new Date(activeExecution.started_at).toLocaleString()
                        : '-'}
                    </p>
                  </div>
                  {activeExecution.completed_at && (
                    <div>
                      <p className="text-sm font-medium">Completed</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activeExecution.completed_at).toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                {activeExecution.status === "failed" && activeExecution.result?.message && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{activeExecution.result.message}</AlertDescription>
                  </Alert>
                )}

                <div className="mt-4 space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Node Executions</h4>
                    <ExecutionNodeExecutions executionId={activeExecution.id} />
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">Execution Logs</h4>
                    <ExecutionLogs executionId={activeExecution.id} />
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <p className="text-muted-foreground">No active execution</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Click "Execute Workflow" to start a new execution
                  </p>
                </div>
              </div>
            )}
          </TabsContent>
          <TabsContent value="history" className="flex-grow">
            <ExecutionHistory
              workflowId={workflowId}
              executions={executions}
              onSelectExecution={(id) => {
                setCurrentExecutionId(id)
                // Switch back to current tab
                const currentTab = document.querySelector('[data-value="current"]') as HTMLElement
                if (currentTab) currentTab.click()
              }}
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
