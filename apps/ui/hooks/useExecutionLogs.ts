import { useQuery } from "@tanstack/react-query";
import { executionsApi } from "@/lib/services/api";

// Types for API responses
export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  error: string | null;
}

export interface NodeExecution {
  id: string;
  execution_id: string;
  node_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  error: string | null;
  input_data: Record<string, unknown> | null;
  output_data: Record<string, unknown> | null;
}

export interface NodeLog {
  id: string;
  node_execution_id: string;
  level: string;
  message: string;
  created_at: string;
}

interface ExecutionLogsResponse {
  executions: WorkflowExecution[];
  total: number;
}

// Fetch workflow executions
export function useWorkflowExecutions(
  workflowId: string | undefined,
  limit: number = 10,
  offset: number = 0,
  status: string = "all",
  sort: string = "started_at",
  order: string = "desc",
  enabled: boolean = true
) {
  return useQuery<ExecutionLogsResponse>({
    queryKey: ["workflowExecutions", workflowId, limit, offset, status, sort, order],
    queryFn: async () => {
      if (!workflowId) {
        throw new Error("Workflow ID is required");
      }
      
      try {
        return await executionsApi.getWorkflowExecutions(
          workflowId,
          limit,
          offset,
          status,
          sort,
          order
        );
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : "Failed to fetch workflow executions");
      }
    },
    enabled: !!workflowId && enabled,
  });
}

// Fetch node executions for a specific workflow execution
export function useNodeExecutions(executionId: string | undefined, enabled: boolean = true) {
  return useQuery<NodeExecution[]>({
    queryKey: ["nodeExecutions", executionId],
    queryFn: async () => {
      if (!executionId) {
        throw new Error("Execution ID is required");
      }
      
      try {
        return await executionsApi.getNodeExecutions(executionId);
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : "Failed to fetch node executions");
      }
    },
    enabled: !!executionId && enabled,
  });
}

// Fetch logs for a specific node execution
export function useNodeLogs(nodeExecutionId: string | undefined, enabled: boolean = true) {
  return useQuery<NodeLog[]>({
    queryKey: ["nodeLogs", nodeExecutionId],
    queryFn: async () => {
      if (!nodeExecutionId) {
        throw new Error("Node Execution ID is required");
      }
      
      try {
        return await executionsApi.getNodeLogs(nodeExecutionId);
      } catch (error) {
        throw new Error(error instanceof Error ? error.message : "Failed to fetch node logs");
      }
    },
    enabled: !!nodeExecutionId && enabled,
  });
}
