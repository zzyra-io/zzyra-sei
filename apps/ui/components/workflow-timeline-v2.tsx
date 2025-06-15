"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { format } from "date-fns";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  type TooltipProps,
} from "recharts";
import {
  Loader2,
  Play,
  Pause,
  RotateCcw,
  X,
  ChevronRight,
  ChevronDown,
  Clock,
  AlertCircle,
  Info,
  RefreshCw,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

import { executionService } from "@/lib/services/execution-service";
import { workflowsApi } from "@/lib/services/api";

// Types
interface NodeExecution {
  id: string;
  node_id: string;
  node_type: string;
  status: "pending" | "running" | "completed" | "failed" | "paused";
  started_at: string | null;
  completed_at: string | null;
  duration?: number;
  error?: string;
  output_data?: Record<string, unknown>;
  input_data?: Record<string, unknown>;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warning" | "error" | "debug";
  message: string;
  data?: Record<string, unknown>;
}

interface ExecutionDetail {
  id: string;
  workflowId: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
  error?: string;
  nodeExecutions: NodeExecution[];
  logs: LogEntry[];
}

interface TimelineDataPoint {
  name: string;
  nodeId: string;
  start: number;
  duration: number;
  status: string;
  nodeType: string;
  error?: string;
}

interface WorkflowNode {
  id: string;
  type: string;
  data: {
    label?: string;
    name?: string;
  };
}

interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
}

interface WorkflowTimelineProps {
  workflowId: string;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export default function WorkflowTimeline({
  workflowId,
  autoRefresh = true,
  refreshInterval = 5000,
}: WorkflowTimelineProps) {
  // State
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<"all" | "info" | "warning" | "error" | "debug">("all");
  const [modalLog, setModalLog] = useState<LogEntry | null>(null);
  const [isNodeExpanded, setIsNodeExpanded] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch workflow details
  const {
    data: workflow,
    isLoading: workflowLoading,
    error: workflowError,
  } = useQuery({
    queryKey: ['workflow', workflowId],
    queryFn: () => workflowsApi.getWorkflow(workflowId),
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
    queryFn: () => executionService.getExecutions({ 
      workflowId, 
      limit: 50, 
      sortKey: 'startedAt', 
      sortOrder: 'desc' 
    }),
    enabled: !!workflowId,
    refetchInterval: autoRefresh ? refreshInterval : false,
    staleTime: 30 * 1000, // 30 seconds
  });

  // Fetch detailed execution data
  const {
    data: executionDetail,
    isLoading: executionDetailLoading,
    error: executionDetailError,
  } = useQuery({
    queryKey: ['execution-detail', selectedExecutionId],
    queryFn: async (): Promise<ExecutionDetail | null> => {
      if (!selectedExecutionId) return null;

      try {
        const [execution, nodeExecutions] = await Promise.all([
          executionService.getExecution(selectedExecutionId),
          executionService.getNodeExecutions(selectedExecutionId),
        ]);

        // Fetch logs for each node execution
        const nodeExecutionsWithLogs = await Promise.all(
          nodeExecutions.map(async (nodeExec) => {
            try {
              const logs = await executionService.getNodeLogs(nodeExec.id || nodeExec.node_id);
              return {
                id: nodeExec.id || nodeExec.node_id,
                node_id: nodeExec.node_id,
                node_type: nodeExec.node_type || 'unknown',
                status: nodeExec.status,
                started_at: nodeExec.started_at,
                completed_at: nodeExec.completed_at,
                error: nodeExec.error,
                output_data: nodeExec.output_data,
                input_data: nodeExec.input_data,
                logs: logs || [],
              } as NodeExecution;
            } catch (error) {
              console.warn(`Failed to fetch logs for node ${nodeExec.node_id}:`, error);
              return {
                id: nodeExec.id || nodeExec.node_id,
                node_id: nodeExec.node_id,
                node_type: nodeExec.node_type || 'unknown',
                status: nodeExec.status,
                started_at: nodeExec.started_at,
                completed_at: nodeExec.completed_at,
                error: nodeExec.error,
                output_data: nodeExec.output_data,
                input_data: nodeExec.input_data,
              } as NodeExecution;
            }
          })
        );

        // Aggregate all logs from all nodes
        const allLogs: LogEntry[] = nodeExecutionsWithLogs
          .flatMap(nodeExec => 
            (nodeExec.logs || []).map((log) => ({
              id: log.id || `${nodeExec.node_id}-${log.timestamp}`,
              timestamp: log.timestamp,
              level: log.level as "info" | "warning" | "error" | "debug",
              message: log.message,
              data: log.data,
            }))
          )
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        return {
          id: execution.id,
          workflowId: execution.workflowId,
          status: execution.status,
          startedAt: execution.startedAt || new Date().toISOString(),
          finishedAt: execution.finishedAt,
          error: execution.error,
          nodeExecutions: nodeExecutionsWithLogs,
          logs: allLogs,
        };
      } catch (error) {
        console.error('Failed to fetch execution detail:', error);
        throw error;
      }
    },
    enabled: !!selectedExecutionId,
    refetchInterval: autoRefresh && selectedExecutionId ? refreshInterval : false,
    staleTime: 10 * 1000, // 10 seconds for active execution details
  });

  // Generate timeline data from execution details
  const timelineData = useMemo((): TimelineDataPoint[] => {
    if (!executionDetail?.nodeExecutions) return [];

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
          nodeType: (node.input_data?.parameters as any)?.nodeType || 'unknown',
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

  // Handle replay animation
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (replaying && timelineData.length > 0) {
      timer = setTimeout(() => {
        setReplayIndex((prev) => {
          const next = prev + 1;
          if (next >= timelineData.length) {
            setReplaying(false);
            return 0;
          }
          return next;
        });
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [replaying, replayIndex, timelineData]);

  // Utility functions
  const formatTime = useCallback((time: number) => {
    if (!executionDetail) return "";
    const date = new Date(new Date(executionDetail.startedAt).getTime() + time);
    return format(date, "HH:mm:ss");
  }, [executionDetail]);

  const formatDuration = useCallback((duration: number) => {
    return `${(duration / 1000).toFixed(2)}s`;
  }, []);

  const getNodeName = useCallback((nodeId: string) => {
    if (!workflow?.nodes) return nodeId;
    const node = workflow.nodes.find((n) => n.id === nodeId);
    return node?.data?.label || node?.data?.name || node?.type || nodeId;
  }, [workflow]);

  const getStatusBadge = useCallback((status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge className='bg-green-100 text-green-800 hover:bg-green-200'>
            Completed
          </Badge>
        );
      case "failed":
        return (
          <Badge className='bg-red-100 text-red-800 hover:bg-red-200'>
            Failed
          </Badge>
        );
      case "running":
        return (
          <Badge className='bg-blue-100 text-blue-800 hover:bg-blue-200'>
            Running
          </Badge>
        );
      case "paused":
        return (
          <Badge className='bg-amber-100 text-amber-800 hover:bg-amber-200'>
            Paused
          </Badge>
        );
      default:
        return (
          <Badge className='bg-gray-100 text-gray-800 hover:bg-gray-200'>
            Pending
          </Badge>
        );
    }
  }, []);

  const getLogLevelIcon = useCallback((level: string) => {
    switch (level) {
      case "error":
        return <AlertCircle className='h-4 w-4 text-red-500' />;
      case "warning":
        return <AlertCircle className='h-4 w-4 text-amber-500' />;
      default:
        return <Info className='h-4 w-4 text-blue-500' />;
    }
  }, []);

  const getStatusColor = useCallback((status: string, isHighlighted: boolean) => {
    const colors = {
      completed: isHighlighted ? "#10b981" : "#34d399",
      failed: isHighlighted ? "#ef4444" : "#f87171",
      running: isHighlighted ? "#3b82f6" : "#60a5fa",
      paused: isHighlighted ? "#f59e0b" : "#fbbf24",
      pending: isHighlighted ? "#6b7280" : "#9ca3af",
    };
    return colors[status as keyof typeof colors] || colors.pending;
  }, []);

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
    }
  }, [toast, queryClient, workflowId]);

  // Get filtered logs
  const getFilteredLogs = useCallback(() => {
    if (!executionDetail?.logs) return [];

    let logs = executionDetail.logs;

    // Filter by selected node if one is selected
    if (selectedNodeId) {
      logs = logs.filter(log => {
        // Find the node execution that contains this log
        const nodeExec = executionDetail.nodeExecutions.find(ne => ne.node_id === selectedNodeId);
        return nodeExec && (nodeExec.logs || []).some(l => l.id === log.id);
      });
    }

    // Filter by log level
    if (levelFilter !== 'all') {
      logs = logs.filter(log => log.level === levelFilter);
    }

    return logs;
  }, [executionDetail, selectedNodeId, levelFilter]);

  // Custom tooltip component for the timeline chart
  const CustomTooltip = ({
    active,
    payload,
  }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as TimelineDataPoint;
      return (
        <div className='bg-white p-3 border rounded-md shadow-md'>
          <p className='font-medium'>{getNodeName(data.name)}</p>
          <p className='text-sm text-gray-500'>
            Start: {formatTime(data.start)}
          </p>
          <p className='text-sm text-gray-500'>
            Duration: {formatDuration(data.duration)}
          </p>
          <p className='text-sm mt-1 flex items-center gap-1'>
            Status: {getStatusBadge(data.status)}
          </p>
          {data.error && (
            <p className='text-sm text-red-600 mt-1'>
              Error: {data.error}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const isLoading = workflowLoading || executionsLoading || executionDetailLoading;
  const error = workflowError || executionsError || executionDetailError;

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-red-600">Error Loading Timeline</CardTitle>
          <CardDescription>
            {error instanceof Error ? error.message : 'An unexpected error occurred'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => window.location.reload()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Workflow Timeline</CardTitle>
              <CardDescription>
                Visualize node execution timing and performance
                {workflow && ` for ${workflow.name}`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        refetchExecutions();
                        if (selectedExecutionId) {
                          queryClient.invalidateQueries({ 
                            queryKey: ['execution-detail', selectedExecutionId] 
                          });
                        }
                      }}
                      disabled={isLoading}
                    >
                      <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh timeline data</TooltipContent>
                </UITooltip>
              </TooltipProvider>
              
              {timelineData.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setReplaying(!replaying);
                    if (!replaying) setReplayIndex(0);
                  }}
                  disabled={isLoading}
                >
                  {replaying ? (
                    <>
                      <Pause className="h-4 w-4 mr-2" />
                      Pause Replay
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Replay Timeline
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Execution Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Execution</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : (
            <Select
              value={selectedExecutionId || ""}
              onValueChange={setSelectedExecutionId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an execution to view timeline" />
              </SelectTrigger>
              <SelectContent>
                {executionsData?.executions.map((execution) => (
                  <SelectItem key={execution.id} value={execution.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>
                        {execution.id.substring(0, 8)} - {execution.status}
                      </span>
                      <span className="text-sm text-gray-500 ml-2">
                        {execution.startedAt ? format(new Date(execution.startedAt), "MMM d, HH:mm") : 'Unknown'}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Timeline Chart */}
      {selectedExecutionId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Execution Timeline</CardTitle>
            <CardDescription>
              Node execution timing and duration visualization
            </CardDescription>
          </CardHeader>
          <CardContent>
            {executionDetailLoading ? (
              <div className="h-64 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading timeline data...</span>
              </div>
            ) : timelineData.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={timelineData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="start"
                      type="number"
                      scale="linear"
                      domain={['dataMin', 'dataMax']}
                      tickFormatter={formatTime}
                    />
                    <YAxis
                      dataKey="name"
                      type="category"
                      width={120}
                      tickFormatter={getNodeName}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="duration" fill="#8884d8">
                      {timelineData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={getStatusColor(
                            entry.status,
                            replaying && index <= replayIndex
                          )}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No timeline data available</p>
                  <p className="text-sm">This execution may not have started yet</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Node Details and Logs */}
      {selectedExecutionId && executionDetail && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Node Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Node Details</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedNodeId || ""}
                onValueChange={setSelectedNodeId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a node to view details" />
                </SelectTrigger>
                <SelectContent>
                  {timelineData.map((node) => (
                    <SelectItem key={node.nodeId} value={node.nodeId}>
                      <div className="flex items-center justify-between w-full">
                        <span>{getNodeName(node.nodeId)}</span>
                        {getStatusBadge(node.status)}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedNodeId && (
                <div className="mt-4 space-y-4">
                  {(() => {
                    const nodeExec = executionDetail.nodeExecutions.find(
                      n => n.node_id === selectedNodeId
                    );
                    if (!nodeExec) return null;

                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">Status:</span>
                          {getStatusBadge(nodeExec.status)}
                        </div>
                        
                        {nodeExec.started_at && (
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Started:</span>
                            <span className="text-sm">
                              {format(new Date(nodeExec.started_at), "MMM d, HH:mm:ss")}
                            </span>
                          </div>
                        )}
                        
                        {nodeExec.completed_at && (
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Completed:</span>
                            <span className="text-sm">
                              {format(new Date(nodeExec.completed_at), "MMM d, HH:mm:ss")}
                            </span>
                          </div>
                        )}
                        
                        {nodeExec.started_at && nodeExec.completed_at && (
                          <div className="flex items-center justify-between">
                            <span className="font-medium">Duration:</span>
                            <span className="text-sm">
                              {formatDuration(
                                new Date(nodeExec.completed_at).getTime() - 
                                new Date(nodeExec.started_at).getTime()
                              )}
                            </span>
                          </div>
                        )}
                        
                        {nodeExec.error && (
                          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                            <p className="text-sm text-red-700 font-medium">Error:</p>
                            <p className="text-sm text-red-600">{nodeExec.error}</p>
                          </div>
                        )}

                        {/* Action buttons for running/paused nodes */}
                        {(nodeExec.status === 'running' || nodeExec.status === 'paused') && (
                          <div className="flex gap-2 pt-2">
                            {nodeExec.status === 'running' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleExecutionAction('pause', executionDetail.id, nodeExec.node_id)}
                              >
                                <Pause className="h-4 w-4 mr-1" />
                                Pause
                              </Button>
                            )}
                            {nodeExec.status === 'paused' && (
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleExecutionAction('resume', executionDetail.id, nodeExec.node_id)}
                              >
                                <Play className="h-4 w-4 mr-1" />
                                Resume
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleExecutionAction('cancel', executionDetail.id, nodeExec.node_id)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        )}

                        {nodeExec.status === 'failed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleExecutionAction('retry', executionDetail.id, nodeExec.node_id)}
                          >
                            <RotateCcw className="h-4 w-4 mr-1" />
                            Retry Node
                          </Button>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Logs */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Execution Logs</CardTitle>
                <Select
                  value={levelFilter}
                  onValueChange={(value) => setLevelFilter(value as typeof levelFilter)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="info">Info</SelectItem>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="error">Error</SelectItem>
                    <SelectItem value="debug">Debug</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                {(() => {
                  const filteredLogs = getFilteredLogs();
                  
                  if (filteredLogs.length === 0) {
                    return (
                      <div className="flex items-center justify-center h-full text-gray-500">
                        <div className="text-center">
                          <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No logs available</p>
                          <p className="text-sm">
                            {selectedNodeId ? 'for selected node' : 'for this execution'}
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-2">
                      {filteredLogs.map((log) => (
                        <div
                          key={log.id}
                          className="p-3 border rounded-md hover:bg-gray-50 cursor-pointer"
                          onClick={() => setModalLog(log)}
                        >
                          <div className="flex items-start gap-2">
                            {getLogLevelIcon(log.level)}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500">
                                  {format(new Date(log.timestamp), "HH:mm:ss.SSS")}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    log.level === 'error' ? 'border-red-200 text-red-700' :
                                    log.level === 'warning' ? 'border-amber-200 text-amber-700' :
                                    'border-blue-200 text-blue-700'
                                  }`}
                                >
                                  {log.level.toUpperCase()}
                                </Badge>
                              </div>
                              <p className="text-sm mt-1 break-words">{log.message}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Log Detail Modal */}
      <Dialog open={!!modalLog} onOpenChange={() => setModalLog(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Log Details</DialogTitle>
            <DialogDescription>
              {modalLog && format(new Date(modalLog.timestamp), "MMM d, yyyy HH:mm:ss.SSS")}
            </DialogDescription>
          </DialogHeader>
          {modalLog && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {getLogLevelIcon(modalLog.level)}
                <Badge
                  variant="outline"
                  className={
                    modalLog.level === 'error' ? 'border-red-200 text-red-700' :
                    modalLog.level === 'warning' ? 'border-amber-200 text-amber-700' :
                    'border-blue-200 text-blue-700'
                  }
                >
                  {modalLog.level.toUpperCase()}
                </Badge>
              </div>
              <div>
                <h4 className="font-medium mb-2">Message</h4>
                <p className="text-sm bg-gray-50 p-3 rounded-md">{modalLog.message}</p>
              </div>
              {modalLog.data && (
                <div>
                  <h4 className="font-medium mb-2">Additional Data</h4>
                  <pre className="text-xs bg-gray-50 p-3 rounded-md overflow-auto max-h-64">
                    {JSON.stringify(modalLog.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 