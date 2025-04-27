"use client"

import { useEffect, useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/types/supabase"

type NodeExecutionWithLogs = Database["public"]["Tables"]["node_executions"]["Row"] & {
  logs?: Database["public"]["Tables"]["node_logs"]["Row"][]
}

type WorkflowExecutionRow = Database["public"]["Tables"]["workflow_executions"]["Row"]

interface ExecutionNodeExecutionsProps {
  executionId: string
}

export function ExecutionNodeExecutions({ executionId }: ExecutionNodeExecutionsProps) {
  const [nodes, setNodes] = useState<NodeExecutionWithLogs[]>([])
  const [execution, setExecution] = useState<WorkflowExecutionRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()

    const nodeChannel = supabase
      .channel(`node-exec-${executionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'node_executions', filter: `execution_id=eq.${executionId}` },
        (payload: { new: Record<string, unknown> }) => {
          const rec = payload.new as NodeExecutionWithLogs
          setNodes(prev => prev.map(n => n.id === rec.id ? { ...rec, logs: n.logs } : n))
        }
      )
      .subscribe()

    const logChannel = supabase
      .channel(`node-logs-${executionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'node_logs', filter: `execution_id=eq.${executionId}` },
        (payload: { new: Record<string, unknown> }) => {
          const log = payload.new as Database["public"]["Tables"]["node_logs"]["Row"]
          // Prevent infinite loop by checking if log already exists
          setNodes(prev => prev.map(n => {
            if (n.node_id === log.node_id) {
              // Check if this log already exists in the array
              const logExists = (n.logs ?? []).some(existingLog => {
                return existingLog && typeof existingLog === 'object' && 'id' in existingLog && existingLog.id === log.id
              })
              if (logExists) return n
              
              // Add the new log
              return { ...n, logs: [...(n.logs ?? []), log] }
            }
            return n
          }))
        }
      )
      .subscribe()

    const execChannel = supabase
      .channel(`workflow-exec-${executionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'workflow_executions', filter: `id=eq.${executionId}` },
        (payload: { new: Record<string, unknown> }) => {
          const newExecution = payload.new as Partial<WorkflowExecutionRow>
          setExecution(prev => prev ? { ...prev, ...newExecution } : newExecution as WorkflowExecutionRow)
        }
      )
      .subscribe()

    async function loadInitial() {
      setLoading(true)
      try {
        const { data: execData, error: execErr } = await supabase
          .from('workflow_executions')
          .select('*')
          .eq('id', executionId)
          .single()
        if (execErr) throw execErr
        setExecution(execData as WorkflowExecutionRow)

        // Fetch node executions
        const { data: nodeData, error: nodeErr } = await supabase
          .from('node_executions')
          .select('*')
          .eq('execution_id', executionId)
          .order('started_at', { ascending: true })
        if (nodeErr) throw nodeErr
        
        // Initialize nodes with empty logs array
        const nodesWithEmptyLogs = nodeData?.map(n => ({ ...n, logs: [] })) ?? []
        setNodes(nodesWithEmptyLogs)
        
        // Fetch logs for each node
        if (nodesWithEmptyLogs.length > 0) {
          const { data: logsData, error: logsErr } = await supabase
            .from('node_logs')
            .select('*')
            .eq('execution_id', executionId)
            .order('timestamp', { ascending: true })
          
          if (!logsErr && logsData) {
            // Group logs by node_id
            const logsByNode = logsData.reduce((acc, log) => {
              if (!acc[log.node_id]) acc[log.node_id] = []
              acc[log.node_id].push(log)
              return acc
            }, {} as Record<string, Database["public"]["Tables"]["node_logs"]["Row"][]>)
            
            // Update nodes with their logs
            setNodes(nodesWithEmptyLogs.map(node => ({
              ...node,
              logs: logsByNode[node.node_id] || []
            })))
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    }

    loadInitial()

    return () => {
      nodeChannel.unsubscribe()
      logChannel.unsubscribe()
      execChannel.unsubscribe()
    }
  }, [executionId])

  if (loading) return <div className="text-center py-4">Loading execution...</div>
  if (error) return <div className="text-center py-4 text-red-500">Error: {error}</div>
  if (!execution) return <div className="text-center py-4">Execution not found</div>

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case 'running':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Running</Badge>
      case 'pending':
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Pending</Badge>
      case 'paused':
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Paused</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <>
      <div className="mb-4 flex items-center space-x-2">
        <span className="font-semibold">Execution Status:</span>
        <Badge>{execution.status.charAt(0).toUpperCase() + execution.status.slice(1)}</Badge>
      </div>
      <ScrollArea className="h-[300px] border rounded-md p-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="p-1">Node</th>
              <th className="p-1">Status</th>
              <th className="p-1">Started</th>
              <th className="p-1">Completed</th>
              <th className="p-1">Details</th>
            </tr>
          </thead>
          <tbody>
            {nodes.map(n => (
              <tr key={n.id} className="hover:bg-muted/50">
                <td className="p-1 font-medium">{n.node_id}</td>
                <td className="p-1 flex items-center gap-1">{getStatusIcon(n.status)}</td>
                <td className="p-1">{n.started_at ? new Date(n.started_at).toLocaleTimeString() : '-'}</td>
                <td className="p-1">{n.completed_at ? new Date(n.completed_at).toLocaleTimeString() : '-'}</td>
                <td className="p-1">
                  {n.status === 'failed' && <pre className="text-xs text-red-500">{n.error}</pre>}
                  {n.status === 'completed' && n.output_data && (
                    <pre className="text-xs bg-muted p-1 mt-1 rounded overflow-x-auto">
                      {JSON.stringify(n.output_data, null, 2)}
                    </pre>
                  )}
                  {n.logs && n.logs.length > 0 ? (
                    <div className="mt-2 border-t pt-1">
                      <div className="text-xs font-medium mb-1">Logs ({n.logs.length})</div>
                      <div className="max-h-[150px] overflow-y-auto">
                        {n.logs.map(log => (
                          <div key={log.id} className="text-xs mb-1 border-l-2 border-blue-300 pl-2">
                            <span className="text-muted-foreground">{new Date(log.timestamp).toLocaleTimeString()}: </span>
                            {log.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
    </>
  )
}
