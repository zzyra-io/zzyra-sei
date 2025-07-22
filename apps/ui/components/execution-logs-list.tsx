"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { executionsApi } from "@/lib/services/api";
import { type NodeLog, type UnifiedLog } from "@/lib/services/logs-service";
import { formatDistance } from "date-fns";
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  XCircle,
} from "lucide-react";
import React, {
  JSX,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

interface ExecutionLogsListProps {
  workflowId: string;
  workflow?: any;
}

interface WorkflowExecution {
  id: string;
  workflow_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  error: string | null;
  input_data?: Record<string, unknown>;
  output_data?: Record<string, unknown>;
  nodeExecutions?: NodeExecution[];
  executionLogs?: UnifiedLog[];
  nodeInputs?: Record<string, any[]>;
  nodeOutputs?: Record<string, any[]>;
}

interface NodeExecution {
  id: string;
  execution_id: string;
  node_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  error: string | null;
  input_data: Record<string, unknown> | null;
  output_data: Record<string, unknown> | null;
  logs?: NodeLog[];
}

export const ExecutionLogsList = React.memo(function ExecutionLogsList({
  workflowId,
  workflow,
}: ExecutionLogsListProps) {
  const { toast } = useToast();

  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>(
    () => {
      // Load expanded state from localStorage
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem(`execution-expanded-${workflowId}`);
        return saved ? JSON.parse(saved) : {};
      }
      return {};
    }
  );
  const [detailedData, setDetailedData] = useState<Record<string, any>>({});
  const [loadingExecutionIds, setLoadingExecutionIds] = useState<Set<string>>(
    new Set()
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const executionsRef = useRef<WorkflowExecution[]>([]);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  const ITEMS_PER_PAGE = 5; // Reduced for better performance

  // Persist expanded state to localStorage
  const persistExpandedState = useCallback(
    (newExpandedState: Record<string, boolean>) => {
      if (typeof window !== "undefined") {
        localStorage.setItem(
          `execution-expanded-${workflowId}`,
          JSON.stringify(newExpandedState)
        );
      }
    },
    [workflowId]
  );

  // Update expanded logs with persistence
  const updateExpandedLogs = useCallback(
    (newState: Record<string, boolean>) => {
      setExpandedLogs(newState);
      persistExpandedState(newState);
    },
    [persistExpandedState]
  );

  // Memoized polling condition
  const shouldPoll = useMemo(() => {
    return executions.some(
      (exec) => exec.status === "running" || exec.status === "pending"
    );
  }, [executions]);

  // Lazy load detailed data when tab is expanded
  const loadDetailedData = useCallback(
    async (executionId: string) => {
      if (detailedData[executionId]) return; // Already loaded

      setLoadingExecutionIds((prev) => new Set(prev).add(executionId));

      try {
        const detailedExecution =
          await executionsApi.getCompleteExecution(executionId);
        setDetailedData((prev) => ({
          ...prev,
          [executionId]: detailedExecution,
        }));
      } catch (error) {
        console.error(
          `Failed to load detailed data for execution ${executionId}:`,
          error
        );
      } finally {
        setLoadingExecutionIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(executionId);
          return newSet;
        });
      }
    },
    [detailedData]
  );

  // Update ref when executions change
  useEffect(() => {
    executionsRef.current = executions;
  }, [executions]);

  const [statusFilter, setStatusFilter] = useState<
    "all" | WorkflowExecution["status"]
  >("all");
  const [sortKey, setSortKey] = useState<"started_at" | "duration">(
    "started_at"
  );
  const [sortAsc, setSortAsc] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "all" | WorkflowExecution["status"]
  >("all");
  const [jsonViewerData, setJsonViewerData] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [isJsonDialogOpen, setIsJsonDialogOpen] = useState(false);
  const [offset] = useState(0);

  const fetchExecutions = useCallback(
    async (page = 1, append = false) => {
      try {
        setLoading(page === 1);
        setError(null);

        // Only fetch basic execution data initially
        const response = await executionsApi.getWorkflowExecutions(
          workflowId,
          ITEMS_PER_PAGE,
          (page - 1) * ITEMS_PER_PAGE
        );

        const transformedExecutions = response.data.map((execution: any) => ({
          id: execution.id,
          workflow_id: execution.workflowId,
          status: execution.status,
          started_at: execution.startedAt,
          completed_at: execution.completedAt,
          error: execution.error,
          // Don't load detailed data initially
          input_data: {},
          output_data: {},
          nodeExecutions: [],
          executionLogs: [],
          nodeInputs: {},
          nodeOutputs: {},
        }));

        if (append) {
          setExecutions((prev) => [...prev, ...transformedExecutions]);
        } else {
          setExecutions(transformedExecutions);
        }

        setHasMore(response.data.length === ITEMS_PER_PAGE);
        setCurrentPage(page);
      } catch (error) {
        console.error("Failed to fetch executions:", error);
        setError(
          error instanceof Error ? error.message : "Failed to fetch executions"
        );
      } finally {
        setLoading(false);
        setIsLoadingMore(false);
      }
    },
    [workflowId]
  ); // Keep workflowId dependency but memoize the function properly

  // Memoize the function to prevent unnecessary re-renders
  const memoizedFetchExecutions = useMemo(
    () => fetchExecutions,
    [fetchExecutions]
  );

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (!loadingRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          setIsLoadingMore(true);
          memoizedFetchExecutions(currentPage + 1, true);
        }
      },
      { threshold: 0.1 }
    );

    observerRef.current.observe(loadingRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoadingMore, currentPage, memoizedFetchExecutions]);

  // Initial load - only run once
  useEffect(() => {
    memoizedFetchExecutions(1);
  }, []); // Empty dependency array - only run on mount

  // Polling for real-time updates - optimized to not reset state
  useEffect(() => {
    if (!shouldPoll) return;

    const interval = setInterval(() => {
      // Only update running executions, don't reset the entire list
      const runningExecutions = executions.filter(
        (exec) => exec.status === "running" || exec.status === "pending"
      );

      if (runningExecutions.length > 0) {
        // Update only the running executions instead of fetching all
        Promise.all(
          runningExecutions.map(async (exec) => {
            try {
              const updatedExecution = await executionsApi.getCompleteExecution(
                exec.id
              );
              setExecutions((prev) =>
                prev.map((e) =>
                  e.id === exec.id
                    ? {
                        ...e,
                        status: updatedExecution.status,
                        completed_at: updatedExecution.completed_at,
                        error: updatedExecution.error,
                      }
                    : e
                )
              );
            } catch (error) {
              console.error(`Failed to update execution ${exec.id}:`, error);
            }
          })
        );
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [shouldPoll, executions]); // Only depend on shouldPoll and executions

  const toggleExpanded = useCallback(
    (executionId: string) => {
      const newExpandedState = {
        ...expandedLogs,
        [executionId]: !expandedLogs[executionId],
      };
      updateExpandedLogs(newExpandedState);

      // Load detailed data when expanding
      if (!expandedLogs[executionId] && !detailedData[executionId]) {
        loadDetailedData(executionId);
      }
    },
    [expandedLogs, detailedData, loadDetailedData, updateExpandedLogs]
  );

  const statusCounts = useMemo(() => {
    const counts = {
      all: executions.length,
      pending: 0,
      running: 0,
      completed: 0,
      failed: 0,
      paused: 0,
    };

    executions.forEach((log) => {
      const status = log.status as keyof typeof counts;
      if (counts[status] !== undefined) {
        counts[status]++;
      }
    });

    return counts;
  }, [executions]);

  const filteredLogs = useMemo(() => {
    if (activeTab === "all") return executions;
    return executions.filter((exec) => exec.status === activeTab);
  }, [executions, activeTab]);

  useEffect(() => {
    if (activeTab !== "all") {
      setStatusFilter(activeTab);
    } else {
      setStatusFilter("all");
    }
  }, [activeTab]);

  const formatDate = useCallback((date: string | null | undefined) => {
    if (!date) return "Unknown time";

    try {
      const dateObject = new Date(date);
      if (isNaN(dateObject.getTime())) {
        return "Invalid date";
      }

      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      }).format(dateObject);
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  }, []);

  const formatDuration = useCallback((start: string, end?: string | null) => {
    if (!end) return "In progress";
    const startDate = new Date(start);
    const endDate = new Date(end);
    return formatDistance(startDate, endDate);
  }, []);

  const getStatusBadge = useCallback((status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge
            variant='outline'
            className='bg-green-50 text-green-700 border-green-200'>
            Completed
          </Badge>
        );
      case "failed":
        return (
          <Badge
            variant='outline'
            className='bg-red-50 text-red-700 border-red-200'>
            Failed
          </Badge>
        );
      case "running":
        return (
          <Badge
            variant='outline'
            className='bg-blue-50 text-blue-700 border-blue-200'>
            Running
          </Badge>
        );
      case "paused":
        return (
          <Badge
            variant='outline'
            className='bg-amber-50 text-amber-700 border-amber-200'>
            Paused
          </Badge>
        );
      default:
        return (
          <Badge
            variant='outline'
            className='bg-gray-50 text-gray-700 border-gray-200'>
            Pending
          </Badge>
        );
    }
  }, []);

  const handleAction = useCallback(
    async (action: string, logId: string, nodeId?: string) => {
      try {
        let result: any;

        if (action === "retry") {
          result = await executionsApi.retryExecution(logId, nodeId);
        } else if (action === "cancel") {
          result = await executionsApi.cancelExecution(logId, nodeId);
        } else if (action === "pause") {
          result = await executionsApi.pauseExecution(logId, nodeId);
        } else if (action === "resume") {
          result = await executionsApi.resumeExecution(logId, nodeId);
        } else {
          throw new Error(`Unknown action: ${action}`);
        }

        if (result && !result.success) {
          throw new Error(
            `Failed to ${action} execution: ${result.message || "Unknown error"}`
          );
        }

        toast({
          title: `Execution ${action}ed`,
          description: `The workflow execution has been ${action}ed successfully.`,
        });

        memoizedFetchExecutions(); // Refetch executions to update status
      } catch (error) {
        console.error(`Error ${action}ing execution:`, error);
        toast({
          variant: "destructive",
          title: `Failed to ${action} execution`,
          description: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [toast, memoizedFetchExecutions]
  );

  const viewJsonData = (data: Record<string, unknown> | null) => {
    setJsonViewerData(data || {});
    setIsJsonDialogOpen(true);
  };

  if (loading && executions.length === 0) {
    return (
      <div className='flex items-center justify-center p-8'>
        <Loader2 className='h-8 w-8 animate-spin' />
        <span className='ml-2'>Loading executions...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex items-center justify-center p-8'>
        <AlertCircle className='h-8 w-8 text-red-500' />
        <span className='ml-2 text-red-600'>{error}</span>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      {/* Header with refresh */}
      <div className='flex items-center justify-between'>
        <h3 className='text-lg font-semibold'>Execution History</h3>
        <Button
          variant='outline'
          size='sm'
          onClick={() => memoizedFetchExecutions(1)}
          disabled={loading}>
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Executions List */}
      <div className='space-y-3'>
        {executions.map((log) => {
          const isExpanded = expandedLogs[log.id];
          const isLoadingDetails = loadingExecutionIds.has(log.id);
          const detailedExecution = detailedData[log.id] || log;

          return (
            <ExecutionLogCard
              key={log.id}
              log={detailedExecution}
              expandedLogs={expandedLogs}
              setExpandedLogs={updateExpandedLogs}
              formatDate={formatDate}
              formatDuration={formatDuration}
              getStatusBadge={getStatusBadge}
              handleAction={handleAction}
              viewJsonData={viewJsonData}
              nodeExecutions={detailedExecution.nodeExecutions}
              nodeInputs={detailedExecution.nodeInputs}
              nodeOutputs={detailedExecution.nodeOutputs}
              nodeLogs={{}}
              isLoading={isLoadingDetails}
              workflow={workflow}
              isExpanded={isExpanded}
              onToggleExpanded={() => toggleExpanded(log.id)}
            />
          );
        })}
      </div>

      {/* Infinite scroll loading indicator */}
      {hasMore && (
        <div ref={loadingRef} className='flex items-center justify-center p-4'>
          {isLoadingMore ? (
            <Loader2 className='h-6 w-6 animate-spin' />
          ) : (
            <div className='text-sm text-muted-foreground'>
              Scroll to load more
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {executions.length === 0 && !loading && (
        <div className='text-center py-12 text-muted-foreground'>
          <div className='flex flex-col items-center gap-4'>
            <div className='w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center'>
              <FileText className='h-8 w-8 opacity-50' />
            </div>
            <div className='max-w-md'>
              <h3 className='text-lg font-medium mb-2'>No executions yet</h3>
              <p className='text-sm text-muted-foreground mb-4'>
                This workflow hasn't been executed yet. Once you run this
                workflow, execution history will appear here.
              </p>
              <div className='space-y-2 text-xs'>
                <div className='flex items-center gap-2'>
                  <div className='w-2 h-2 bg-blue-500 rounded-full'></div>
                  <span>Execution status and timing</span>
                </div>
                <div className='flex items-center gap-2'>
                  <div className='w-2 h-2 bg-green-500 rounded-full'></div>
                  <span>Node-by-node progress</span>
                </div>
                <div className='flex items-center gap-2'>
                  <div className='w-2 h-2 bg-purple-500 rounded-full'></div>
                  <span>Input and output data</span>
                </div>
                <div className='flex items-center gap-2'>
                  <div className='w-2 h-2 bg-orange-500 rounded-full'></div>
                  <span>Detailed logs and errors</span>
                </div>
              </div>
            </div>
            <div className='mt-6'>
              <Button
                variant='outline'
                size='sm'
                onClick={() => {
                  // You could add a link to execute the workflow here
                  console.log("Navigate to execute workflow");
                }}>
                <Play className='h-4 w-4 mr-2' />
                Execute Workflow
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});
ExecutionLogsList.displayName = "ExecutionLogsList";

interface ExecutionLogCardProps {
  log: WorkflowExecution;
  expandedLogs: Record<string, boolean>;
  setExpandedLogs: (newState: Record<string, boolean>) => void;
  formatDate: (date: string | null | undefined) => string;
  formatDuration: (start: string, end?: string | null) => string;
  getStatusBadge: (status: string) => JSX.Element;
  handleAction: (
    action: string,
    logId: string,
    nodeId?: string
  ) => Promise<void>;
  viewJsonData: (data: Record<string, unknown> | null) => void;
  nodeExecutions?: NodeExecution[];
  nodeInputs: Record<string, Record<string, unknown>>;
  nodeOutputs: Record<string, Record<string, unknown>>;
  nodeLogs: Record<string, NodeLog[]>;
  isLoading: boolean;
  workflow?: any;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

export const ExecutionLogCard = React.memo(
  ({
    log,
    expandedLogs,
    setExpandedLogs,
    formatDate,
    formatDuration,
    getStatusBadge,
    handleAction,
    viewJsonData,
    nodeExecutions,
    nodeInputs,
    nodeOutputs,
    nodeLogs,
    isLoading,
    workflow,
    isExpanded,
    onToggleExpanded,
  }: ExecutionLogCardProps) => {
    const duration = useMemo(() => {
      if (!log.started_at) return "N/A";
      return formatDuration(log.started_at, log.completed_at);
    }, [log.started_at, log.completed_at, formatDuration]);

    const allLogs = useMemo(() => {
      const logs: UnifiedLog[] = [];

      // Add execution logs
      if (log.executionLogs) {
        logs.push(...log.executionLogs);
      }

      // Add node logs
      if (nodeExecutions) {
        nodeExecutions.forEach((nodeExec: any) => {
          if (nodeExec.logs) {
            logs.push(
              ...nodeExec.logs.map((logEntry: any) => ({
                ...logEntry,
                source: "node",
                node_id: nodeExec.node_id,
              }))
            );
          }
        });
      }

      // Sort by timestamp
      return logs.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    }, [log.executionLogs, nodeExecutions]);

    return (
      <Card className='overflow-hidden'>
        <CardHeader className='pb-3'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='flex items-center gap-2'>
                {log.status === "running" ? (
                  <Loader2 className='h-4 w-4 animate-spin text-blue-500' />
                ) : log.status === "completed" ? (
                  <CheckCircle className='h-4 w-4 text-green-500' />
                ) : log.status === "failed" ? (
                  <XCircle className='h-4 w-4 text-red-500' />
                ) : (
                  <Clock className='h-4 w-4 text-gray-500' />
                )}
                <div>
                  <p className='text-sm font-medium'>
                    Execution {log.id.slice(0, 8)}...
                  </p>
                  <p className='text-xs text-muted-foreground'>
                    Started {formatDate(log.started_at)} • Duration: {duration}
                  </p>
                </div>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              {getStatusBadge(log.status)}
              <Button
                variant='ghost'
                size='sm'
                onClick={onToggleExpanded}
                className='h-8 w-8 p-0'>
                {isExpanded ? (
                  <ChevronDown className='h-4 w-4' />
                ) : (
                  <ChevronRight className='h-4 w-4' />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className='pt-0'>
            {isLoading ? (
              <div className='flex items-center justify-center p-8'>
                <Loader2 className='h-6 w-6 animate-spin' />
                <span className='ml-2'>Loading detailed data...</span>
              </div>
            ) : (
              <Tabs defaultValue='logs' className='w-full'>
                <TabsList className='grid w-full grid-cols-4'>
                  <TabsTrigger value='logs'>
                    Logs ({allLogs.length})
                  </TabsTrigger>
                  <TabsTrigger value='nodes'>
                    Nodes ({nodeExecutions?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value='input'>Input</TabsTrigger>
                  <TabsTrigger value='output'>Output</TabsTrigger>
                </TabsList>

                <TabsContent value='logs' className='space-y-4'>
                  {allLogs.length > 0 ? (
                    <div className='space-y-3'>
                      {/* Log Summary */}
                      <div className='flex items-center justify-between p-3 bg-muted/30 rounded-lg'>
                        <div className='flex items-center gap-4'>
                          <div className='text-center'>
                            <p className='text-sm font-medium'>
                              {allLogs.length}
                            </p>
                            <p className='text-xs text-muted-foreground'>
                              Total Logs
                            </p>
                          </div>
                          <div className='text-center'>
                            <p className='text-sm font-medium text-red-600'>
                              {
                                allLogs.filter((log) => log.level === "error")
                                  .length
                              }
                            </p>
                            <p className='text-xs text-muted-foreground'>
                              Errors
                            </p>
                          </div>
                          <div className='text-center'>
                            <p className='text-sm font-medium text-yellow-600'>
                              {
                                allLogs.filter((log) => log.level === "warn")
                                  .length
                              }
                            </p>
                            <p className='text-xs text-muted-foreground'>
                              Warnings
                            </p>
                          </div>
                          <div className='text-center'>
                            <p className='text-sm font-medium text-blue-600'>
                              {
                                allLogs.filter((log) => log.level === "info")
                                  .length
                              }
                            </p>
                            <p className='text-xs text-muted-foreground'>
                              Info
                            </p>
                          </div>
                        </div>
                        <div className='text-xs text-muted-foreground'>
                          {allLogs.length > 0 && (
                            <span>
                              {new Date(
                                allLogs[0].timestamp
                              ).toLocaleDateString()}{" "}
                              -{" "}
                              {new Date(
                                allLogs[allLogs.length - 1].timestamp
                              ).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Logs List */}
                      <div className='space-y-2 max-h-96 overflow-y-auto'>
                        {allLogs.map((logEntry: any, idx: number) => {
                          const levelClass =
                            logEntry.level === "error"
                              ? "text-red-700 bg-red-50 border-red-100"
                              : logEntry.level === "warn"
                                ? "text-yellow-700 bg-yellow-50 border-yellow-100"
                                : "text-gray-700 bg-gray-50 border-gray-100";

                          return (
                            <div
                              key={idx}
                              className={`p-3 rounded border ${levelClass}`}>
                              <div className='flex items-center justify-between mb-2'>
                                <div className='flex items-center gap-2'>
                                  <Badge variant='outline' className='text-xs'>
                                    {logEntry.source === "node"
                                      ? `Node: ${logEntry.node_id}`
                                      : "System"}
                                  </Badge>
                                  <Badge
                                    variant={
                                      logEntry.level === "error"
                                        ? "destructive"
                                        : "secondary"
                                    }
                                    className='text-xs'>
                                    {logEntry.level}
                                  </Badge>
                                  <span className='text-xs opacity-80'>
                                    {new Date(
                                      logEntry.timestamp
                                    ).toLocaleTimeString()}
                                  </span>
                                </div>
                                <div className='flex items-center gap-1'>
                                  {logEntry.metadata &&
                                    Object.keys(logEntry.metadata).length >
                                      0 && (
                                      <Button
                                        variant='ghost'
                                        size='sm'
                                        className='text-xs p-0 h-5 px-1.5'
                                        onClick={() =>
                                          viewJsonData(logEntry.metadata)
                                        }>
                                        Metadata
                                      </Button>
                                    )}
                                </div>
                              </div>
                              <div className='text-sm mb-2'>
                                {logEntry.message}
                              </div>

                              {/* Metadata Preview */}
                              {logEntry.metadata &&
                                Object.keys(logEntry.metadata).length > 0 && (
                                  <div className='text-xs bg-black/5 p-2 rounded'>
                                    <p className='font-medium mb-1'>
                                      Metadata Preview:
                                    </p>
                                    <div className='space-y-1'>
                                      {Object.entries(logEntry.metadata)
                                        .slice(0, 3)
                                        .map(([key, value]) => (
                                          <div
                                            key={key}
                                            className='flex justify-between'>
                                            <span className='text-muted-foreground'>
                                              {key}:
                                            </span>
                                            <span className='truncate max-w-32'>
                                              {typeof value === "object"
                                                ? JSON.stringify(value).slice(
                                                    0,
                                                    30
                                                  ) + "..."
                                                : String(value)}
                                            </span>
                                          </div>
                                        ))}
                                      {Object.keys(logEntry.metadata).length >
                                        3 && (
                                        <div className='text-muted-foreground text-xs'>
                                          +
                                          {Object.keys(logEntry.metadata)
                                            .length - 3}{" "}
                                          more fields
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className='text-center py-8 text-muted-foreground'>
                      <div className='flex flex-col items-center gap-2'>
                        <div className='w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center'>
                          <FileText className='h-6 w-6 opacity-50' />
                        </div>
                        <div>
                          <p className='font-medium'>No logs available</p>
                          <p className='text-xs mt-1'>
                            {log.status === "running"
                              ? "Logs will appear as the execution progresses"
                              : log.status === "pending"
                                ? "Execution is queued and waiting to start"
                                : "No logs were generated for this execution"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value='nodes' className='space-y-4'>
                  {nodeExecutions && nodeExecutions.length > 0 ? (
                    <div className='space-y-4'>
                      {nodeExecutions.map((nodeExec: any) => {
                        const nodeInputs =
                          log.nodeInputs?.[nodeExec.node_id] || [];
                        const nodeOutputs =
                          log.nodeOutputs?.[nodeExec.node_id] || [];
                        const duration =
                          nodeExec.duration_ms ||
                          (nodeExec.started_at && nodeExec.completed_at
                            ? new Date(nodeExec.completed_at).getTime() -
                              new Date(nodeExec.started_at).getTime()
                            : 0);

                        return (
                          <div
                            key={nodeExec.id}
                            className='border rounded-lg overflow-hidden'>
                            {/* Node Header */}
                            <div className='bg-muted/50 p-3 border-b'>
                              <div className='flex items-center justify-between'>
                                <div className='flex items-center gap-3'>
                                  <div className='flex items-center gap-2'>
                                    {nodeExec.status === "running" ? (
                                      <Loader2 className='h-4 w-4 animate-spin text-blue-500' />
                                    ) : nodeExec.status === "completed" ? (
                                      <CheckCircle className='h-4 w-4 text-green-500' />
                                    ) : nodeExec.status === "failed" ? (
                                      <XCircle className='h-4 w-4 text-red-500' />
                                    ) : (
                                      <Clock className='h-4 w-4 text-gray-500' />
                                    )}
                                    <div>
                                      <p className='font-medium text-sm'>
                                        {nodeExec.node_id}
                                      </p>
                                      <p className='text-xs text-muted-foreground'>
                                        {nodeExec.status} • {duration}ms
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <div className='flex items-center gap-2'>
                                  <Badge
                                    variant={
                                      nodeExec.status === "completed"
                                        ? "default"
                                        : nodeExec.status === "failed"
                                          ? "destructive"
                                          : nodeExec.status === "running"
                                            ? "secondary"
                                            : "outline"
                                    }>
                                    {nodeExec.status}
                                  </Badge>
                                  {nodeExec.retry_count > 0 && (
                                    <Badge
                                      variant='outline'
                                      className='text-xs'>
                                      Retries: {nodeExec.retry_count}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Node Details */}
                            <div className='p-3 space-y-3'>
                              {/* Error Display */}
                              {nodeExec.error && (
                                <div className='bg-red-50 border border-red-200 rounded-lg p-3'>
                                  <div className='flex items-center gap-2 mb-2'>
                                    <XCircle className='h-4 w-4 text-red-500' />
                                    <p className='text-sm font-medium text-red-800'>
                                      Error
                                    </p>
                                  </div>
                                  <pre className='text-xs text-red-700 bg-red-100 p-2 rounded overflow-auto'>
                                    {nodeExec.error}
                                  </pre>
                                </div>
                              )}

                              {/* Input/Output Data */}
                              <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
                                {/* Input Data */}
                                <div className='space-y-2'>
                                  <div className='flex items-center justify-between'>
                                    <p className='text-sm font-medium'>
                                      Input Data
                                    </p>
                                    <Badge
                                      variant='outline'
                                      className='text-xs'>
                                      {nodeInputs.length} items
                                    </Badge>
                                  </div>
                                  {nodeInputs.length > 0 ? (
                                    <div className='space-y-2'>
                                      {nodeInputs.map(
                                        (input: any, idx: number) => (
                                          <div
                                            key={idx}
                                            className='bg-muted/30 p-2 rounded text-xs'>
                                            <div className='flex items-center justify-between mb-1'>
                                              <span className='text-muted-foreground'>
                                                Input {idx + 1}
                                              </span>
                                              <Button
                                                variant='ghost'
                                                size='sm'
                                                className='text-xs p-0 h-4 px-1'
                                                onClick={() =>
                                                  viewJsonData(input.input_data)
                                                }>
                                                View
                                              </Button>
                                            </div>
                                            <pre className='text-xs overflow-auto max-h-20'>
                                              {JSON.stringify(
                                                input.input_data,
                                                null,
                                                2
                                              )}
                                            </pre>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  ) : (
                                    <div className='text-xs text-muted-foreground bg-muted/30 p-2 rounded'>
                                      No input data
                                    </div>
                                  )}
                                </div>

                                {/* Output Data */}
                                <div className='space-y-2'>
                                  <div className='flex items-center justify-between'>
                                    <p className='text-sm font-medium'>
                                      Output Data
                                    </p>
                                    <Badge
                                      variant='outline'
                                      className='text-xs'>
                                      {nodeOutputs.length} items
                                    </Badge>
                                  </div>
                                  {nodeOutputs.length > 0 ? (
                                    <div className='space-y-2'>
                                      {nodeOutputs.map(
                                        (output: any, idx: number) => (
                                          <div
                                            key={idx}
                                            className='bg-muted/30 p-2 rounded text-xs'>
                                            <div className='flex items-center justify-between mb-1'>
                                              <span className='text-muted-foreground'>
                                                Output {idx + 1}
                                              </span>
                                              <Button
                                                variant='ghost'
                                                size='sm'
                                                className='text-xs p-0 h-4 px-1'
                                                onClick={() =>
                                                  viewJsonData(
                                                    output.output_data
                                                  )
                                                }>
                                                View
                                              </Button>
                                            </div>
                                            <pre className='text-xs overflow-auto max-h-20'>
                                              {JSON.stringify(
                                                output.output_data,
                                                null,
                                                2
                                              )}
                                            </pre>
                                          </div>
                                        )
                                      )}
                                    </div>
                                  ) : (
                                    <div className='text-xs text-muted-foreground bg-muted/30 p-2 rounded'>
                                      No output data
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Node Logs */}
                              {nodeExec.logs && nodeExec.logs.length > 0 && (
                                <div className='space-y-2'>
                                  <div className='flex items-center justify-between'>
                                    <p className='text-sm font-medium'>
                                      Node Logs
                                    </p>
                                    <Badge
                                      variant='outline'
                                      className='text-xs'>
                                      {nodeExec.logs.length} logs
                                    </Badge>
                                  </div>
                                  <div className='space-y-1 max-h-40 overflow-y-auto'>
                                    {nodeExec.logs.map(
                                      (logEntry: any, idx: number) => {
                                        const levelClass =
                                          logEntry.level === "error"
                                            ? "text-red-700 bg-red-50 border-red-100"
                                            : logEntry.level === "warn"
                                              ? "text-yellow-700 bg-yellow-50 border-yellow-100"
                                              : "text-gray-700 bg-gray-50 border-gray-100";

                                        return (
                                          <div
                                            key={idx}
                                            className={`p-2 rounded border text-xs ${levelClass}`}>
                                            <div className='flex items-center justify-between mb-1'>
                                              <div className='flex items-center gap-2'>
                                                <Badge
                                                  variant={
                                                    logEntry.level === "error"
                                                      ? "destructive"
                                                      : "secondary"
                                                  }
                                                  className='text-xs'>
                                                  {logEntry.level}
                                                </Badge>
                                                <span className='text-xs opacity-80'>
                                                  {new Date(
                                                    logEntry.timestamp
                                                  ).toLocaleTimeString()}
                                                </span>
                                              </div>
                                              {logEntry.metadata && (
                                                <Button
                                                  variant='ghost'
                                                  size='sm'
                                                  className='text-xs p-0 h-4 px-1'
                                                  onClick={() =>
                                                    viewJsonData(
                                                      logEntry.metadata
                                                    )
                                                  }>
                                                  JSON
                                                </Button>
                                              )}
                                            </div>
                                            <div className='text-xs'>
                                              {logEntry.message}
                                            </div>
                                          </div>
                                        );
                                      }
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className='text-center py-8 text-muted-foreground'>
                      <div className='flex flex-col items-center gap-2'>
                        <div className='w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center'>
                          <FileText className='h-6 w-6 opacity-50' />
                        </div>
                        <div>
                          <p className='font-medium'>
                            No node executions found
                          </p>
                          <p className='text-xs mt-1'>
                            {log.status === "failed"
                              ? "Execution failed before nodes could start"
                              : log.status === "running"
                                ? "Nodes are starting up..."
                                : log.status === "pending"
                                  ? "Execution is queued and waiting to start"
                                  : "Nodes have not started yet"}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value='input' className='space-y-4'>
                  <div className='space-y-3'>
                    {/* Input Summary */}
                    <div className='flex items-center justify-between p-3 bg-muted/30 rounded-lg'>
                      <div className='flex items-center gap-4'>
                        <div className='text-center'>
                          <p className='text-sm font-medium'>
                            {Object.keys(log.input_data || {}).length}
                          </p>
                          <p className='text-xs text-muted-foreground'>
                            Input Fields
                          </p>
                        </div>
                        <div className='text-center'>
                          <p className='text-sm font-medium'>
                            {JSON.stringify(log.input_data || {}).length}
                          </p>
                          <p className='text-xs text-muted-foreground'>Bytes</p>
                        </div>
                      </div>
                      <Button
                        variant='outline'
                        size='sm'
                        className='text-xs'
                        onClick={() => viewJsonData(log.input_data)}>
                        View Full JSON
                      </Button>
                    </div>

                    {/* Input Data Display */}
                    <div className='relative'>
                      <div className='bg-muted/20 p-3 rounded-lg border'>
                        <div className='flex items-center justify-between mb-2'>
                          <p className='text-sm font-medium'>Input Data</p>
                          <p className='text-xs text-muted-foreground'>
                            {log.input_data ? "Available" : "No input data"}
                          </p>
                        </div>
                        <pre className='text-xs bg-background p-3 rounded border overflow-auto max-h-60'>
                          {JSON.stringify(log.input_data || {}, null, 2)}
                        </pre>
                      </div>
                    </div>

                    {/* Node Inputs */}
                    {log.nodeInputs &&
                      Object.keys(log.nodeInputs).length > 0 && (
                        <div className='space-y-3'>
                          <div className='flex items-center justify-between'>
                            <p className='text-sm font-medium'>Node Inputs</p>
                            <Badge variant='outline' className='text-xs'>
                              {Object.keys(log.nodeInputs).length} nodes
                            </Badge>
                          </div>
                          <div className='space-y-2'>
                            {Object.entries(log.nodeInputs).map(
                              ([nodeId, inputs]) => (
                                <div
                                  key={nodeId}
                                  className='border rounded-lg p-3'>
                                  <div className='flex items-center justify-between mb-2'>
                                    <p className='text-sm font-medium'>
                                      Node: {nodeId}
                                    </p>
                                    <Badge
                                      variant='outline'
                                      className='text-xs'>
                                      {inputs.length} inputs
                                    </Badge>
                                  </div>
                                  <div className='space-y-2'>
                                    {inputs.map((input: any, idx: number) => (
                                      <div
                                        key={idx}
                                        className='bg-muted/30 p-2 rounded text-xs'>
                                        <div className='flex items-center justify-between mb-1'>
                                          <span className='text-muted-foreground'>
                                            Input {idx + 1}
                                          </span>
                                          <Button
                                            variant='ghost'
                                            size='sm'
                                            className='text-xs p-0 h-4 px-1'
                                            onClick={() =>
                                              viewJsonData(input.input_data)
                                            }>
                                            View
                                          </Button>
                                        </div>
                                        <pre className='text-xs overflow-auto max-h-20'>
                                          {JSON.stringify(
                                            input.input_data,
                                            null,
                                            2
                                          )}
                                        </pre>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                </TabsContent>

                <TabsContent value='output' className='space-y-4'>
                  <div className='space-y-3'>
                    {/* Output Summary */}
                    <div className='flex items-center justify-between p-3 bg-muted/30 rounded-lg'>
                      <div className='flex items-center gap-4'>
                        <div className='text-center'>
                          <p className='text-sm font-medium'>
                            {Object.keys(log.output_data || {}).length}
                          </p>
                          <p className='text-xs text-muted-foreground'>
                            Output Fields
                          </p>
                        </div>
                        <div className='text-center'>
                          <p className='text-sm font-medium'>
                            {JSON.stringify(log.output_data || {}).length}
                          </p>
                          <p className='text-xs text-muted-foreground'>Bytes</p>
                        </div>
                      </div>
                      <Button
                        variant='outline'
                        size='sm'
                        className='text-xs'
                        onClick={() => viewJsonData(log.output_data)}>
                        View Full JSON
                      </Button>
                    </div>

                    {/* Output Data Display */}
                    <div className='relative'>
                      <div className='bg-muted/20 p-3 rounded-lg border'>
                        <div className='flex items-center justify-between mb-2'>
                          <p className='text-sm font-medium'>Output Data</p>
                          <p className='text-xs text-muted-foreground'>
                            {log.output_data ? "Available" : "No output data"}
                          </p>
                        </div>
                        <pre className='text-xs bg-background p-3 rounded border overflow-auto max-h-60'>
                          {JSON.stringify(log.output_data || {}, null, 2)}
                        </pre>
                      </div>
                    </div>

                    {/* Node Outputs */}
                    {log.nodeOutputs &&
                      Object.keys(log.nodeOutputs).length > 0 && (
                        <div className='space-y-3'>
                          <div className='flex items-center justify-between'>
                            <p className='text-sm font-medium'>Node Outputs</p>
                            <Badge variant='outline' className='text-xs'>
                              {Object.keys(log.nodeOutputs).length} nodes
                            </Badge>
                          </div>
                          <div className='space-y-2'>
                            {Object.entries(log.nodeOutputs).map(
                              ([nodeId, outputs]) => (
                                <div
                                  key={nodeId}
                                  className='border rounded-lg p-3'>
                                  <div className='flex items-center justify-between mb-2'>
                                    <p className='text-sm font-medium'>
                                      Node: {nodeId}
                                    </p>
                                    <Badge
                                      variant='outline'
                                      className='text-xs'>
                                      {outputs.length} outputs
                                    </Badge>
                                  </div>
                                  <div className='space-y-2'>
                                    {outputs.map((output: any, idx: number) => (
                                      <div
                                        key={idx}
                                        className='bg-muted/30 p-2 rounded text-xs'>
                                        <div className='flex items-center justify-between mb-1'>
                                          <span className='text-muted-foreground'>
                                            Output {idx + 1}
                                          </span>
                                          <Button
                                            variant='ghost'
                                            size='sm'
                                            className='text-xs p-0 h-4 px-1'
                                            onClick={() =>
                                              viewJsonData(output.output_data)
                                            }>
                                            View
                                          </Button>
                                        </div>
                                        <pre className='text-xs overflow-auto max-h-20'>
                                          {JSON.stringify(
                                            output.output_data,
                                            null,
                                            2
                                          )}
                                        </pre>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        )}
      </Card>
    );
  }
);

const NodeExecutionItem = React.memo(
  ({
    nodeExec,
    nodeLogs,
    nodeOutputs,
    viewJsonData,
    log,
    expandedLogs,
    setExpandedLogs,
    getStatusBadge,
    formatDate,
    handleAction,
    nodeInputs,
  }: {
    nodeExec: NodeExecution;
    log: WorkflowExecution;
    expandedLogs: Record<string, boolean>;
    setExpandedLogs: React.Dispatch<
      React.SetStateAction<Record<string, boolean>>
    >;
    getStatusBadge: (status: string) => JSX.Element;
    formatDate: (dateString: string | null | undefined) => string;
    handleAction: (
      action: string,
      logId: string,
      nodeId?: string
    ) => Promise<void>;
    viewJsonData: (data: Record<string, unknown> | null) => void;
    nodeInputs: Record<string, Record<string, unknown>>;
    nodeOutputs: Record<string, Record<string, unknown>>;
    nodeLogs: Record<string, NodeLog[]>;
  }) => {
    const [logLevel, setLogLevel] = useState<
      "all" | "info" | "warning" | "error"
    >("all");
    console.log("nodeInputs", nodeInputs);

    const nodeLogKey = `${log.id}_${nodeExec.node_id}`;

    const filteredNodeLogs = useMemo(() => {
      const logsArr = nodeLogs[nodeLogKey] || [];
      if (logLevel === "all") return logsArr;
      return logsArr.filter((l) => l.level === logLevel);
    }, [nodeLogs, nodeLogKey, logLevel]);

    return (
      <div className='p-3 mb-3 border rounded-md '>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <span className='text-sm font-medium'>
              Node: {nodeExec.node_id}
            </span>
          </div>
          {getStatusBadge(nodeExec.status)}
        </div>
        <p className='text-xs text-muted-foreground mt-1'>
          {formatDate(nodeExec.completed_at || nodeExec.started_at)}
        </p>
        <div className='flex flex-wrap gap-2 mt-3 items-center justify-between border-t pt-2'>
          <div className='flex gap-1.5'>
            {nodeExec.status === "running" && (
              <Button
                size='sm'
                variant='outline'
                className='h-7 text-xs px-2 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700'
                onClick={() => handleAction("pause", log.id, nodeExec.node_id)}>
                <Pause className='w-3 h-3 mr-1' />
                Pause
              </Button>
            )}
            {(nodeExec.status === "running" ||
              nodeExec.status === "paused") && (
              <Button
                size='sm'
                variant='outline'
                className='h-7 text-xs px-2 bg-red-50 hover:bg-red-100 border-red-200 text-red-700'
                onClick={() =>
                  handleAction("cancel", log.id, nodeExec.node_id)
                }>
                <XCircle className='w-3 h-3 mr-1' />
                Cancel
              </Button>
            )}
            {nodeExec.status === "failed" && (
              <Button
                size='sm'
                variant='outline'
                className='h-7 text-xs px-2 bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700'
                onClick={() => handleAction("retry", log.id, nodeExec.node_id)}>
                <RotateCcw className='w-3 h-3 mr-1' />
                Retry
              </Button>
            )}
          </div>
          {nodeExec.status === "paused" && (
            <Button
              size='sm'
              variant='default'
              className='h-7 text-xs px-3 bg-green-600 hover:bg-green-700'
              onClick={() => handleAction("resume", log.id, nodeExec.node_id)}>
              <Play className='w-3 h-3 mr-1' />
              Resume
            </Button>
          )}
        </div>
        <div className='mt-3'>
          <Accordion
            type='single'
            collapsible
            value={
              expandedLogs[`${log.id}-${nodeExec.node_id}`]
                ? `${log.id}-${nodeExec.node_id}`
                : ""
            }
            onValueChange={(val) => {
              const key = `${log.id}-${nodeExec.node_id}`;
              setExpandedLogs((prev) => ({ ...prev, [key]: val === key }));
            }}>
            <AccordionItem value={`${log.id}-${nodeExec.node_id}`}>
              <AccordionTrigger className='text-xs py-1 hover:no-underline'>
                <span className='flex items-center gap-1'>
                  <FileText className='h-3 w-3' />
                  View Logs & Details
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className='mb-3 flex items-center justify-between'>
                  <div className='flex items-center gap-2'>
                    <span className='text-xs font-medium text-muted-foreground'>
                      Filter:
                    </span>
                    <select
                      className='text-xs bg-transparent border-none focus:outline-none focus:ring-0'
                      value={logLevel}
                      onChange={(e) =>
                        setLogLevel(
                          e.target.value as "all" | "info" | "warning" | "error"
                        )
                      }
                      title='Filter logs by level'>
                      <option value='all'>All Levels</option>
                      <option value='info'>Info</option>
                      <option value='warning'>Warning</option>
                      <option value='error'>Error</option>
                    </select>
                  </div>
                  <div className='text-xs text-muted-foreground'>
                    {filteredNodeLogs.length} log entries
                  </div>
                </div>
                <div className='mb-3 grid grid-cols-1 md:grid-cols-2 gap-2'>
                  <div>
                    <span className='text-xs font-medium text-muted-foreground'>
                      Inputs
                    </span>
                    <pre className='bg-muted p-2 rounded text-xs overflow-x-auto mt-1'>
                      {nodeInputs[`${log.id}_${nodeExec.node_id}`] ? (
                        <div className='relative'>
                          {JSON.stringify(
                            nodeInputs[`${log.id}_${nodeExec.node_id}`],
                            null,
                            2
                          )}
                          <Button
                            variant='outline'
                            size='sm'
                            className='absolute top-2 right-2 h-6 text-xs'
                            onClick={() =>
                              viewJsonData(
                                nodeInputs[`${log.id}_${nodeExec.node_id}`]
                              )
                            }>
                            Expand
                          </Button>
                        </div>
                      ) : nodeExec?.input_data ? (
                        <div className='relative'>
                          {JSON.stringify(nodeExec.input_data, null, 2)}
                          <Button
                            variant='outline'
                            size='sm'
                            className='absolute top-2 right-2 h-6 text-xs'
                            onClick={() => viewJsonData(nodeExec.input_data)}>
                            Expand
                          </Button>
                        </div>
                      ) : (
                        "No input"
                      )}
                    </pre>
                  </div>
                  <div>
                    <span className='text-xs font-medium text-muted-foreground'>
                      Outputs
                    </span>
                    <pre className='bg-muted p-2 rounded text-xs overflow-x-auto mt-1'>
                      {nodeOutputs[`${log.id}_${nodeExec.node_id}`] ? (
                        <div className='relative'>
                          {JSON.stringify(
                            nodeOutputs[`${log.id}_${nodeExec.node_id}`],
                            null,
                            2
                          )}
                          <Button
                            variant='outline'
                            size='sm'
                            className='absolute top-2 right-2 h-6 text-xs'
                            onClick={() =>
                              viewJsonData(
                                nodeOutputs[`${log.id}_${nodeExec.node_id}`]
                              )
                            }>
                            Expand
                          </Button>
                        </div>
                      ) : nodeExec?.output_data ? (
                        <div className='relative'>
                          {JSON.stringify(nodeExec.output_data, null, 2)}
                          <Button
                            variant='outline'
                            size='sm'
                            className='absolute top-2 right-2 h-6 text-xs'
                            onClick={() => viewJsonData(nodeExec.output_data)}>
                            Expand
                          </Button>
                        </div>
                      ) : (
                        "No output"
                      )}
                    </pre>
                  </div>
                </div>
                <div className='bg-gray-50 border rounded-md p-3 max-h-48 overflow-y-auto text-xs font-mono'>
                  {filteredNodeLogs.length > 0 ? (
                    filteredNodeLogs.map((logEntry, idx) => {
                      let levelClass = "";
                      let levelBadge = null;
                      if (logEntry.level === "error") {
                        levelClass = "text-red-700 bg-red-50 border-red-100";
                        levelBadge = (
                          <span className='inline-block px-1.5 py-0.5 bg-red-100 text-red-800 rounded text-[10px] font-medium'>
                            ERROR
                          </span>
                        );
                      } else if (logEntry.level === "warning") {
                        levelClass =
                          "text-amber-700 bg-amber-50 border-amber-100";
                        levelBadge = (
                          <span className='inline-block px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-medium'>
                            WARN
                          </span>
                        );
                      } else {
                        levelClass = "text-blue-700 bg-blue-50 border-blue-100";
                        levelBadge = (
                          <span className='inline-block px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-[10px] font-medium'>
                            INFO
                          </span>
                        );
                      }
                      return (
                        <div
                          key={idx}
                          className={`mb-2 p-1.5 rounded border ${levelClass}`}>
                          <div className='flex items-center justify-between mb-1'>
                            <div className='flex items-center gap-1.5'>
                              {levelBadge}
                              <span className='text-[10px] opacity-80'>
                                {new Date(
                                  logEntry.timestamp
                                ).toLocaleTimeString()}
                              </span>
                            </div>
                            {logEntry.metadata && (
                              <Button
                                variant='ghost'
                                size='sm'
                                className='text-[10px] p-0 h-5 px-1.5'
                                onClick={() => viewJsonData(logEntry.metadata)}>
                                View JSON
                              </Button>
                            )}
                          </div>
                          <div>{logEntry.message}</div>
                        </div>
                      );
                    })
                  ) : (
                    <div className='flex flex-col items-center justify-center py-6 text-muted-foreground'>
                      <FileText className='h-8 w-8 mb-2 opacity-50' />
                      <div>No logs available for this node</div>
                      {nodeExec.status === "pending" && (
                        <div className='text-xs mt-1'>
                          Node has not started execution yet
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {/* Display Node Input Data */}
                {nodeInputs[nodeExec.node_id] && (
                  <div className='mt-2'>
                    <div className='font-medium text-xs mb-1'>Input Data</div>
                    <div className='relative'>
                      <pre className='text-xs bg-muted p-2 rounded-md overflow-auto max-h-40'>
                        {JSON.stringify(nodeInputs[nodeExec.node_id], null, 2)}
                      </pre>
                      <Button
                        variant='outline'
                        size='sm'
                        className='absolute top-2 right-2 h-6 text-xs'
                        onClick={() =>
                          viewJsonData(nodeInputs[nodeExec.node_id])
                        }>
                        Expand
                      </Button>
                    </div>
                  </div>
                )}

                {/* Display Node Output Data */}
                {nodeOutputs[nodeExec.node_id] && (
                  <div className='mt-2'>
                    <div className='font-medium text-xs mb-1'>Output Data</div>
                    <div className='relative'>
                      <pre className='text-xs bg-muted p-2 rounded-md overflow-auto max-h-40'>
                        {JSON.stringify(nodeOutputs[nodeExec.node_id], null, 2)}
                      </pre>
                      <Button
                        variant='outline'
                        size='sm'
                        className='absolute top-2 right-2 h-6 text-xs'
                        onClick={() =>
                          viewJsonData(nodeOutputs[nodeExec.node_id])
                        }>
                        Expand
                      </Button>
                    </div>
                  </div>
                )}

                {/* Fallback to output_data if nodeOutputs doesn't have this node's data */}
                {!nodeOutputs[nodeExec.node_id] && nodeExec.output_data && (
                  <div className='mt-2'>
                    <div className='font-medium text-xs mb-1'>
                      Output Data (Legacy)
                    </div>
                    <div className='relative'>
                      <pre className='text-xs bg-muted p-2 rounded-md overflow-auto max-h-40'>
                        {JSON.stringify(nodeExec.output_data, null, 2)}
                      </pre>
                      <Button
                        variant='outline'
                        size='sm'
                        className='absolute top-2 right-2 h-6 text-xs'
                        onClick={() => viewJsonData(nodeExec.output_data)}>
                        Expand
                      </Button>
                    </div>
                  </div>
                )}
                {nodeExec.error && (
                  <div className='mt-2'>
                    <div className='font-medium text-xs mb-1 text-red-700'>
                      Error
                    </div>
                    <div className='bg-red-50 border border-red-200 rounded-md p-2'>
                      <p className='text-xs text-red-700'>{nodeExec.error}</p>
                    </div>
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>
    );
  }
);
NodeExecutionItem.displayName = "Node ExecutionItem";

// Add display names to components
ExecutionLogsList.displayName = "ExecutionLogsList";
ExecutionLogCard.displayName = "ExecutionLogCard";

export default ExecutionLogsList;
