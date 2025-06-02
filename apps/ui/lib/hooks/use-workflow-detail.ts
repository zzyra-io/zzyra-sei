import { useQuery } from '@tanstack/react-query';
import { workflowService } from '@/lib/services/workflow-service';
import { executionService } from '@/lib/services/execution-service';
import { useState, useEffect } from 'react';
import type { ExecutionResult } from '@/lib/services/execution-service';

// Use the Workflow type from the service to ensure compatibility
type Workflow = ReturnType<typeof workflowService.getWorkflow> extends Promise<infer T> ? T : never;

interface WorkflowDetailHookResult {
  workflow: Workflow | null;
  executionLogs: ExecutionResult[];
  stats: {
    avgDuration: number;
    medianDuration: number;
    peakConcurrency: number;
  } | null;
  trends: Array<{ timestamp: string; count: number }>;
  heatmap: Array<{
    nodeId: string;
    date: string;
    avgDuration: number;
    failureRate: number;
  }>;
  isWorkflowLoading: boolean;
  isLogsLoading: boolean;
  isStatsLoading: boolean;
  executionSummary: {
    total: number;
    successful: number;
    failed: number;
  };
  selectedExecutionId: string | null;
  setSelectedExecutionId: (id: string | null) => void;
  execDetail: ExecutionResult | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export function useWorkflowDetail(workflowId: string | undefined): WorkflowDetailHookResult {
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [executionLogs, setExecutionLogs] = useState<ExecutionResult[]>([]);
  const [stats, setStats] = useState<{
    avgDuration: number;
    medianDuration: number;
    peakConcurrency: number;
  } | null>(null);
  const [trends, setTrends] = useState<Array<{ timestamp: string; count: number }>>([]);
  const [heatmap, setHeatmap] = useState<
    Array<{
      nodeId: string;
      date: string;
      avgDuration: number;
      failureRate: number;
    }>
  >([]);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [execDetail, setExecDetail] = useState<ExecutionResult | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isWorkflowLoading, setIsWorkflowLoading] = useState(true);
  const [isLogsLoading, setIsLogsLoading] = useState(true);
  const [isStatsLoading, setIsStatsLoading] = useState(true);

  // Fetch workflow data
  const { data: workflowData, isLoading: isWorkflowQueryLoading } = useQuery({
    queryKey: ['workflow', workflowId],
    queryFn: () => workflowService.getWorkflow(workflowId!),
    enabled: !!workflowId,
  });

  // Fetch execution logs
  const { data: logsData, isLoading: isLogsQueryLoading } = useQuery({
    queryKey: ['workflow-executions', workflowId],
    queryFn: () => executionService.getWorkflowExecutions(workflowId!),
    enabled: !!workflowId,
  });

  // Fetch stats
  const { data: statsData, isLoading: isStatsQueryLoading } = useQuery({
    queryKey: ['workflow-stats', workflowId],
    queryFn: async () => {
      const res = await fetch(`/api/executions/stats?workflowId=${workflowId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!workflowId,
  });

  // Fetch trends
  const { data: trendsData, isLoading: isTrendsQueryLoading } = useQuery({
    queryKey: ['workflow-trends', workflowId],
    queryFn: async () => {
      const res = await fetch(`/api/executions/trends?workflowId=${workflowId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!workflowId,
  });

  // Fetch heatmap
  const { data: heatmapData, isLoading: isHeatmapQueryLoading } = useQuery({
    queryKey: ['workflow-heatmap', workflowId],
    queryFn: async () => {
      const res = await fetch(`/api/executions/heatmap?workflowId=${workflowId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!workflowId,
  });

  // Fetch execution details
  const { data: executionDetail } = useQuery({
    queryKey: ['execution-detail', selectedExecutionId],
    queryFn: () => executionService.getExecution(selectedExecutionId!),
    enabled: activeTab === 'timeline' && !!selectedExecutionId,
  });

  // Update state from React Query results
  useEffect(() => {
    if (workflowData) setWorkflow(workflowData);
    if (logsData) {
      setExecutionLogs(logsData);
      if (logsData.length > 0 && !selectedExecutionId) {
        setSelectedExecutionId(logsData[0].id);
      }
    }
    if (statsData) setStats(statsData);
    if (trendsData) setTrends(trendsData);
    if (heatmapData) setHeatmap(heatmapData);

    // Update loading states
    setIsWorkflowLoading(isWorkflowQueryLoading);
    setIsLogsLoading(isLogsQueryLoading);
    setIsStatsLoading(isStatsQueryLoading || isTrendsQueryLoading || isHeatmapQueryLoading);
  }, [
    workflowData, logsData, statsData, trendsData, heatmapData, 
    isWorkflowQueryLoading, isLogsQueryLoading, isStatsQueryLoading, 
    isTrendsQueryLoading, isHeatmapQueryLoading, selectedExecutionId
  ]);

  // Update execution detail state
  useEffect(() => {
    if (executionDetail) {
      setExecDetail(executionDetail);
    }
  }, [executionDetail]);

  // Poll for node execution updates when in timeline view
  useEffect(() => {
    if (activeTab === 'timeline' && selectedExecutionId) {
      const pollInterval = setInterval(async () => {
        try {
          const updatedExecution = await executionService.getExecution(selectedExecutionId);
          if (updatedExecution && JSON.stringify(updatedExecution) !== JSON.stringify(execDetail)) {
            setExecDetail(updatedExecution);
          }
        } catch (error) {
          console.error('Error polling execution details:', error);
        }
      }, 2000); // Poll every 2 seconds

      return () => clearInterval(pollInterval);
    }
  }, [activeTab, selectedExecutionId, execDetail]);

  // Poll for new execution logs when in history view
  useEffect(() => {
    if (activeTab === 'history' && workflowId) {
      const pollInterval = setInterval(async () => {
        try {
          const updatedLogs = await executionService.getWorkflowExecutions(workflowId);
          if (updatedLogs && updatedLogs.length !== executionLogs.length) {
            setExecutionLogs(updatedLogs);
          }
        } catch (error) {
          console.error('Error polling execution logs:', error);
        }
      }, 5000); // Poll every 5 seconds

      return () => clearInterval(pollInterval);
    }
  }, [activeTab, workflowId, executionLogs.length]);

  // Calculate execution summary
  const executionSummary = {
    total: executionLogs.length,
    successful: executionLogs.filter((log) => log.status === 'completed').length,
    failed: executionLogs.filter((log) => log.status === 'failed').length,
  };

  return {
    workflow,
    executionLogs,
    stats,
    trends,
    heatmap,
    isWorkflowLoading,
    isLogsLoading,
    isStatsLoading,
    executionSummary,
    selectedExecutionId,
    setSelectedExecutionId,
    execDetail,
    activeTab,
    setActiveTab,
  };
}
