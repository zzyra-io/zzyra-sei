"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Loader2, RefreshCw, CheckCircle, XCircle, AlertCircle, Clock } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface ExecutionLogsListProps {
  logs: any[]
  workflowId: string
}

export function ExecutionLogsList({ logs: initialLogs, workflowId }: ExecutionLogsListProps) {
  const supabase = createClient()
  const [logs, setLogs] = useState<any[]>(initialLogs || [])
  const [isLoading, setIsLoading] = useState(false)
  const [expandedLog, setExpandedLog] = useState<string | null>(null)
  const [nodeExecutions, setNodeExecutions] = useState<Record<string, any[]>>({})

  // Real-time subscription for workflow_executions
  useEffect(() => {
    const execSub = supabase
      .channel('realtime-workflow-execs')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workflow_executions', filter: `workflow_id=eq.${workflowId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setLogs((prev) => [payload.new, ...prev])
        } else if (payload.eventType === 'UPDATE') {
          setLogs((prev) => prev.map((l) => (l.id === payload.new.id ? payload.new : l)))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(execSub) }
  }, [workflowId])

  // Real-time subscription for node_executions of expanded log
  useEffect(() => {
    if (!expandedLog) return
    const nodeSub = supabase
      .channel('realtime-node-execs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'node_executions', filter: `execution_id=eq.${expandedLog}` }, (payload) => {
        setNodeExecutions((prev) => ({
          ...prev,
          [payload.new.execution_id]: [...(prev[payload.new.execution_id] || []), payload.new],
        }))
      })
      .subscribe()
    return () => { supabase.removeChannel(nodeSub) }
  }, [expandedLog])

  const fetchLogs = async () => {
    try {
      setIsLoading(true)

      const { data, error } = await supabase
        .from("workflow_executions")
        .select("*")
        .eq("workflow_id", workflowId)
        .order("started_at", { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch execution logs: ${error.message}`)
      }

      setLogs(data || [])

      // If there's a currently expanded log, fetch its node executions
      if (expandedLog) {
        fetchNodeExecutions(expandedLog)
      }
    } catch (error) {
      console.error("Error fetching logs:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchNodeExecutions = async (executionId: string) => {
    try {
      const { data, error } = await supabase
        .from("node_executions")
        .select("*")
        .eq("execution_id", executionId)
        .order("started_at", { ascending: true })

      if (error) {
        throw new Error(`Failed to fetch node executions: ${error.message}`)
      }

      setNodeExecutions((prev) => ({
        ...prev,
        [executionId]: data || [],
      }))
    } catch (error) {
      console.error("Error fetching node executions:", error)
    }
  }

  const handleAccordionChange = (value: string) => {
    setExpandedLog(value === expandedLog ? null : value)

    if (value !== expandedLog && !nodeExecutions[value]) {
      fetchNodeExecutions(value)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "running":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            Completed
          </Badge>
        )
      case "failed":
        return (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
            Failed
          </Badge>
        )
      case "running":
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            Running
          </Badge>
        )
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      return `${date.toLocaleString()} (${formatDistanceToNow(date, { addSuffix: true })})`
    } catch (e) {
      return dateString
    }
  }

  if (logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No execution logs yet</h3>
        <p className="text-muted-foreground text-center mb-6">Execute your workflow to see logs appear here.</p>
        <Button onClick={fetchLogs} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Execution History</h2>
        <Button onClick={fetchLogs} variant="outline" size="sm" disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
      </div>

      <div className="space-y-4">
        {logs.map((log) => (
          <Card key={log.id}>
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    {getStatusIcon(log.status)}
                    Execution {log.id.substring(0, 8)}
                  </CardTitle>
                  <CardDescription>Started: {formatDate(log.started_at)}</CardDescription>
                </div>
                {getStatusBadge(log.status)}
              </div>
            </CardHeader>

            <Accordion
              type="single"
              collapsible
              value={expandedLog === log.id ? log.id : ""}
              onValueChange={handleAccordionChange}
            >
              <AccordionItem value={log.id} className="border-0">
                <AccordionTrigger className="py-2 px-6">View Details</AccordionTrigger>
                <AccordionContent>
                  <CardContent className="pt-0">
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm font-medium">Started</p>
                          <p className="text-sm text-muted-foreground">{formatDate(log.started_at)}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Completed</p>
                          <p className="text-sm text-muted-foreground">
                            {log.completed_at ? formatDate(log.completed_at) : "Not completed"}
                          </p>
                        </div>
                      </div>

                      {log.error && (
                        <div className="bg-red-50 border border-red-200 rounded-md p-3">
                          <p className="text-sm font-medium text-red-800">Error</p>
                          <p className="text-sm text-red-700">{log.error}</p>
                        </div>
                      )}

                      <div>
                        <p className="text-sm font-medium mb-2">Node Executions</p>
                        {!nodeExecutions[log.id] ? (
                          <div className="flex items-center justify-center p-4">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            <span className="text-sm text-muted-foreground">Loading node executions...</span>
                          </div>
                        ) : nodeExecutions[log.id].length === 0 ? (
                          <p className="text-sm text-muted-foreground">No node executions found</p>
                        ) : (
                          <div className="border rounded-md divide-y">
                            {nodeExecutions[log.id].map((nodeExec) => (
                              <div key={nodeExec.id} className="p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {getStatusIcon(nodeExec.status)}
                                    <span className="text-sm font-medium">Node: {nodeExec.node_id}</span>
                                  </div>
                                  {getStatusBadge(nodeExec.status)}
                                </div>

                                <p className="text-xs text-muted-foreground mt-1">
                                  {formatDate(nodeExec.completed_at || nodeExec.started_at)}
                                </p>

                                {nodeExec.output_data && (
                                  <div className="mt-2">
                                    <Accordion type="single" collapsible>
                                      <AccordionItem value="output">
                                        <AccordionTrigger className="text-xs py-1">Output Data</AccordionTrigger>
                                        <AccordionContent>
                                          <pre className="text-xs bg-muted p-2 rounded-md overflow-auto max-h-40">
                                            {JSON.stringify(nodeExec.output_data, null, 2)}
                                          </pre>
                                        </AccordionContent>
                                      </AccordionItem>
                                    </Accordion>
                                  </div>
                                )}

                                {nodeExec.error && (
                                  <div className="mt-2 bg-red-50 border border-red-200 rounded-md p-2">
                                    <p className="text-xs text-red-700">{nodeExec.error}</p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <CardFooter className="pt-0">
              <div className="w-full flex justify-between text-xs text-muted-foreground">
                <span>
                  Duration:{" "}
                  {log.completed_at
                    ? formatDistanceToNow(new Date(log.started_at), { end: new Date(log.completed_at) })
                    : "In progress"}
                </span>
                <span>ID: {log.id}</span>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
