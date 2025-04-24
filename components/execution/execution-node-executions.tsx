"use client"

import { useEffect, useState } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { LucideIcon, CheckCircle, AlertCircle } from "lucide-react"

interface NodeExecution {
  id: string
  execution_id: string
  node_id: string
  status: string
  output_data?: any
  error?: string
  started_at?: string
  completed_at?: string
}

interface ExecutionNodeExecutionsProps {
  executionId: string
}

export function ExecutionNodeExecutions({ executionId }: ExecutionNodeExecutionsProps) {
  const [nodes, setNodes] = useState<NodeExecution[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let unsubscribed = false;

    async function fetchNodes() {
      try {
        setLoading(true)
        const res = await fetch(`/api/executions/${executionId}/node-executions`)
        const json = await res.json()
        if (!res.ok) throw new Error(json.error || 'Failed to fetch node executions')
        if (!unsubscribed) setNodes(json.nodes || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchNodes()

    // Listen for real-time node updates via SSE
    eventSource = new EventSource(`/api/executions/${executionId}/events`)
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        // Update only the affected node
        setNodes((prev) => {
          const idx = prev.findIndex(n => n.node_id === data.nodeId)
          if (idx !== -1) {
            const updated = [...prev]
            updated[idx] = {
              ...updated[idx],
              status: data.status,
              error: data.error || null,
              output_data: data.output || null,
              started_at: data.status === 'running' ? data.updatedAt : updated[idx].started_at,
              completed_at: data.status === 'completed' || data.status === 'failed' ? data.updatedAt : updated[idx].completed_at,
            }
            return updated
          }
          // If node not found, append
          return [
            ...prev,
            {
              id: data.nodeId,
              execution_id: executionId,
              node_id: data.nodeId,
              status: data.status,
              error: data.error || null,
              output_data: data.output || null,
              started_at: data.status === 'running' ? data.updatedAt : null,
              completed_at: data.status === 'completed' || data.status === 'failed' ? data.updatedAt : null,
            }
          ]
        })
      } catch (e) {
        // Ignore parse errors
      }
    }
    eventSource.onerror = () => {
      eventSource?.close()
    }
    return () => {
      unsubscribed = true;
      eventSource?.close()
    }
  }, [executionId])

  if (loading) return <div className="text-center py-4">Loading node executions...</div>
  if (error) return <div className="text-center py-4 text-red-500">Error: {error}</div>

  function getStatusIcon(status: string) {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      case "running":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Running</Badge>
      case "pending":
        return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Pending</Badge>
      case "paused":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Paused</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
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
          {nodes.map((n) => (
            <tr key={n.id} className="hover:bg-muted/50">
              <td className="p-1 font-medium">{n.node_id}</td>
              <td className="p-1 flex items-center gap-1">{getStatusIcon(n.status)}</td>
              <td className="p-1">{n.started_at ? new Date(n.started_at).toLocaleTimeString() : '-'}</td>
              <td className="p-1">{n.completed_at ? new Date(n.completed_at).toLocaleTimeString() : '-'}</td>
              <td className="p-1">
                {n.status === 'failed' && <pre className="text-xs text-red-500">{n.error}</pre>}
                {n.status === 'completed' && n.output_data && <pre className="text-xs">{JSON.stringify(n.output_data, null, 2)}</pre>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </ScrollArea>
  )
}
