"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { Info, AlertCircle, RefreshCw, Loader2 } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"

interface ExecutionLog {
  id: string
  execution_id: string
  node_id: string
  level: "info" | "warning" | "error"
  message: string
  data?: Record<string, unknown>
  timestamp: string
}

interface ExecutionLogsProps {
  executionId: string
}

export function ExecutionLogs({ executionId }: ExecutionLogsProps) {
  const [logs, setLogs] = useState<ExecutionLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const logsPerPage = 50
  const supabase = createClient()

  // Validate UUID format to prevent 400 Bad Request errors
  const isValidUUID = useCallback((id: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(id)
  }, [])

  const fetchLogs = useCallback(async (pageNumber: number = 1) => {
    if (!executionId || !isValidUUID(executionId)) {
      setError('Invalid execution ID')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Validate UUID before making the request
      if (!isValidUUID(executionId)) {
        throw new Error("Invalid execution ID format")
      }
      
      // Calculate pagination range
      const from = (pageNumber - 1) * logsPerPage
      const to = from + logsPerPage - 1
      
      const { data, error, count } = await supabase
        .from("execution_logs")
        .select("*", { count: 'exact' })
        .eq("execution_id", executionId)
        .order("timestamp", { ascending: true })
        .range(from, to)

      if (error) {
        throw error
      }

      // Check if we have more pages
      setHasMore(count ? count > pageNumber * logsPerPage : false)
      
      // Convert data to proper ExecutionLog type
      const typedLogs = (data || []).map((log) => ({
        id: log.id,
        execution_id: log.execution_id,
        node_id: log.node_id,
        level: log.level as "info" | "warning" | "error",
        message: log.message,
        data: log.data as Record<string, unknown> | undefined,
        timestamp: log.timestamp
      }))
      
      if (pageNumber === 1) {
        setLogs(typedLogs)
      } else {
        setLogs(prev => [...prev, ...typedLogs])
      }
    } catch (error: unknown) {
      console.error("Error fetching execution logs:", error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [executionId, supabase, isValidUUID, logsPerPage])
  
  useEffect(() => {
    // Reset pagination when execution ID changes
    setLogs([])
    setPage(1)
    setHasMore(true)
    fetchLogs(1)
    // Set up real-time subscription for new logs
    if (!executionId || !isValidUUID(executionId)) return

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
        (payload: { new: Record<string, unknown> }) => {
          const newLog: ExecutionLog = {
            id: payload.new.id as string,
            execution_id: payload.new.execution_id as string,
            node_id: payload.new.node_id as string,
            level: payload.new.level as "info" | "warning" | "error",
            message: payload.new.message as string,
            data: payload.new.data as Record<string, unknown> | undefined,
            timestamp: payload.new.timestamp as string
          }
          setLogs((current) => [...current, newLog])
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [executionId, fetchLogs, isValidUUID, supabase])

  const getLogIcon = useCallback((level: string) => {
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
  }, [])

  // Load more logs
  const handleLoadMore = useCallback(() => {
    if (hasMore && !loading) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchLogs(nextPage)
    }
  }, [hasMore, loading, page, fetchLogs])

  if (error) {
    return (
      <div className="flex flex-col items-center py-4">
        <div className="text-center py-4 text-red-500">Error loading logs: {error}</div>
        <Button variant="outline" size="sm" onClick={() => fetchLogs(1)}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    )
  }

  if (!logs.length && !loading) {
    return <div className="text-center py-4 text-muted-foreground">No logs available</div>
  }

  return (
    <div className="flex flex-col h-[300px] border rounded-md">
      <ScrollArea className="flex-grow p-2">
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
          
          {loading && (
            <div className="flex justify-center py-2">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </ScrollArea>
      
      {hasMore && !loading && (
        <div className="p-2 border-t flex justify-center">
          <Button variant="ghost" size="sm" onClick={handleLoadMore}>
            Load more logs
          </Button>
        </div>
      )}
    </div>
  )
}
