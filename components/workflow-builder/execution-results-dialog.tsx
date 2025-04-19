"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react"
import { getWorkflowExecutions } from "@/app/actions/workflow-actions"
import { ExecutionLogsList } from "@/components/execution-logs-list"

interface ExecutionResultsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  executionId: string
  workflowId: string
}

export function ExecutionResultsDialog({ open, onOpenChange, executionId, workflowId }: ExecutionResultsDialogProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [executions, setExecutions] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      loadExecutions()
    }
  }, [open, executionId, workflowId])

  const loadExecutions = async () => {
    setIsLoading(true)
    try {
      const result = await getWorkflowExecutions(workflowId)
      if (result.error) {
        setError(result.error)
      } else {
        setExecutions(result.executions || [])
      }
    } catch (err: any) {
      setError(err.message || "Failed to load execution results")
    } finally {
      setIsLoading(false)
    }
  }

  // Find the current execution
  const currentExecution = executions.find((exec) => exec.id === executionId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Workflow Execution Results</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Loading execution results...</span>
          </div>
        ) : error ? (
          <div className="flex items-center text-destructive py-8">
            <AlertCircle className="h-6 w-6 mr-2" />
            <span>{error}</span>
          </div>
        ) : (
          <Tabs defaultValue="current" className="flex-1 flex flex-col">
            <TabsList>
              <TabsTrigger value="current">Current Execution</TabsTrigger>
              <TabsTrigger value="history">Execution History</TabsTrigger>
            </TabsList>
            <TabsContent value="current" className="flex-1 overflow-hidden">
              {currentExecution ? (
                <div className="space-y-4">
                  <div className="flex items-center">
                    <div className="mr-2">
                      {currentExecution.status === "completed" ? (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      ) : currentExecution.status === "failed" ? (
                        <XCircle className="h-5 w-5 text-red-500" />
                      ) : (
                        <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">
                        Status: <span className="capitalize">{currentExecution.status}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Started: {new Date(currentExecution.started_at).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium mb-2">Execution Logs</h3>
                    <ScrollArea className="h-[300px] rounded-md border">
                      <div className="p-4 font-mono text-sm">
                        {currentExecution.logs.map((log: any, index: number) => (
                          <div
                            key={index}
                            className={`mb-1 ${
                              log.level === "error" ? "text-red-500" : log.level === "warning" ? "text-amber-500" : ""
                            }`}
                          >
                            [{new Date(log.timestamp).toLocaleTimeString()}] [{log.node_id}] {log.message}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>

                  {currentExecution.error && (
                    <div>
                      <h3 className="text-sm font-medium mb-2 text-red-500">Error</h3>
                      <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                        {currentExecution.error}
                      </div>
                    </div>
                  )}

                  {Object.keys(currentExecution.results).length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">Results</h3>
                      <ScrollArea className="h-[200px] rounded-md border">
                        <pre className="p-4 text-sm">{JSON.stringify(currentExecution.results, null, 2)}</pre>
                      </ScrollArea>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  No execution data found
                </div>
              )}
            </TabsContent>
            <TabsContent value="history" className="flex-1 overflow-hidden">
              <ExecutionLogsList logs={executions} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
