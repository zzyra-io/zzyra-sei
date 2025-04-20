import { createClient } from "@/lib/supabase/server"
import { v4 as uuidv4 } from "uuid"

export type ExecutionStatus = "pending" | "running" | "completed" | "failed"

export interface ExecutionLog {
  id: string
  execution_id: string
  node_id: string
  level: "info" | "warning" | "error"
  message: string
  data?: any
  timestamp: string
}

export interface ExecutionResult {
  id: string
  workflow_id: string
  status: ExecutionStatus
  started_at: string
  completed_at?: string
  result?: any
  logs: ExecutionLog[]
}

export class ExecutionService {
  private supabase = createClient()

  async startExecution(workflowId: string): Promise<string> {
    try {
      const user = (await this.supabase.auth.getUser()).data.user

      if (!user) {
        throw new Error("User not authenticated")
      }

      // Create a new execution record
      const executionId = uuidv4()
      const { error } = await this.supabase.from("workflow_executions").insert({
        id: executionId,
        workflow_id: workflowId,
        status: "pending",
        triggered_by: user.id,
      })

      if (error) {
        throw error
      }

      // Log the start of execution
      await this.logExecutionEvent(executionId, "start", "info", "Execution started")

      return executionId
    } catch (error) {
      console.error("Error starting execution:", error)
      throw error
    }
  }

  async updateExecutionStatus(executionId: string, status: ExecutionStatus, result?: any): Promise<void> {
    try {
      const updates: any = { status }

      if (status === "completed" || status === "failed") {
        updates.completed_at = new Date().toISOString()
      }

      if (result) {
        updates.result = result
      }

      const { error } = await this.supabase.from("workflow_executions").update(updates).eq("id", executionId)

      if (error) {
        throw error
      }

      // Log the status change
      await this.logExecutionEvent(
        executionId,
        "status-change",
        status === "failed" ? "error" : "info",
        `Execution ${status}`,
      )
    } catch (error) {
      console.error("Error updating execution status:", error)
      throw error
    }
  }

  async logExecutionEvent(
    executionId: string,
    nodeId: string,
    level: "info" | "warning" | "error",
    message: string,
    data?: any,
  ): Promise<void> {
    try {
      const { error } = await this.supabase.from("execution_logs").insert({
        execution_id: executionId,
        node_id: nodeId,
        level,
        message,
        data,
        timestamp: new Date().toISOString(),
      })

      if (error) {
        console.error("Error logging execution event:", error)
      }
    } catch (error) {
      console.error("Error logging execution event:", error)
    }
  }

  async getExecution(executionId: string): Promise<ExecutionResult | null> {
    try {
      // Get execution details
      const { data: execution, error: executionError } = await this.supabase
        .from("workflow_executions")
        .select("*")
        .eq("id", executionId)
        .single()

      if (executionError) {
        throw executionError
      }

      // Get execution logs
      const { data: logs, error: logsError } = await this.supabase
        .from("execution_logs")
        .select("*")
        .eq("execution_id", executionId)
        .order("timestamp", { ascending: true })

      if (logsError) {
        throw logsError
      }

      return {
        ...execution,
        logs,
      }
    } catch (error) {
      console.error("Error fetching execution:", error)
      return null
    }
  }

  async getWorkflowExecutions(workflowId: string, limit = 10): Promise<ExecutionResult[]> {
    try {
      // Get recent executions
      const { data: executions, error: executionsError } = await this.supabase
        .from("workflow_executions")
        .select("*")
        .eq("workflow_id", workflowId)
        .order("started_at", { ascending: false })
        .limit(limit)

      if (executionsError) {
        throw executionsError
      }

      // For each execution, get its logs
      const executionsWithLogs = await Promise.all(
        executions.map(async (execution) => {
          const { data: logs, error: logsError } = await this.supabase
            .from("execution_logs")
            .select("*")
            .eq("execution_id", execution.id)
            .order("timestamp", { ascending: true })

          if (logsError) {
            console.error("Error fetching logs for execution:", execution.id, logsError)
            return { ...execution, logs: [] }
          }

          return { ...execution, logs }
        }),
      )

      return executionsWithLogs
    } catch (error) {
      console.error("Error fetching workflow executions:", error)
      return []
    }
  }
}

export const executionService = new ExecutionService()
