import { createClient } from "@/lib/supabase/client"
import { v4 as uuidv4 } from "uuid"

export type ExecutionLog = {
  id: string
  workflow_id: string
  user_id: string
  status: "pending" | "running" | "completed" | "failed"
  started_at: string
  completed_at: string | null
  logs: any[]
  results: any
  error: string | null
  created_at: string
}

class ExecutionService {
  private supabase = createClient()

  async executeWorkflow(workflowId: string): Promise<ExecutionLog> {
    try {
      const user = (await this.supabase.auth.getUser()).data.user

      if (!user) {
        throw new Error("User not authenticated")
      }

      const executionLog: Omit<ExecutionLog, "completed_at" | "logs" | "results" | "error"> = {
        id: uuidv4(),
        workflow_id: workflowId,
        user_id: user.id,
        status: "running",
        started_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      }

      // Insert execution log into the database
      const { data, error } = await this.supabase.from("workflow_executions").insert(executionLog).select().single()

      if (error) {
        console.error("Error creating execution log:", error)
        throw error
      }

      // Simulate workflow execution (replace with actual logic)
      const executionResult = await this.simulateWorkflowExecution(data as ExecutionLog)

      return executionResult
    } catch (error) {
      console.error("Error in executeWorkflow:", error)
      throw error
    }
  }

  async getExecutionLogs(workflowId: string): Promise<ExecutionLog[]> {
    try {
      const user = (await this.supabase.auth.getUser()).data.user

      if (!user) {
        throw new Error("User not authenticated")
      }

      const { data, error } = await this.supabase
        .from("workflow_executions")
        .select()
        .eq("workflow_id", workflowId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching execution logs:", error)
        throw error
      }

      return data as ExecutionLog[]
    } catch (error) {
      console.error("Error in getExecutionLogs:", error)
      throw error
    }
  }

  private async simulateWorkflowExecution(executionLog: ExecutionLog): Promise<ExecutionLog> {
    return new Promise((resolve) => {
      setTimeout(async () => {
        const randomStatus = Math.random() > 0.2 ? "completed" : "failed" // Simulate success/failure
        const logs = [
          { timestamp: new Date().toISOString(), level: "info", message: "Workflow started", node_id: "trigger" },
          { timestamp: new Date().toISOString(), level: "info", message: "Processing data", node_id: "process" },
        ]

        let error = null
        if (randomStatus === "failed") {
          error = "Simulated workflow failure"
          logs.push({ timestamp: new Date().toISOString(), level: "error", message: error, node_id: "process" })
        }

        const updatedExecutionLog = {
          ...executionLog,
          status: randomStatus,
          completed_at: new Date().toISOString(),
          logs: logs,
          results: { message: "Workflow executed successfully" },
          error: error,
        }

        const { error: updateError } = await this.supabase
          .from("workflow_executions")
          .update({
            status: updatedExecutionLog.status,
            completed_at: updatedExecutionLog.completed_at,
            logs: updatedExecutionLog.logs,
            results: updatedExecutionLog.results,
            error: updatedExecutionLog.error,
          })
          .eq("id", executionLog.id)

        if (updateError) {
          console.error("Error updating execution log:", updateError)
        }

        resolve(updatedExecutionLog)
      }, 2000) // Simulate 2 seconds execution time
    })
  }
}

export const executionService = new ExecutionService()
