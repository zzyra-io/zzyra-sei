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

/**
 * Context provided to block handlers during execution
 */
export interface BlockExecutionContext {
  nodeId: string;
  executionId: string;
  workflowId: string;
  userId: string;
  inputs: Record<string, any>;
  previousOutputs?: Record<string, any>;
  config: Record<string, any>;
  // Added workflowData field that many handlers use
  workflowData?: Record<string, any>;
  logger: {
    // Added log method for compatibility with worker implementation
    log: (message: string, data?: any) => void;
    debug: (message: string, data?: any) => void;
    info: (message: string, data?: any) => void;
    warn: (message: string, data?: any) => void;
    error: (message: string, data?: any) => void;
  };
  // Used by custom blocks to access additional services
  services?: Record<string, any>;
}

/**
 * Interface for block handlers that execute workflow nodes
 */
export interface BlockHandler {
  // Updated signature to match worker implementation with 2 parameters
  execute(node: any, context: BlockExecutionContext): Promise<Record<string, any>>;
  validate?(config: Record<string, any>): boolean;
  getDefaultConfig?(): Record<string, any>;
}