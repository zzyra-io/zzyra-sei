import api from "./api";

export interface ExecutionLog {
  id: string;
  execution_id: string;
  node_id: string;
  level: "info" | "warning" | "error" | "debug";
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

export interface NodeLog {
  id: string;
  nodeExecutionId: string;
  level: "info" | "warning" | "error" | "debug";
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export interface UnifiedLog {
  id: string;
  execution_id: string;
  node_id: string;
  level: "info" | "warning" | "error" | "debug";
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
  source: "execution" | "node";
}

interface ApiLog {
  id: string;
  level: string;
  message: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

class LogsService {
  /**
   * Fetch all logs for an execution (both execution logs and node logs)
   */
  async getExecutionLogs(executionId: string): Promise<UnifiedLog[]> {
    try {
      // Fetch execution details which includes executionLogs
      const response = await fetch(`/api/executions/public/${executionId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch execution: ${response.statusText}`);
      }

      const execution = await response.json();
      const executionLogs = execution.executionLogs || [];
      const nodeExecutions = execution.nodeExecutions || [];

      // Transform execution logs
      const unifiedLogs: UnifiedLog[] = executionLogs.map((log: ApiLog) => ({
        id: log.id,
        execution_id: executionId,
        node_id: log.metadata?.nodeId || "system",
        level: log.level as "info" | "warning" | "error" | "debug",
        message: log.message,
        data: log.metadata,
        timestamp: log.timestamp,
        source: "execution" as const,
      }));

      // Fetch and transform node logs
      for (const nodeExecution of nodeExecutions) {
        try {
          const nodeLogsResponse = await api.get(
            `/executions/node-logs?nodeExecutionId=${nodeExecution.id}`
          );
          const nodeLogs = nodeLogsResponse.data.logs || [];

          const nodeUnifiedLogs: UnifiedLog[] = nodeLogs.map((log: ApiLog) => ({
            id: log.id,
            execution_id: executionId,
            node_id: nodeExecution.nodeId,
            level: log.level as "info" | "warning" | "error" | "debug",
            message: log.message,
            data: log.metadata,
            timestamp: log.timestamp,
            source: "node" as const,
          }));

          unifiedLogs.push(...nodeUnifiedLogs);
        } catch (error) {
          console.warn(
            `Failed to fetch logs for node ${nodeExecution.nodeId}:`,
            error
          );
        }
      }

      // Sort all logs by timestamp
      return unifiedLogs.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
    } catch (error) {
      console.error(
        `Failed to fetch logs for execution ${executionId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Fetch only execution-level logs
   */
  async getExecutionLevelLogs(executionId: string): Promise<ExecutionLog[]> {
    try {
      const response = await fetch(`/api/executions/public/${executionId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch execution: ${response.statusText}`);
      }

      const execution = await response.json();
      const executionLogs = execution.executionLogs || [];

      return executionLogs.map((log: ApiLog) => ({
        id: log.id,
        execution_id: executionId,
        node_id: log.metadata?.nodeId || "system",
        level: log.level as "info" | "warning" | "error",
        message: log.message,
        data: log.metadata,
        timestamp: log.timestamp,
      }));
    } catch (error) {
      console.error(
        `Failed to fetch execution logs for ${executionId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Fetch node-specific logs
   */
  async getNodeLogs(nodeExecutionId: string): Promise<NodeLog[]> {
    try {
      const response = await api.get(
        `/executions/node-logs?nodeExecutionId=${nodeExecutionId}`
      );
      return response.data.logs || [];
    } catch (error) {
      console.error(`Failed to fetch node logs for ${nodeExecutionId}:`, error);
      throw error;
    }
  }

  /**
   * Fetch logs for a specific node by executionId and nodeId
   */
  async getNodeLogsByNode(
    executionId: string,
    nodeId: string
  ): Promise<NodeLog[]> {
    try {
      const response = await api.get(
        `/executions/node-logs-by-node?executionId=${executionId}&nodeId=${nodeId}`
      );
      return response.data.logs || [];
    } catch (error) {
      console.error(
        `Failed to fetch node logs for ${executionId}/${nodeId}:`,
        error
      );
      throw error;
    }
  }
}

export const logsService = new LogsService();
