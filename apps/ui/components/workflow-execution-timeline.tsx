"use client";

import React, { useRef, useState, useEffect } from "react";
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
import { TabsContent } from "@/components/ui/tabs";
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
import { workflowsApi, executionsApi, type NodeExecution as ApiNodeExecution, type NodeLog as ApiNodeLog } from "@/lib/services/api";

// Types
interface NodeExecution {
  id: string;
  node_id: string;
  node_type?: string;
  status: "pending" | "running" | "completed" | "failed" | "paused";
  started_at?: string | null;
  completed_at?: string | null;
  duration?: number;
  error?: string | null;
  logs?: LogEntry[];
}

interface LogEntry {
  id: string;
  node_id?: string;
  timestamp: string;
  level: "info" | "warning" | "error" | "debug";
  message: string;
  data?: unknown;
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
  start: number;
  duration: number;
  status: string;
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
  refreshInterval = 5000 
}: WorkflowTimelineProps) {
  // State
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<"all" | "info" | "warning" | "error" | "debug">("all");
  const [modalLog, setModalLog] = useState<LogEntry | null>(null);
  const [pausedSnapshot, setPausedSnapshot] = useState<any>(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const [replaying, setReplaying] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [isNodeExpanded, setIsNodeExpanded] = useState(false);
  const pausedInputRef = useRef<HTMLTextAreaElement>(null);
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

  // Fetch execution details when selection changes
  const {
    data: execDetail,
    isLoading: executionDetailLoading,
    error: executionDetailError,
  } = useQuery({
    queryKey: ['executionDetail', selectedExecutionId],
    queryFn: async (): Promise<ExecutionDetail | null> => {
      if (!selectedExecutionId) return null;

      try {
        // Get the execution
        const execution = executionsData?.executions.find(e => e.id === selectedExecutionId);
        if (!execution) throw new Error('Execution not found');

        // Get node executions
        const nodeExecutions = await executionsApi.getNodeExecutions(selectedExecutionId);

        // Get logs for each node execution and transform the data
        const nodeExecutionsWithLogs = await Promise.all(
          nodeExecutions.map(async (nodeExec: ApiNodeExecution, index: number) => {
            try {
              // Use a generated ID since API doesn't provide one
              const nodeExecutionId = `${selectedExecutionId}-${nodeExec.node_id}-${index}`;
              const logs = await executionsApi.getNodeLogs(nodeExecutionId);
              
              return {
                id: nodeExecutionId,
                node_id: nodeExec.node_id,
                node_type: nodeExec.node_type,
                status: nodeExec.status as "pending" | "running" | "completed" | "failed" | "paused",
                started_at: nodeExec.started_at,
                completed_at: nodeExec.completed_at,
                error: nodeExec.error,
                logs: logs.map((log: ApiNodeLog, logIndex: number) => ({
                  id: `${nodeExecutionId}-log-${logIndex}`,
                  node_id: nodeExec.node_id,
                  timestamp: log.timestamp,
                  level: log.level as "info" | "warning" | "error" | "debug",
                  message: log.message,
                  data: log.metadata,
                })),
              };
            } catch (error) {
              console.warn(`Failed to fetch logs for node ${nodeExec.node_id}:`, error);
              return {
                id: `${selectedExecutionId}-${nodeExec.node_id}-${index}`,
                node_id: nodeExec.node_id,
                node_type: nodeExec.node_type,
                status: nodeExec.status as "pending" | "running" | "completed" | "failed" | "paused",
                started_at: nodeExec.started_at,
                completed_at: nodeExec.completed_at,
                error: nodeExec.error,
                logs: [],
              };
            }
          })
        );

        // Aggregate all logs from all nodes
        const allLogs: LogEntry[] = nodeExecutionsWithLogs
          .flatMap(nodeExec => 
            (nodeExec.logs || []).map((log) => ({
              id: log.id || `${nodeExec.node_id}-${log.timestamp}`,
              node_id: nodeExec.node_id,
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

  // Auto-select first execution when data loads
  useEffect(() => {
    if (executionsData?.executions.length && !selectedExecutionId) {
      setSelectedExecutionId(executionsData.executions[0].id);
    }
  }, [executionsData, selectedExecutionId]);

  // Generate timeline data from execution detail
  const timelineData = React.useMemo(() => {
    if (!execDetail || !workflow) return [];

    const startTime = new Date(execDetail.startedAt).getTime();

    return execDetail.nodeExecutions
      .filter((node) => node.started_at) // Only include nodes that have started
      .map((node) => {
        const start = new Date(node.started_at!).getTime() - startTime;
        let duration = 0;

        if (node.completed_at) {
          duration =
            new Date(node.completed_at).getTime() -
            new Date(node.started_at!).getTime();
        } else if (node.status === "running" || node.status === "paused") {
          // For running nodes, use current time as end time
          duration = Date.now() - new Date(node.started_at!).getTime();
        }

        return {
          name: node.node_id,
          start,
          duration,
          status: node.status,
        };
      })
      .sort((a, b) => a.start - b.start);
  }, [execDetail, workflow]);

  // Auto-select first node when timeline data changes
  useEffect(() => {
    if (timelineData.length > 0 && !selectedNodeId) {
      setSelectedNodeId(timelineData[0].name);
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

  // Format time for chart
  const formatTime = (time: number) => {
    if (!execDetail) return "";
    const date = new Date(new Date(execDetail.startedAt).getTime() + time);
    return format(date, "HH:mm:ss");
  };

  // Format duration for tooltip
  const formatDuration = (duration: number) => {
    return `${(duration / 1000).toFixed(2)}s`;
  };

  // Get node name from ID
  const getNodeName = (nodeId: string) => {
    if (!workflow) return nodeId;
    const node = workflow.nodes?.find((n: WorkflowNode) => n.id === nodeId);
    return node?.data?.label || node?.data?.name || node?.type || nodeId;
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
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
  };

  // Get log level icon
  const getLogLevelIcon = (level: string) => {
    switch (level) {
      case "error":
        return <AlertCircle className='h-4 w-4 text-red-500' />;
      case "warning":
        return <AlertCircle className='h-4 w-4 text-amber-500' />;
      default:
        return <Info className='h-4 w-4 text-blue-500' />;
    }
  };

  // Custom tooltip component for the timeline chart
  const CustomTooltip = ({
    active,
    payload,
  }: TooltipProps<number, string>) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
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
        </div>
      );
    }
    return null;
  };

  // Handle node action (pause, cancel, retry)
  const handleNodeAction = async (action: string, nodeId?: string) => {
    if (!selectedExecutionId) return;

    try {
      let message = "";
      switch (action) {
        case "pause":
          await executionsApi.pauseExecution(selectedExecutionId, nodeId);
          message = "Execution paused successfully";
          break;
        case "cancel":
          await executionsApi.cancelExecution(selectedExecutionId, nodeId);
          message = "Execution canceled successfully";
          break;
        case "retry":
          await executionsApi.retryExecution(selectedExecutionId, nodeId);
          message = "Retry initiated successfully";
          break;
        case "resume":
          await executionsApi.resumeExecution(selectedExecutionId, nodeId);
          message = "Execution resumed successfully";
          break;
      }

      toast({
        title: message,
        variant: "default",
      });

      // Refresh execution detail
      queryClient.invalidateQueries({ queryKey: ['executionDetail', selectedExecutionId] });
    } catch (error) {
      toast({
        title: `Failed to ${action} execution`,
        description: "There was an error processing your request.",
        variant: "destructive",
      });
    }
  };

  // Get paused node snapshot
  const getPausedNodeSnapshot = async (executionId: string, nodeId: string) => {
    try {
      // This would be a real API call in production
      // For now, return mock data since the API endpoint doesn't exist yet
      return {
        inputData: {
          parameters: {
            threshold: 0.85,
            maxItems: 10,
          },
          data: {
            items: [
              { id: 1, name: "Item 1", value: 42 },
              { id: 2, name: "Item 2", value: 18 },
            ],
          },
        },
      };
    } catch (error) {
      toast({
        title: "Failed to fetch node snapshot",
        description: "There was an error loading the node snapshot.",
        variant: "destructive",
      });
      return null;
    }
  };

  // Handle resume action for paused nodes
  const handleResume = async () => {
    if (!selectedExecutionId || !selectedNodeId) return;

    setResumeLoading(true);
    try {
      let resumeData;
      try {
        resumeData = JSON.parse(pausedInputRef.current?.value || "{}");
      } catch {
        toast({
          title: "Invalid input JSON",
          variant: "destructive",
        });
        setResumeLoading(false);
        return;
      }

      await executionsApi.resumeExecution(selectedExecutionId, selectedNodeId);

      toast({
        title: "Execution resumed successfully",
        variant: "default",
      });

      setPausedSnapshot(null);
      queryClient.invalidateQueries({ queryKey: ['executionDetail', selectedExecutionId] });
    } catch (error) {
      toast({
        title: "Failed to resume execution",
        description: "There was an error processing your request.",
        variant: "destructive",
      });
    } finally {
      setResumeLoading(false);
    }
  };

  // Find selected node execution
  const getSelectedNodeExecution = () => {
    if (!execDetail || !selectedNodeId) return null;

    let nodeExec = execDetail.nodeExecutions.find(
      (n) => n.node_id === selectedNodeId
    );

    if (!nodeExec && workflow) {
      // Synthesize a pending node execution if not found
      const nodeDef = workflow.nodes.find((n) => n.id === selectedNodeId);
      if (nodeDef) {
        nodeExec = {
          id: `pending-${selectedNodeId}`,
          node_id: selectedNodeId,
          status: "pending",
        } as NodeExecution;
      }
    }

    return nodeExec;
  };

  // Get filtered logs for selected node
  const getFilteredLogs = () => {
    if (!execDetail || !selectedNodeId) return [];

    return execDetail.logs
      .filter(
        (l) =>
          l.node_id === selectedNodeId &&
          (levelFilter === "all" || l.level === levelFilter)
      )
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  };

  // Get status color for timeline bars
  const getStatusColor = (status: string, isHighlighted: boolean) => {
    if (isHighlighted) return "#f43f5e"; // Highlighted node (replay)

    switch (status) {
      case "completed":
        return "#22c55e";
      case "failed":
        return "#ef4444";
      case "running":
        return "#3b82f6";
      case "paused":
        return "#f59e0b";
      default:
        return "#a3a3a3";
    }
  };

  const isLoading = executionsLoading || executionDetailLoading;
  const executionLogs = executionsData?.executions || [];

  return (
    <TabsContent value='timeline' className='space-y-6'>
      <Card>
        <CardHeader className='pb-4'>
          <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
            <div>
              <CardTitle className='text-xl'>Workflow Timeline</CardTitle>
              <CardDescription>
                Visualize node execution timing and performance
              </CardDescription>
            </div>

            <div className='flex items-center gap-2'>
              <TooltipProvider>
                <UITooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size='sm'
                      variant={replaying ? "default" : "outline"}
                      onClick={() => setReplaying((r) => !r)}
                      disabled={timelineData.length === 0}>
                      {replaying ? (
                        <>
                          <Pause className='h-4 w-4 mr-1' />
                          Stop
                        </>
                      ) : (
                        <>
                          <Play className='h-4 w-4 mr-1' />
                          Replay
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {replaying
                      ? "Stop animation"
                      : "Replay execution step by step"}
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>

              {replaying && (
                <Badge variant='outline' className='h-7 px-2'>
                  <Clock className='h-3 w-3 mr-1' />
                  Step {replayIndex + 1}/{timelineData.length}
                </Badge>
              )}

              <Button
                size='sm'
                variant='outline'
                onClick={() => refetchExecutions()}
                disabled={isLoading}>
                <RotateCcw
                  className={`h-4 w-4 mr-1 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className='space-y-4'>
            <div>
              <label
                htmlFor='select-execution'
                className='text-sm font-medium block mb-2'>
                Select Execution
              </label>

              {isLoading && !executionLogs.length ? (
                <Skeleton className='h-10 w-full' />
              ) : (
                <Select
                  value={selectedExecutionId || ""}
                  onValueChange={setSelectedExecutionId}
                  disabled={isLoading}>
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='Select an execution' />
                  </SelectTrigger>
                  <SelectContent>
                    {executionLogs.map((log) => (
                      <SelectItem key={log.id} value={log.id}>
                        {log.id.substring(0, 8)} –{" "}
                        {log.startedAt && format(new Date(log.startedAt), "MMM d, h:mm:ss a")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {isLoading && selectedExecutionId ? (
              <div className='h-[300px] w-full flex items-center justify-center'>
                <div className='flex flex-col items-center gap-2'>
                  <Loader2 className='h-8 w-8 animate-spin text-primary' />
                  <p className='text-sm text-muted-foreground'>
                    Loading timeline data...
                  </p>
                </div>
              </div>
            ) : execDetail ? (
              <div className='border rounded-lg p-4 bg-gray-50'>
                <ResponsiveContainer width='100%' height={300}>
                  <BarChart
                    data={timelineData}
                    layout='vertical'
                    margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
                    <CartesianGrid strokeDasharray='3 3' stroke='#e5e7eb' />
                    <XAxis
                      type='number'
                      domain={["auto", "auto"]}
                      tickFormatter={formatTime}
                      stroke='#6b7280'
                      fontSize={12}
                    />
                    <YAxis
                      dataKey='name'
                      type='category'
                      width={150}
                      tickFormatter={getNodeName}
                      stroke='#6b7280'
                      fontSize={12}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey='duration'
                      onClick={(_, idx) =>
                        setSelectedNodeId(timelineData[idx].name)
                      }
                      radius={[4, 4, 4, 4]}>
                      {timelineData.map((item, idx) => (
                        <Cell
                          key={idx}
                          fill={getStatusColor(
                            item.status,
                            idx === replayIndex
                          )}
                          stroke={
                            item.name === selectedNodeId ? "#000000" : "none"
                          }
                          strokeWidth={2}
                          cursor='pointer'
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                <div className='flex justify-center mt-4 gap-4'>
                  {["completed", "running", "failed", "paused", "pending"].map(
                    (status) => (
                      <div key={status} className='flex items-center gap-1'>
                        <div
                          className='w-3 h-3 rounded-sm'
                          style={{
                            backgroundColor: getStatusColor(status, false),
                          }}
                        />
                        <span className='text-xs capitalize'>{status}</span>
                      </div>
                    )
                  )}
                </div>
              </div>
            ) : (
              <div className='h-[300px] w-full flex items-center justify-center border rounded-lg'>
                <div className='text-center'>
                  <p className='text-muted-foreground'>
                    Select an execution to view the timeline
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedNodeId && execDetail && (
        <Card>
          <CardHeader className='pb-2'>
            <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2'>
              <div className='flex items-center gap-2'>
                <CardTitle className='text-lg'>
                  Node: {getNodeName(selectedNodeId)}
                </CardTitle>
                {getSelectedNodeExecution() &&
                  getStatusBadge(getSelectedNodeExecution()!.status)}
              </div>

              <div className='flex flex-wrap items-center gap-2'>
                <Select
                  value={levelFilter}
                  onValueChange={(value) => setLevelFilter(value as any)}>
                  <SelectTrigger className='h-8 text-xs w-[110px]'>
                    <SelectValue placeholder='Filter logs' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All Levels</SelectItem>
                    <SelectItem value='info'>Info</SelectItem>
                    <SelectItem value='warning'>Warning</SelectItem>
                    <SelectItem value='error'>Error</SelectItem>
                    <SelectItem value='debug'>Debug</SelectItem>
                  </SelectContent>
                </Select>

                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() => handleNodeAction("pause")}
                        disabled={
                          isLoading ||
                          !getSelectedNodeExecution() ||
                          getSelectedNodeExecution()!.status !== "running"
                        }>
                        <Pause className='h-4 w-4' />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Pause Execution</TooltipContent>
                  </UITooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() => handleNodeAction("cancel")}
                        disabled={
                          isLoading ||
                          !getSelectedNodeExecution() ||
                          !["running", "paused"].includes(
                            getSelectedNodeExecution()!.status
                          )
                        }>
                        <X className='h-4 w-4' />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Cancel Execution</TooltipContent>
                  </UITooltip>
                </TooltipProvider>

                <TooltipProvider>
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size='sm'
                        variant='outline'
                        onClick={() =>
                          handleNodeAction("retry", selectedNodeId)
                        }
                        disabled={
                          isLoading ||
                          !getSelectedNodeExecution() ||
                          getSelectedNodeExecution()!.status !== "failed"
                        }>
                        <RotateCcw className='h-4 w-4' />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Retry Node</TooltipContent>
                  </UITooltip>
                </TooltipProvider>

                {getSelectedNodeExecution()?.status === "paused" && (
                  <Button
                    size='sm'
                    variant='default'
                    className='bg-green-600 hover:bg-green-700'
                    onClick={() => setIsNodeExpanded(true)}>
                    <Play className='h-4 w-4 mr-1' />
                    Resume
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {getSelectedNodeExecution()?.status === "paused" && (
              <Collapsible
                open={isNodeExpanded}
                onOpenChange={setIsNodeExpanded}
                className='mb-4 space-y-2'>
                <CollapsibleTrigger asChild>
                  <Button
                    variant='outline'
                    size='sm'
                    className='flex items-center justify-between w-full'>
                    <span>Paused Node Input Snapshot</span>
                    {isNodeExpanded ? (
                      <ChevronDown className='h-4 w-4' />
                    ) : (
                      <ChevronRight className='h-4 w-4' />
                    )}
                  </Button>
                </CollapsibleTrigger>

                <CollapsibleContent className='space-y-2'>
                  <div className='flex justify-between items-center'>
                    <Button
                      size='sm'
                      variant='outline'
                      onClick={async () => {
                        const snap = await getPausedNodeSnapshot(
                          selectedExecutionId!,
                          selectedNodeId
                        );
                        setPausedSnapshot(snap);
                        if (snap && pausedInputRef.current) {
                          pausedInputRef.current.value = JSON.stringify(
                            snap.inputData,
                            null,
                            2
                          );
                        }
                      }}
                      disabled={isLoading}>
                      {isLoading ? (
                        <Loader2 className='h-4 w-4 animate-spin mr-1' />
                      ) : (
                        <RotateCcw className='h-4 w-4 mr-1' />
                      )}
                      Load Snapshot
                    </Button>

                    <Badge variant='outline' className='text-xs'>
                      Edit before resuming
                    </Badge>
                  </div>

                  <div className='relative'>
                    <textarea
                      ref={pausedInputRef}
                      className='w-full border rounded-md p-3 font-mono text-xs bg-gray-50 min-h-[200px]'
                      defaultValue={
                        pausedSnapshot
                          ? JSON.stringify(pausedSnapshot.inputData, null, 2)
                          : ""
                      }
                      placeholder='Input snapshot JSON will appear here...'
                    />
                  </div>

                  <div className='flex justify-end'>
                    <Button
                      size='sm'
                      variant='default'
                      className='bg-green-600 hover:bg-green-700'
                      disabled={resumeLoading}
                      onClick={handleResume}>
                      {resumeLoading ? (
                        <Loader2 className='h-4 w-4 animate-spin mr-1' />
                      ) : (
                        <Play className='h-4 w-4 mr-1' />
                      )}
                      Resume Execution
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            <div className='border rounded-md'>
              <div className='p-2 bg-muted flex items-center justify-between'>
                <h3 className='text-sm font-medium'>Node Logs</h3>
                <Badge variant='outline' className='text-xs'>
                  {getFilteredLogs().length} entries
                </Badge>
              </div>

              <ScrollArea className='h-[300px]'>
                {getFilteredLogs().length > 0 ? (
                  <ul className='divide-y'>
                    {getFilteredLogs().map((log) => (
                      <li key={log.id} className='p-2 hover:bg-muted/50'>
                        <div className='flex items-start justify-between'>
                          <div className='flex items-start gap-2'>
                            {getLogLevelIcon(log.level)}
                            <div>
                              <div className='flex items-center gap-2'>
                                <span className='text-xs font-mono text-muted-foreground'>
                                  {format(new Date(log.timestamp), "HH:mm:ss")}
                                </span>
                                <Badge
                                  variant='outline'
                                  className={`text-[10px] px-1 ${
                                    log.level === "error"
                                      ? "bg-red-50 text-red-700"
                                      : log.level === "warning"
                                        ? "bg-amber-50 text-amber-700"
                                        : "bg-blue-50 text-blue-700"
                                  }`}>
                                  {log.level.toUpperCase()}
                                </Badge>
                              </div>
                              <p className='text-sm mt-1'>{log.message}</p>
                            </div>
                          </div>

                          {log.data && (
                            <Button
                              variant='ghost'
                              size='sm'
                              className='h-7 text-xs'
                              onClick={() => setModalLog(log)}>
                              View Details
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className='flex flex-col items-center justify-center h-full p-6 text-center'>
                    <Info className='h-8 w-8 text-muted-foreground mb-2 opacity-50' />
                    <p className='text-sm text-muted-foreground'>
                      No logs available for this node
                    </p>
                    {getSelectedNodeExecution()?.status === "pending" && (
                      <p className='text-xs text-muted-foreground mt-1'>
                        This node has not started execution yet
                      </p>
                    )}
                  </div>
                )}
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Log details dialog */}
      <Dialog
        open={!!modalLog}
        onOpenChange={(open) => !open && setModalLog(null)}>
        <DialogContent className='max-w-3xl'>
          <DialogHeader>
            <DialogTitle>Log Details</DialogTitle>
            <DialogDescription>
              {modalLog && (
                <div className='flex items-center gap-2 mt-1'>
                  <Badge
                    variant='outline'
                    className={
                      modalLog.level === "error"
                        ? "bg-red-50 text-red-700"
                        : modalLog.level === "warning"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-blue-50 text-blue-700"
                    }>
                    {modalLog.level.toUpperCase()}
                  </Badge>
                  <span className='text-sm'>
                    {modalLog &&
                      format(
                        new Date(modalLog.timestamp),
                        "MMM d, yyyy HH:mm:ss"
                      )}
                  </span>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className='max-h-[60vh]'>
            <pre className='p-4 bg-gray-50 rounded-md text-sm font-mono overflow-auto'>
              {modalLog
                ? JSON.stringify(modalLog.data || modalLog, null, 2)
                : "No data available"}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </TabsContent>
  );
}
