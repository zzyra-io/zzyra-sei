import { useQuery } from "@tanstack/react-query";

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
      
      const params = new URLSearchParams({
        workflowId,
        limit: limit.toString(),
        offset: offset.toString(),
        sort,
        order,
      });
      
      if (status !== "all") {
        params.append("status", status);
      }
      
      const response = await fetch(`/api/executions/logs?${params.toString()}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch workflow executions");
      }
      
      return response.json();
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
      
      const response = await fetch(`/api/executions/nodes?executionId=${executionId}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch node executions");
      }
      
      return response.json();
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
      
      const response = await fetch(`/api/executions/node-logs?nodeExecutionId=${nodeExecutionId}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch node logs");
      }
      
      return response.json();
    },
    enabled: !!nodeExecutionId && enabled,
  });
}
