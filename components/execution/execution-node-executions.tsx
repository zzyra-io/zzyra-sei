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
        (payload) => {
          const rec = payload.new
          setNodes(prev => prev.map(n => n.id === rec.id ? { ...rec, logs: n.logs } : n))
        }
      )
      .subscribe()

    const logChannel = supabase
      .channel(`node-logs-${executionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'node_logs', filter: `execution_id=eq.${executionId}` },
        (payload) => {
          const log = payload.new
          setNodes(prev => prev.map(n =>
            n.node_id === log.node_id
              ? { ...n, logs: [...(n.logs ?? []), log] }
              : n
          ))
        }
      )
      .subscribe()

    const execChannel = supabase
      .channel(`workflow-exec-${executionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'workflow_executions', filter: `id=eq.${executionId}` },
        (payload) => setExecution(prev => prev ? { ...prev, ...payload.new } : payload.new)
      )
      .subscribe()

    async function loadInitial() {
      setLoading(true)
      try {
        const { data: execData, error: execErr } = await supabase
          .from('workflow_executions')
          .select('id, status, started_at, completed_at, error')
          .eq('id', executionId)
          .single()
        if (execErr) throw execErr
        setExecution(execData)

        const { data: nodeData, error: nodeErr } = await supabase
          .from('node_executions')
          .select('*')
          .eq('execution_id', executionId)
          .order('started_at', { ascending: true })
        if (nodeErr) throw nodeErr
        setNodes(nodeData?.map(n => ({ ...n, logs: [] })) ?? [])
      } catch (err: any) {
        setError(err.message)
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
                  {n.status === 'completed' && n.output_data && <pre className="text-xs">{JSON.stringify(n.output_data, null, 2)}</pre>}
                  {n.logs?.map(log => (
                    <pre key={log.id} className="text-xs">{log.message}</pre>
                  ))}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </ScrollArea>
    </>
  )
}
