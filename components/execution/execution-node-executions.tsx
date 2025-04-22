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
    async function fetchNodes() {
      try {
        setLoading(true)
        const res = await fetch(`/api/executions/${executionId}/node-executions`)
        console.log('fetchNodes response status:', res.status)
        const json = await res.json()
        console.log('fetchNodes json payload:', json)
        if (!res.ok) throw new Error(json.error || 'Failed to fetch node executions')
        setNodes(json.nodes || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchNodes()
    const interval = setInterval(fetchNodes, 2000)
    return () => clearInterval(interval)
  }, [executionId])

  if (loading) return <div className="text-center py-4">Loading node executions...</div>
  if (error) return <div className="text-center py-4 text-red-500">Error: {error}</div>
  if (!nodes.length) return <div className="text-center py-4 text-muted-foreground">No node executions found</div>

  function getStatusIcon(status: string) {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />
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
