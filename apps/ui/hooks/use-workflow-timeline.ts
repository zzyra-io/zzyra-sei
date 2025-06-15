import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { executionService } from '@/lib/services/execution-service';
import { workflowsApi } from '@/lib/services/api';
import { useToast } from '@/hooks/use-toast';

export interface TimelineNodeExecution {
  id: string;
  node_id: string;
  node_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  started_at: string | null;
  completed_at: string | null;
  duration?: number;
  error?: string;
  output_data?: Record<string, unknown>;
  input_data?: Record<string, unknown>;
}

export interface TimelineLogEntry {
  id: string;
  node_id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'debug';
  message: string;
  data?: Record<string, unknown>;
}

export interface TimelineExecution {
  id: string;
  workflowId: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
  error?: string;
  nodeExecutions: TimelineNodeExecution[];
  logs: TimelineLogEntry[];
}

export interface TimelineDataPoint {
  name: string;
  nodeId: string;
  start: number;
  duration: number;
  status: string;
  nodeType: string;
  error?: string;
}

export interface WorkflowTimelineData {
  executions: TimelineExecution[];
  selectedExecution: TimelineExecution | null;
  timelineData: TimelineDataPoint[];
  workflow: Record<string, unknown> | null;
  isLoading: boolean;
  error: string | null;
}

export interface UseWorkflowTimelineOptions {
  workflowId?: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useWorkflowTimeline(options: UseWorkflowTimelineOptions = {}) {
  const { workflowId, autoRefresh = true, refreshInterval = 5000 } = options;
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch workflow details
  const {
    data: workflow,
    isLoading: workflowLoading,
    error: workflowError,
  } = useQuery({
    queryKey: ['workflow', workflowId],
    queryFn: () => workflowId ? workflowsApi.getWorkflow(workflowId) : null,
    enabled: !!workflowId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch executions for the workflow
  const {
    data: executionsData,
    isLoading: executionsLoading,
    error: executionsError,
    refetch: refetchExecutions,
  } = useQuery({
    queryKey: ['executions', workflowId],
    queryFn: () => 
      workflowId 
        ? executionService.getExecutions({ 
            workflowId, 
            limit: 50, 
            sortKey: 'startedAt', 
            sortOrder: 'desc' 
          })
        : { executions: [], total: 0 },
    enabled: !!workflowId,
    refetchInterval: autoRefresh ? refreshInterval : false,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Fetch detailed execution data including node executions and logs
  const {
    data: executionDetail,
    isLoading: executionDetailLoading,
    error: executionDetailError,
  } = useQuery({
    queryKey: ['execution-detail', selectedExecutionId],
    queryFn: async () => {
      if (!selectedExecutionId) return null;

      const [execution, nodeExecutions] = await Promise.all([
        executionService.getExecution(selectedExecutionId),
        executionService.getNodeExecutions(selectedExecutionId),
      ]);

      // Fetch logs for each node execution
      const nodeExecutionsWithLogs = await Promise.all(
        nodeExecutions.map(async (nodeExec: Record<string, unknown>) => {
          try {
            const logs = await executionService.getNodeLogs(nodeExec.id as string);
            return {
              ...nodeExec,
              logs: logs || [],
            };
          } catch (error) {
            console.warn(`Failed to fetch logs for node ${nodeExec.id}:`, error);
            return {
              ...nodeExec,
              logs: [],
            };
          }
        })
      );

      // Aggregate all logs from all nodes
      const allLogs = nodeExecutionsWithLogs
        .flatMap(nodeExec => 
          (nodeExec.logs as Record<string, unknown>[]).map((log: Record<string, unknown>) => ({
            ...log,
            node_id: nodeExec.node_id,
          }))
        )
        .sort((a, b) => new Date(a.timestamp as string).getTime() - new Date(b.timestamp as string).getTime());

      return {
        ...execution,
        nodeExecutions: nodeExecutionsWithLogs,
        logs: allLogs,
      } as TimelineExecution;
    },
    enabled: !!selectedExecutionId,
    refetchInterval: autoRefresh && selectedExecutionId ? refreshInterval : false,
    staleTime: 10 * 1000, // 10 seconds for active execution details
  });

  // Generate timeline data from execution details
  const timelineData = useMemo((): TimelineDataPoint[] => {
    if (!executionDetail || !executionDetail.nodeExecutions) return [];

    const startTime = new Date(executionDetail.startedAt).getTime();

    return executionDetail.nodeExecutions
      .filter(node => node.started_at)
      .map(node => {
        const start = new Date(node.started_at!).getTime() - startTime;
        let duration = 0;

        if (node.completed_at) {
          duration = new Date(node.completed_at).getTime() - new Date(node.started_at!).getTime();
        } else if (node.status === 'running' || node.status === 'paused') {
          duration = Date.now() - new Date(node.started_at!).getTime();
        }

        return {
          name: node.node_id,
          nodeId: node.node_id,
          start,
          duration,
          status: node.status,
          nodeType: node.node_type,
          error: node.error,
        };
      })
      .sort((a, b) => a.start - b.start);
  }, [executionDetail]);

  // Auto-select first execution if none selected
  useEffect(() => {
    if (executionsData?.executions.length && !selectedExecutionId) {
      setSelectedExecutionId(executionsData.executions[0].id);
    }
  }, [executionsData, selectedExecutionId]);

  // Auto-select first node if none selected
  useEffect(() => {
    if (timelineData.length && !selectedNodeId) {
      setSelectedNodeId(timelineData[0].nodeId);
    }
  }, [timelineData, selectedNodeId]);

  // Handle execution actions
  const handleExecutionAction = useCallback(async (
    action: 'retry' | 'cancel' | 'pause' | 'resume',
    executionId: string,
    nodeId?: string
  ) => {
    try {
      switch (action) {
        case 'retry':
          await executionService.retryExecution(executionId, nodeId);
          break;
        case 'cancel':
          await executionService.cancelExecution(executionId, nodeId);
          break;
        case 'pause':
          await executionService.pauseExecution(executionId, nodeId);
          break;
        case 'resume':
          await executionService.resumeExecution(executionId, nodeId);
          break;
      }

      toast({
        title: `Execution ${action}ed`,
        description: `Successfully ${action}ed the execution${nodeId ? ` at node ${nodeId}` : ''}.`,
      });

      // Invalidate and refetch relevant queries
      queryClient.invalidateQueries({ queryKey: ['executions', workflowId] });
      queryClient.invalidateQueries({ queryKey: ['execution-detail', executionId] });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: `Failed to ${action} execution`,
        description: error instanceof Error ? error.message : `An error occurred while ${action}ing the execution.`,
      });
      throw error;
    }
  }, [toast, queryClient, workflowId]);

  // Get node name from workflow data
  const getNodeName = useCallback((nodeId: string): string => {
    if (!workflow?.nodes) return nodeId;
    
    const node = workflow.nodes.find((n: any) => n.id === nodeId);
    return node?.data?.label || node?.data?.name || node?.type || nodeId;
  }, [workflow]);

  // Get filtered logs for selected node
  const getFilteredLogs = useCallback((
    level: 'all' | 'info' | 'warning' | 'error' | 'debug' = 'all'
  ): TimelineLogEntry[] => {
    if (!executionDetail?.logs) return [];

    let logs = executionDetail.logs;

    // Filter by selected node if one is selected
    if (selectedNodeId) {
      logs = logs.filter(log => log.node_id === selectedNodeId);
    }

    // Filter by log level
    if (level !== 'all') {
      logs = logs.filter(log => log.level === level);
    }

    return logs;
  }, [executionDetail, selectedNodeId]);

  // Manual refresh function
  const refresh = useCallback(() => {
    refetchExecutions();
    if (selectedExecutionId) {
      queryClient.invalidateQueries({ queryKey: ['execution-detail', selectedExecutionId] });
    }
  }, [refetchExecutions, queryClient, selectedExecutionId]);

  const isLoading = workflowLoading || executionsLoading || executionDetailLoading;
  const error = workflowError || executionsError || executionDetailError;

  return {
    // Data
    workflow,
    executions: executionsData?.executions || [],
    selectedExecution: executionDetail,
    timelineData,
    
    // Selection state
    selectedExecutionId,
    setSelectedExecutionId,
    selectedNodeId,
    setSelectedNodeId,
    
    // Loading and error states
    isLoading,
    error: error ? (error as Error).message : null,
    
    // Actions
    handleExecutionAction,
    refresh,
    
    // Utilities
    getNodeName,
    getFilteredLogs,
    
    // Stats
    totalExecutions: executionsData?.total || 0,
  };
} 