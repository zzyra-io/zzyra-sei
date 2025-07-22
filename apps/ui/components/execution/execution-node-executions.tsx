"use client";

import { useEffect, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, Clock, Play, Pause } from "lucide-react";
import {
  executionsApi,
  type WorkflowExecution,
  type NodeExecution,
} from "@/lib/services/api";

interface ExecutionNodeExecutionsProps {
  executionId: string;
  refreshInterval?: number;
}

export function ExecutionNodeExecutions({
  executionId,
  refreshInterval = 5000,
}: ExecutionNodeExecutionsProps) {
  const [nodes, setNodes] = useState<NodeExecution[]>([]);
  const [execution, setExecution] = useState<WorkflowExecution | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadExecutionData = async () => {
    try {
      setError(null);

      // Fetch node executions
      const nodeExecutions = await executionsApi.getNodeExecutions(executionId);
      setNodes(nodeExecutions);

      // Fetch execution details
      const executionsResponse = await executionsApi.getWorkflowExecutions(
        "", // workflowId - we'll get it from the execution
        1,
        0,
        "all",
        "started_at",
        "desc"
      );

      const currentExecution = executionsResponse.data.find(
        (exec) => exec.id === executionId
      );
      if (currentExecution) {
        setExecution(currentExecution);
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load execution data";
      setError(errorMessage);
      console.error("Error loading execution data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExecutionData();

    // Set up polling for real-time updates
    const interval = setInterval(loadExecutionData, refreshInterval);

    return () => clearInterval(interval);
  }, [executionId, refreshInterval]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className='h-4 w-4 text-green-500' />;
      case "failed":
        return <AlertCircle className='h-4 w-4 text-red-500' />;
      case "running":
        return <Play className='h-4 w-4 text-blue-500' />;
      case "paused":
        return <Pause className='h-4 w-4 text-yellow-500' />;
      default:
        return <Clock className='h-4 w-4 text-gray-500' />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "running":
        return "bg-blue-100 text-blue-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const formatDuration = (
    startedAt?: string | null,
    completedAt?: string | null
  ) => {
    if (!startedAt) return "N/A";

    const start = new Date(startedAt);
    const end = completedAt ? new Date(completedAt) : new Date();
    const duration = end.getTime() - start.getTime();

    if (duration < 1000) return "< 1s";
    if (duration < 60000) return `${Math.round(duration / 1000)}s`;
    return `${Math.round(duration / 60000)}m`;
  };

  if (loading) {
    return (
      <div className='space-y-4'>
        <div className='animate-pulse'>
          <div className='h-4 bg-gray-200 rounded w-1/4 mb-2'></div>
          <div className='space-y-2'>
            {[1, 2, 3].map((i) => (
              <div key={i} className='h-12 bg-gray-200 rounded'></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className='p-4 border border-red-200 rounded-md bg-red-50'>
        <div className='flex items-center space-x-2'>
          <AlertCircle className='h-4 w-4 text-red-500' />
          <span className='text-red-700'>Error: {error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {execution && (
        <div className='flex items-center justify-between p-4 border rounded-lg'>
          <div>
            <h3 className='font-medium'>
              Execution {execution.id.slice(0, 8)}
            </h3>
            <p className='text-sm text-gray-500'>
              Started: {new Date(execution.startedAt).toLocaleString()}
            </p>
          </div>
          <Badge className={getStatusColor(execution.status)}>
            {execution.status}
          </Badge>
        </div>
      )}

      <ScrollArea className='h-96'>
        <div className='space-y-2'>
          {nodes.length === 0 ? (
            <div className='text-center py-8 text-gray-500'>
              No node executions found
            </div>
          ) : (
            nodes.map((node) => (
              <div
                key={node.node_id}
                className='p-4 border rounded-lg hover:bg-gray-50 transition-colors'>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center space-x-3'>
                    {getStatusIcon(node.status)}
                    <div>
                      <h4 className='font-medium'>Node {node.node_id}</h4>
                      <p className='text-sm text-gray-500'>
                        Duration:{" "}
                        {formatDuration(node.started_at, node.completed_at)}
                      </p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(node.status)}>
                    {node.status}
                  </Badge>
                </div>

                {node.error && (
                  <div className='mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700'>
                    Error: {node.error}
                  </div>
                )}

                {node.output_data &&
                  Object.keys(node.output_data).length > 0 && (
                    <details className='mt-2'>
                      <summary className='cursor-pointer text-sm text-gray-600 hover:text-gray-800'>
                        Output Data
                      </summary>
                      <pre className='mt-1 p-2 bg-gray-50 rounded text-xs overflow-auto'>
                        {JSON.stringify(node.output_data, null, 2)}
                      </pre>
                    </details>
                  )}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
