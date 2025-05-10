/**
 * Workflow execution types shared between UI and worker
 */

/**
 * Execution status types
 */
export type ExecutionStatus = "pending" | "running" | "completed" | "failed";

/**
 * Execution log record
 */
export interface ExecutionLog {
  id: string;
  execution_id: string;
  node_id: string;
  level: string;
  message: string;
  data?: any;
  timestamp: string;
}

/**
 * Node execution record
 */
export interface NodeExecution {
  id: string;
  execution_id: string;
  node_id: string;
  status: string;
  started_at: string;
  completed_at?: string;
}

/**
 * Complete workflow execution result
 */
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
