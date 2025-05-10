import { createServiceClient } from "@/lib/supabase/serviceClient";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { v4 as uuidv4 } from "uuid";
import { workflowService } from "./workflow-service";
import { getBlockType } from "@zyra/types";
import { addExecutionJob } from "@/lib/queue/executionQueue";
import { BlockType, blockSchemas } from "@zyra/types";

export type ExecutionStatus = "pending" | "running" | "completed" | "failed";

export interface ExecutionLog {
  id: string;
  execution_id: string;
  node_id: string;
  // level may be any string returned from the backend
  level: string;
  message: string;
  data?: any;
  timestamp: string;
}

export interface NodeExecution {
  id: string;
  execution_id: string;
  node_id: string;
  status: string;
  started_at: string;
  completed_at?: string;
}

export interface ExecutionResult {
  id: string;
  workflow_id: string;
  status: string;
  started_at: string;
  completed_at?: string;
  result?: any;
  logs: ExecutionLog[];
  nodeExecutions: NodeExecution[];
}

export class ExecutionService {
  // Use service role client to bypass RLS in worker context
  private supabase: SupabaseClient<Database> = createServiceClient();

  async startExecution(workflowId: string): Promise<string> {
    try {
      // Insert new execution record
      const { data: record, error } = await this.supabase
        .from("workflow_executions")
        .insert({
          workflow_id: workflowId,
          status: "pending",
          triggered_by: null,
        })
        .select("id")
        .single();
      if (error || !record) {
        console.error("Error creating workflow execution:", error);
        throw new Error(error?.message || "Failed to create execution");
      }
      const executionId = record.id;

      // Log the start of execution
      await this.logExecutionEvent(
        executionId,
        "start",
        "info",
        "Execution started"
      );

      // Validate node configs against schemas
      const workflow = await workflowService.getWorkflow(workflowId);
      for (const node of workflow.nodes) {
        const schema = blockSchemas[getBlockType(node.data) as BlockType];
        try {
          schema.parse(node.data);
        } catch (err) {
          throw new Error(
            `Node ${node.id} config validation failed: ${(err as Error).message}`
          );
        }
      }

      // Enqueue execution job after validation
      await addExecutionJob(executionId, workflowId);
      return executionId;
    } catch (error) {
      console.error("Error starting execution:", error);
      throw error;
    }
  }

  async updateExecutionStatus(
    executionId: string,
    status: ExecutionStatus,
    result?: any
  ): Promise<void> {
    try {
      const updates: any = { status };
      // Set started_at when execution begins
      if (status === "running") {
        updates.started_at = new Date().toISOString();
      }
      // Set completed_at when execution finishes or fails
      if (status === "completed" || status === "failed") {
        updates.completed_at = new Date().toISOString();
      }
      // Include result payload if provided
      if (result !== undefined) {
        updates.result = result;
      }

      const { error } = await this.supabase
        .from("workflow_executions")
        .update(updates)
        .eq("id", executionId);

      if (error) {
        throw error;
      }

      // Log the status change
      await this.logExecutionEvent(
        executionId,
        "status-change",
        status === "failed" ? "error" : "info",
        `Execution ${status}`
      );
    } catch (error) {
      console.error("Error updating execution status:", error);
      throw error;
    }
  }

  async logExecutionEvent(
    executionId: string,
    nodeId: string,
    level: "info" | "warning" | "error",
    message: string,
    data?: any
  ): Promise<void> {
    try {
      // Bypass authentication; using service role
      const { error } = await this.supabase.from("execution_logs").insert({
        execution_id: executionId,
        node_id: nodeId,
        level,
        message,
        data,
        timestamp: new Date().toISOString(),
      });

      if (error) {
        console.error("Error logging execution event:", error);
      }
    } catch (error) {
      console.error("Error logging execution event:", error);
    }
  }

  async getExecution(executionId: string): Promise<ExecutionResult | null> {
    try {
      // Get execution details
      const { data: execution, error: executionError } = await this.supabase
        .from("workflow_executions")
        .select("*")
        .eq("id", executionId)
        .single();

      if (executionError) {
        throw executionError;
      }

      // Get execution logs
      const { data: rawLogs, error: logsError } = await this.supabase
        .from("execution_logs")
        .select("*")
        .eq("execution_id", executionId)
        .order("timestamp", { ascending: true });

      if (logsError) {
        throw logsError;
      }
      // Map and cast raw logs to ExecutionLog[]
      const logs: ExecutionLog[] = (rawLogs || []).map((r) => ({
        id: r.id,
        execution_id: r.execution_id,
        node_id: r.node_id,
        level: r.level as string,
        message: r.message,
        data: r.data,
        timestamp: r.timestamp,
      }));

      // Get node execution records
      const { data: rawNodeExecs, error: nodeExecError } = await this.supabase
        .from("node_executions")
        .select("*")
        .eq("execution_id", executionId)
        .order("started_at", { ascending: true });
      if (nodeExecError) {
        console.error("Error fetching node executions:", nodeExecError);
      }
      // Cast to NodeExecution[]
      const nodeExecutions = (rawNodeExecs || []).map((r) => ({
        id: r.id,
        execution_id: r.execution_id,
        node_id: r.node_id,
        status: r.status as string,
        started_at: r.started_at,
        completed_at: r.completed_at,
      }));

      // Return typed ExecutionResult object
      return {
        id: execution.id,
        workflow_id: execution.workflow_id,
        status: execution.status as string,
        started_at: execution.started_at || "",
        completed_at: execution.completed_at || undefined,
        result: execution.result,
        logs,
        nodeExecutions,
      };
    } catch (error) {
      console.error("Error fetching execution:", error);
      return null;
    }
  }

  async getWorkflowExecutions(
    workflowId: string,
    limit = 10
  ): Promise<ExecutionResult[]> {
    try {
      // Get recent executions
      const { data: executions, error: executionsError } = await this.supabase
        .from("workflow_executions")
        .select("*")
        .eq("workflow_id", workflowId)
        .order("started_at", { ascending: false })
        .limit(limit);

      if (executionsError) {
        throw executionsError;
      }

      // For each execution, get its logs
      const executionsWithLogs = await Promise.all(
        executions.map(async (execution) => {
          const { data: logs, error: logsError } = await this.supabase
            .from("execution_logs")
            .select("*")
            .eq("execution_id", execution.id)
            .order("timestamp", { ascending: true });

          if (logsError) {
            console.error(
              "Error fetching logs for execution:",
              execution.id,
              logsError
            );
            return { ...execution, logs: [] };
          }

          return { ...execution, logs };
        })
      );

      // Ensure nodeExecutions field exists for type safety
      return executionsWithLogs.map((e) => ({
        id: e.id,
        workflow_id: e.workflow_id,
        status: e.status as string,
        // Ensure non-null started_at
        started_at: e.started_at ?? "",
        // Use undefined if completed_at is null
        completed_at: e.completed_at ?? undefined,
        result: e.result,
        logs: e.logs,
        nodeExecutions: [],
      }));
    } catch (error) {
      console.error("Error fetching workflow executions:", error);
      return [];
    }
  }
}

export const executionService = new ExecutionService();
