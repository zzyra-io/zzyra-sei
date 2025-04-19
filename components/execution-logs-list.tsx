"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { ExecutionLog } from "@/lib/services/execution-service"
import { ChevronDown, ChevronRight, CheckCircle, XCircle, Clock } from "lucide-react"

interface ExecutionLogsListProps {
  logs: ExecutionLog[]
}

export function ExecutionLogsList({ logs }: ExecutionLogsListProps) {
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({})

  const toggleExpand = (id: string) => {
    setExpandedLogs((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  if (logs.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center rounded-md border border-dashed p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Clock className="h-6 w-6 text-primary" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">No execution history</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          This workflow hasn't been executed yet. Click the Execute button to run it.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]"></TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Started</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => {
            const isExpanded = expandedLogs[log.id] || false
            const startDate = new Date(log.started_at)
            const endDate = log.completed_at ? new Date(log.completed_at) : null
            const duration = endDate ? Math.round((endDate.getTime() - startDate.getTime()) / 1000) : null

            return (
              <Collapsible
                key={log.id}
                open={isExpanded}
                onOpenChange={() => toggleExpand(log.id)}
                className="border-b"
              >
                <TableRow className="group cursor-pointer hover:bg-muted/50">
                  <TableCell className="py-2">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-6 w-6 p-0">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </CollapsibleTrigger>
                  </TableCell>
                  <TableCell className="py-2">
                    <div className="flex items-center">
                      {log.status === "completed" ? (
                        <Badge className="bg-green-500 hover:bg-green-600">
                          <CheckCircle className="mr-1 h-3 w-3" />
                          Completed
                        </Badge>
                      ) : log.status === "failed" ? (
                        <Badge variant="destructive">
                          <XCircle className="mr-1 h-3 w-3" />
                          Failed
                        </Badge>
                      ) : log.status === "running" ? (
                        <Badge variant="outline" className="bg-blue-500 text-white hover:bg-blue-600">
                          <Clock className="mr-1 h-3 w-3 animate-spin" />
                          Running
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          <Clock className="mr-1 h-3 w-3" />
                          Pending
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2">{startDate.toLocaleString()}</TableCell>
                  <TableCell className="py-2">{duration !== null ? `${duration}s` : "In progress"}</TableCell>
                  <TableCell className="py-2 text-right">
                    <Button variant="ghost" size="sm" className="h-7">
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
                <CollapsibleContent>
                  <div className="space-y-4 p-4">
                    <div>
                      <h4 className="text-sm font-medium">Execution Logs</h4>
                      <div className="mt-2 max-h-60 overflow-auto rounded-md border bg-muted/50 p-2 font-mono text-xs">
                        {log.logs.map((entry, index) => (
                          <div
                            key={index}
                            className={`mb-1 ${
                              entry.level === "error"
                                ? "text-red-500"
                                : entry.level === "warning"
                                  ? "text-amber-500"
                                  : ""
                            }`}
                          >
                            [{new Date(entry.timestamp).toLocaleTimeString()}] [{entry.node_id}] {entry.message}
                          </div>
                        ))}
                      </div>
                    </div>
                    {log.error && (
                      <div>
                        <h4 className="text-sm font-medium text-red-500">Error</h4>
                        <div className="mt-1 rounded-md border border-red-200 bg-red-50 p-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400">
                          {log.error}
                        </div>
                      </div>
                    )}
                    {Object.keys(log.results).length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium">Results</h4>
                        <pre className="mt-1 max-h-40 overflow-auto rounded-md border bg-muted/50 p-2 text-xs">
                          {JSON.stringify(log.results, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
