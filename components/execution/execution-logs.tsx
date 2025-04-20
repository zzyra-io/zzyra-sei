"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AlertCircle, Info } from "lucide-react"

interface ExecutionLog {
  id: string
  execution_id: string
  node_id: string
  level: "info" | "warning" | "error"
  message: string
  data?: any
  timestamp: string
}

interface ExecutionLogsProps {
  executionId: string
}

export function ExecutionLogs({ executionId }: ExecutionLogsProps) {
  const [logs, setLogs] = useState<ExecutionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    async function fetchLogs() {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from("execution_logs")
          .select("*")
          .eq("execution_id", executionId)
          .order("timestamp", { ascending: true })

        if (error) {
          throw error
        }

        setLogs(data || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchLogs()

    // Set up real-time subscription for new logs
    const subscription = supabase
      .channel(`execution-logs-${executionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "execution_logs",
          filter: `execution_id=eq.${executionId}`,
        },
        (payload) => {
          setLogs((current) => [...current, payload.new as ExecutionLog])
        },
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [executionId, supabase])

  function getLogIcon(level: string) {
    switch (level) {
      case "info":
        return <Info className="h-4 w-4 text-blue-500 flex-shrink-0" />
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
      default:
        return <Info className="h-4 w-4 text-muted-foreground flex-shrink-0" />
    }
  }

  if (loading) {
    return <div className="text-center py-4">Loading logs...</div>
  }

  if (error) {
    return <div className="text-center py-4 text-red-500">Error loading logs: {error}</div>
  }

  if (!logs.length) {
    return <div className="text-center py-4 text-muted-foreground">No logs available</div>
  }

  return (
    <ScrollArea className="h-[300px] border rounded-md p-2">
      <div className="space-y-2">
        {logs.map((log) => (
          <div key={log.id} className="flex gap-2 text-sm p-2 hover:bg-muted/50 rounded-sm">
            {getLogIcon(log.level)}
            <div className="flex-grow">
              <div className="flex justify-between">
                <span className="font-medium">{log.node_id}</span>
                <span className="text-xs text-muted-foreground">{new Date(log.timestamp).toLocaleTimeString()}</span>
              </div>
              <p>{log.message}</p>
              {log.data && (
                <pre className="text-xs bg-muted p-1 mt-1 rounded overflow-x-auto">
                  {JSON.stringify(log.data, null, 2)}
                </pre>
              )}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  )
}
