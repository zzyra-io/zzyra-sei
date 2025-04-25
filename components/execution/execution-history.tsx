"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertCircle, CheckCircle, Clock, Loader2 } from "lucide-react"

interface ExecutionHistoryProps {
  workflowId: string
  executions: any[]
  onSelectExecution: (id: string) => void
}

export function ExecutionHistory({ workflowId, executions, onSelectExecution }: ExecutionHistoryProps) {
  if (!executions.length) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No execution history found</p>
      </div>
    )
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-muted-foreground" />
      case "running":
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  return (
    <div className="space-y-2">
      {executions.map((execution) => (
        <div
          key={execution.id}
          className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50 cursor-pointer"
          onClick={() => onSelectExecution(execution.id)}
        >
          <div className="flex items-center gap-3">
            {getStatusIcon(execution.status)}
            <div>
              <p className="text-sm font-medium">
                {execution.started_at ? new Date(execution.started_at).toLocaleString() : '-'}
              </p>
              <p className="text-xs text-muted-foreground">
                {execution.completed_at
                  ? `Duration: ${Math.round(
                      (new Date(execution.completed_at).getTime() - new Date(execution.started_at).getTime()) / 1000,
                    )}s`
                  : "In progress..."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                execution.status === "completed" ? "success" : execution.status === "failed" ? "destructive" : "outline"
              }
            >
              {execution.status}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                onSelectExecution(execution.id)
              }}
            >
              View
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
