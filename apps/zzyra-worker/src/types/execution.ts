export interface ExecutionContext {
  executionId: string;
  workflowId: string;
  userId: string;
  data?: any;
}

export interface ExecutionLog {
  id: string;
  execution_id: string;
  node_id: string;
  level: 'info' | 'error' | 'warn';
  message: string;
  data?: any;
  timestamp: string;
  created_at: string;
}

export interface BlockExecutionData {
  type: string;
  status: 'running' | 'completed' | 'failed';
  started_at?: string;
  completed_at?: string;
  outputs?: any;
  error?: string;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string;
  completed_at?: string;
  error?: string;
  data?: any;
  created_at: string;
  user_id: string;
  retry_count: number;
  locked_by?: string;
}

export interface BlockDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  logic: string;
  logic_type: 'javascript' | 'condition';
  inputs: BlockInput[];
  outputs: BlockOutput[];
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface BlockInput {
  name: string;
  description: string;
  dataType: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
  defaultValue?: any;
}

export interface BlockOutput {
  name: string;
  description: string;
  dataType: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required: boolean;
}
