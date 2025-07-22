"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { executionsApi } from "@/lib/services/api";
import type { NodeLog, UnifiedLog } from "@/lib/services/logs-service";
import { formatDistance } from "date-fns";
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Code,
  FileText,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  XCircle,
} from "lucide-react";
import React, {
  type JSX,
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
          <Badge className='bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 hover:text-emerald-800'>
            <CheckCircle className='w-3 h-3 mr-1' />
            Completed
          </Badge>
        );
      case "failed":
        return (
          <Badge className='bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 hover:text-rose-800'>
            <XCircle className='w-3 h-3 mr-1' />
            Failed
          </Badge>
        );
      case "running":
        return (
          <Badge className='bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 hover:text-sky-800'>
            <Loader2 className='w-3 h-3 mr-1 animate-spin' />
            Running
          </Badge>
        );
      case "paused":
        return (
          <Badge className='bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:text-amber-800'>
            <Pause className='w-3 h-3 mr-1' />
            Paused
          </Badge>
        );
      default:
        return (
          <Badge className='bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-800'>
            <Clock className='w-3 h-3 mr-1' />
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
    // For demo purposes, just log the data
    console.log("JSON Data:", data);
  };

  if (loading && executions.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center p-8 gap-3'>
        <Loader2 className='h-10 w-10 animate-spin text-primary' />
        <span className='text-muted-foreground font-medium'>
          Loading executions...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className='flex flex-col items-center justify-center p-8 gap-3 text-center'>
        <div className='h-12 w-12 rounded-full bg-rose-100 flex items-center justify-center'>
          <AlertCircle className='h-6 w-6 text-rose-600' />
        </div>
        <div>
          <h3 className='font-semibold text-lg'>Failed to load executions</h3>
          <p className='text-muted-foreground mt-1'>{error}</p>
        </div>
        <Button
          variant='outline'
          onClick={() => memoizedFetchExecutions(1)}
          className='mt-2'>
          <RefreshCw className='h-4 w-4 mr-2' />
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className='space-y-5'>
      {/* Header with refresh */}
      <div className='flex items-center justify-between'>
        <h3 className='text-xl font-semibold tracking-tight'>
          Execution History
        </h3>
        <Button
          variant='outline'
          size='sm'
          onClick={() => memoizedFetchExecutions(1)}
          disabled={loading}
          className='gap-2'>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Status filters */}
      <div className='flex flex-wrap gap-2'>
        <Button
          variant={activeTab === "all" ? "default" : "outline"}
          size='sm'
          onClick={() => setActiveTab("all")}
          className='gap-1.5'>
          All
          <span className='inline-flex items-center justify-center rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium leading-none text-primary'>
            {statusCounts.all}
          </span>
        </Button>
        <Button
          variant={activeTab === "running" ? "default" : "outline"}
          size='sm'
          onClick={() => setActiveTab("running")}
          className='gap-1.5'>
          <Loader2 className='h-3 w-3 animate-spin' />
          Running
          <span className='inline-flex items-center justify-center rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium leading-none text-primary'>
            {statusCounts.running}
          </span>
        </Button>
        <Button
          variant={activeTab === "completed" ? "default" : "outline"}
          size='sm'
          onClick={() => setActiveTab("completed")}
          className='gap-1.5'>
          <CheckCircle className='h-3 w-3' />
          Completed
          <span className='inline-flex items-center justify-center rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium leading-none text-primary'>
            {statusCounts.completed}
          </span>
        </Button>
        <Button
          variant={activeTab === "failed" ? "default" : "outline"}
          size='sm'
          onClick={() => setActiveTab("failed")}
          className='gap-1.5'>
          <XCircle className='h-3 w-3' />
          Failed
          <span className='inline-flex items-center justify-center rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium leading-none text-primary'>
            {statusCounts.failed}
          </span>
        </Button>
        <Button
          variant={activeTab === "paused" ? "default" : "outline"}
          size='sm'
          onClick={() => setActiveTab("paused")}
          className='gap-1.5'>
          <Pause className='h-3 w-3' />
          Paused
          <span className='inline-flex items-center justify-center rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium leading-none text-primary'>
            {statusCounts.paused}
          </span>
        </Button>
        <Button
          variant={activeTab === "pending" ? "default" : "outline"}
          size='sm'
          onClick={() => setActiveTab("pending")}
          className='gap-1.5'>
          <Clock className='h-3 w-3' />
          Pending
          <span className='inline-flex items-center justify-center rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium leading-none text-primary'>
            {statusCounts.pending}
          </span>
        </Button>
      </div>

      {/* Executions List */}
      <div className='space-y-4'>
        {filteredLogs.map((log) => {
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
            <div className='flex items-center gap-2'>
              <Loader2 className='h-5 w-5 animate-spin text-primary' />
              <span className='text-sm text-muted-foreground'>
                Loading more executions...
              </span>
            </div>
          ) : (
            <div className='text-sm text-muted-foreground'>
              Scroll to load more
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {executions.length === 0 && !loading && (
        <div className='flex flex-col items-center justify-center py-16 text-center'>
          <div className='w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-6'>
            <FileText className='h-10 w-10 text-muted-foreground/50' />
          </div>
          <div className='max-w-md'>
            <h3 className='text-xl font-semibold mb-3'>No executions yet</h3>
            <p className='text-muted-foreground mb-6'>
              This workflow hasn't been executed yet. Once you run this
              workflow, execution history will appear here.
            </p>
            <div className='grid grid-cols-2 gap-4 text-sm max-w-sm mx-auto mb-8'>
              <div className='flex items-center gap-2 bg-muted/30 p-3 rounded-lg'>
                <div className='w-2 h-2 bg-sky-500 rounded-full'></div>
                <span>Execution status and timing</span>
              </div>
              <div className='flex items-center gap-2 bg-muted/30 p-3 rounded-lg'>
                <div className='w-2 h-2 bg-emerald-500 rounded-full'></div>
                <span>Node-by-node progress</span>
              </div>
              <div className='flex items-center gap-2 bg-muted/30 p-3 rounded-lg'>
                <div className='w-2 h-2 bg-violet-500 rounded-full'></div>
                <span>Input and output data</span>
              </div>
              <div className='flex items-center gap-2 bg-muted/30 p-3 rounded-lg'>
                <div className='w-2 h-2 bg-amber-500 rounded-full'></div>
                <span>Detailed logs and errors</span>
              </div>
            </div>
            <Button
              size='lg'
              onClick={() => {
                // You could add a link to execute the workflow here
                console.log("Navigate to execute workflow");
              }}
              className='gap-2'>
              <Play className='h-4 w-4' />
              Execute Workflow
            </Button>
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

    // Get status icon for the header
    const getStatusIcon = () => {
      switch (log.status) {
        case "running":
          return <Loader2 className='h-5 w-5 animate-spin text-sky-500' />;
        case "completed":
          return <CheckCircle className='h-5 w-5 text-emerald-500' />;
        case "failed":
          return <XCircle className='h-5 w-5 text-rose-500' />;
        case "paused":
          return <Pause className='h-5 w-5 text-amber-500' />;
        default:
          return <Clock className='h-5 w-5 text-slate-500' />;
      }
    };

    return (
      <Card className='overflow-hidden border shadow-sm hover:shadow-md transition-shadow duration-200'>
        <CardHeader className='py-4 px-5'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='flex h-10 w-10 items-center justify-center rounded-full bg-muted/30'>
                {getStatusIcon()}
              </div>
              <div>
                <div className='flex items-center gap-2'>
                  <p className='font-medium'>
                    Execution {log.id.slice(0, 8)}...
                  </p>
                  {getStatusBadge(log.status)}
                </div>
                <div className='flex items-center gap-2 text-sm text-muted-foreground mt-0.5'>
                  <span className='flex items-center gap-1'>
                    <Clock className='h-3.5 w-3.5' />
                    Started {formatDate(log.started_at)}
                  </span>
                  <span className='text-muted-foreground/50'>•</span>
                  <span>Duration: {duration}</span>
                </div>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              <Button
                variant='ghost'
                size='sm'
                onClick={onToggleExpanded}
                className='h-9 w-9 p-0 rounded-full'
                aria-label={isExpanded ? "Collapse" : "Expand"}>
                {isExpanded ? (
                  <ChevronDown className='h-5 w-5' />
                ) : (
                  <ChevronRight className='h-5 w-5' />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        {isExpanded && (
          <CardContent className='px-5 pb-5 pt-0'>
            {isLoading ? (
              <div className='flex items-center justify-center p-8 gap-3'>
                <Loader2 className='h-6 w-6 animate-spin text-primary' />
                <span className='text-muted-foreground'>
                  Loading detailed data...
                </span>
              </div>
            ) : (
              <div className='space-y-4'>
                {/* Action buttons */}
                <div className='flex flex-wrap gap-2'>
                  {log.status === "running" && (
                    <>
                      <Button
                        size='sm'
                        variant='outline'
                        className='gap-1.5 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800'
                        onClick={() => handleAction("pause", log.id)}>
                        <Pause className='h-3.5 w-3.5' />
                        Pause Execution
                      </Button>
                      <Button
                        size='sm'
                        variant='outline'
                        className='gap-1.5 border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800'
                        onClick={() => handleAction("cancel", log.id)}>
                        <XCircle className='h-3.5 w-3.5' />
                        Cancel Execution
                      </Button>
                    </>
                  )}
                  {log.status === "paused" && (
                    <Button
                      size='sm'
                      variant='outline'
                      className='gap-1.5 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800'
                      onClick={() => handleAction("resume", log.id)}>
                      <Play className='h-3.5 w-3.5' />
                      Resume Execution
                    </Button>
                  )}
                  {log.status === "failed" && (
                    <Button
                      size='sm'
                      variant='outline'
                      className='gap-1.5 border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100 hover:text-sky-800'
                      onClick={() => handleAction("retry", log.id)}>
                      <RotateCcw className='h-3.5 w-3.5' />
                      Retry Execution
                    </Button>
                  )}
                </div>

                <Tabs defaultValue='logs' className='w-full'>
                  <TabsList className='grid w-full grid-cols-4 mb-4'>
                    <TabsTrigger value='logs' className='gap-1.5'>
                      <FileText className='h-4 w-4' />
                      Logs{" "}
                      <span className='text-xs opacity-70'>
                        ({allLogs.length})
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value='nodes' className='gap-1.5'>
                      <Code className='h-4 w-4' />
                      Nodes{" "}
                      <span className='text-xs opacity-70'>
                        ({nodeExecutions?.length || 0})
                      </span>
                    </TabsTrigger>
                    <TabsTrigger value='input' className='gap-1.5'>
                      Input
                    </TabsTrigger>
                    <TabsTrigger value='output' className='gap-1.5'>
                      Output
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value='logs' className='space-y-4'>
                    {allLogs.length > 0 ? (
                      <div className='space-y-4'>
                        {/* Log Summary */}
                        <div className='grid grid-cols-4 gap-3'>
                          <div className='flex flex-col items-center justify-center p-4 bg-muted/30 rounded-lg'>
                            <p className='text-2xl font-semibold'>
                              {allLogs.length}
                            </p>
                            <p className='text-xs text-muted-foreground'>
                              Total Logs
                            </p>
                          </div>
                          <div className='flex flex-col items-center justify-center p-4 bg-rose-50 rounded-lg'>
                            <p className='text-2xl font-semibold text-rose-700'>
                              {
                                allLogs.filter((log) => log.level === "error")
                                  .length
                              }
                            </p>
                            <p className='text-xs text-rose-600'>Errors</p>
                          </div>
                          <div className='flex flex-col items-center justify-center p-4 bg-amber-50 rounded-lg'>
                            <p className='text-2xl font-semibold text-amber-700'>
                              {
                                allLogs.filter((log) => log.level === "warn")
                                  .length
                              }
                            </p>
                            <p className='text-xs text-amber-600'>Warnings</p>
                          </div>
                          <div className='flex flex-col items-center justify-center p-4 bg-sky-50 rounded-lg'>
                            <p className='text-2xl font-semibold text-sky-700'>
                              {
                                allLogs.filter((log) => log.level === "info")
                                  .length
                              }
                            </p>
                            <p className='text-xs text-sky-600'>Info</p>
                          </div>
                        </div>

                        {/* Logs List */}
                        <div className='space-y-2 max-h-[500px] overflow-y-auto rounded-lg border'>
                          {allLogs.map((logEntry: any, idx: number) => {
                            const levelClass =
                              logEntry.level === "error"
                                ? "border-l-4 border-l-rose-500 bg-rose-50"
                                : logEntry.level === "warn"
                                  ? "border-l-4 border-l-amber-500 bg-amber-50"
                                  : "border-l-4 border-l-sky-500 bg-sky-50";

                            const levelBadge =
                              logEntry.level === "error" ? (
                                <Badge
                                  variant='destructive'
                                  className='h-5 px-1.5'>
                                  ERROR
                                </Badge>
                              ) : logEntry.level === "warn" ? (
                                <Badge className='bg-amber-100 text-amber-800 hover:bg-amber-200 h-5 px-1.5'>
                                  WARN
                                </Badge>
                              ) : (
                                <Badge className='bg-sky-100 text-sky-800 hover:bg-sky-200 h-5 px-1.5'>
                                  INFO
                                </Badge>
                              );

                            return (
                              <div key={idx} className={`p-3 ${levelClass}`}>
                                <div className='flex items-center justify-between mb-2'>
                                  <div className='flex items-center gap-2'>
                                    {levelBadge}
                                    <Badge
                                      variant='outline'
                                      className='h-5 px-1.5'>
                                      {logEntry.source === "node"
                                        ? `Node: ${logEntry.node_id}`
                                        : "System"}
                                    </Badge>
                                    <span className='text-xs text-muted-foreground'>
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
                                          variant='outline'
                                          size='sm'
                                          className='h-6 text-xs px-2 bg-transparent'
                                          onClick={() =>
                                            viewJsonData(logEntry.metadata)
                                          }>
                                          View Metadata
                                        </Button>
                                      )}
                                  </div>
                                </div>
                                <div className='text-sm mb-2 font-mono'>
                                  {logEntry.message}
                                </div>
                                {/* Metadata Preview */}
                                {logEntry.metadata &&
                                  Object.keys(logEntry.metadata).length > 0 && (
                                    <div className='text-xs bg-black/5 p-2 rounded mt-2'>
                                      <p className='font-medium mb-1'>
                                        Metadata Preview:
                                      </p>
                                      <div className='grid grid-cols-1 md:grid-cols-2 gap-2'>
                                        {Object.entries(logEntry.metadata)
                                          .slice(0, 4)
                                          .map(([key, value]) => (
                                            <div
                                              key={key}
                                              className='flex justify-between bg-white/50 p-1.5 rounded'>
                                              <span className='text-muted-foreground font-medium'>
                                                {key}:
                                              </span>
                                              <span className='truncate max-w-32 font-mono'>
                                                {typeof value === "object"
                                                  ? JSON.stringify(value).slice(
                                                      0,
                                                      30
                                                    ) + "..."
                                                  : String(value)}
                                              </span>
                                            </div>
                                          ))}
                                      </div>
                                      {Object.keys(logEntry.metadata).length >
                                        4 && (
                                        <div className='text-muted-foreground text-xs mt-1 text-center'>
                                          +
                                          {Object.keys(logEntry.metadata)
                                            .length - 4}{" "}
                                          more fields
                                        </div>
                                      )}
                                    </div>
                                  )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className='flex flex-col items-center justify-center py-12 text-center'>
                        <div className='w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4'>
                          <FileText className='h-8 w-8 text-muted-foreground/50' />
                        </div>
                        <h4 className='text-lg font-medium mb-2'>
                          No logs available
                        </h4>
                        <p className='text-sm text-muted-foreground max-w-md'>
                          {log.status === "running"
                            ? "Logs will appear as the execution progresses"
                            : log.status === "pending"
                              ? "Execution is queued and waiting to start"
                              : "No logs were generated for this execution"}
                        </p>
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

                          // Get node status icon
                          const getNodeStatusIcon = () => {
                            switch (nodeExec.status) {
                              case "running":
                                return (
                                  <Loader2 className='h-4 w-4 animate-spin text-sky-500' />
                                );
                              case "completed":
                                return (
                                  <CheckCircle className='h-4 w-4 text-emerald-500' />
                                );
                              case "failed":
                                return (
                                  <XCircle className='h-4 w-4 text-rose-500' />
                                );
                              case "paused":
                                return (
                                  <Pause className='h-4 w-4 text-amber-500' />
                                );
                              default:
                                return (
                                  <Clock className='h-4 w-4 text-slate-500' />
                                );
                            }
                          };

                          return (
                            <Card key={nodeExec.id} className='overflow-hidden'>
                              {/* Node Header */}
                              <CardHeader className='py-3 px-4 bg-muted/30'>
                                <div className='flex items-center justify-between'>
                                  <div className='flex items-center gap-3'>
                                    <div className='flex h-8 w-8 items-center justify-center rounded-full bg-background'>
                                      {getNodeStatusIcon()}
                                    </div>
                                    <div>
                                      <p className='font-medium'>
                                        {nodeExec.node_id}
                                      </p>
                                      <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                                        <span>{nodeExec.status}</span>
                                        <span>•</span>
                                        <span>{duration}ms</span>
                                        {nodeExec.retry_count > 0 && (
                                          <>
                                            <span>•</span>
                                            <span>
                                              Retries: {nodeExec.retry_count}
                                            </span>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className='flex items-center gap-2'>
                                    {nodeExec.status === "running" && (
                                      <Button
                                        size='sm'
                                        variant='outline'
                                        className='h-7 text-xs px-2 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                        onClick={() =>
                                          handleAction(
                                            "pause",
                                            log.id,
                                            nodeExec.node_id
                                          )
                                        }>
                                        <Pause className='h-3 w-3 mr-1' />
                                        Pause
                                      </Button>
                                    )}
                                    {nodeExec.status === "paused" && (
                                      <Button
                                        size='sm'
                                        variant='outline'
                                        className='h-7 text-xs px-2 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                        onClick={() =>
                                          handleAction(
                                            "resume",
                                            log.id,
                                            nodeExec.node_id
                                          )
                                        }>
                                        <Play className='h-3 w-3 mr-1' />
                                        Resume
                                      </Button>
                                    )}
                                    {nodeExec.status === "failed" && (
                                      <Button
                                        size='sm'
                                        variant='outline'
                                        className='h-7 text-xs px-2 border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100'
                                        onClick={() =>
                                          handleAction(
                                            "retry",
                                            log.id,
                                            nodeExec.node_id
                                          )
                                        }>
                                        <RotateCcw className='h-3 w-3 mr-1' />
                                        Retry
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </CardHeader>

                              {/* Node Details */}
                              <CardContent className='p-4 space-y-4'>
                                {/* Error Display */}
                                {nodeExec.error && (
                                  <div className='bg-rose-50 border border-rose-200 rounded-lg p-4'>
                                    <div className='flex items-center gap-2 mb-2'>
                                      <XCircle className='h-5 w-5 text-rose-500' />
                                      <p className='font-medium text-rose-800'>
                                        Error
                                      </p>
                                    </div>
                                    <pre className='text-sm text-rose-700 bg-rose-100/50 p-3 rounded overflow-auto max-h-[200px]'>
                                      {nodeExec.error}
                                    </pre>
                                  </div>
                                )}

                                {/* Input/Output Data */}
                                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                                  {/* Input Data */}
                                  <div className='space-y-2'>
                                    <div className='flex items-center justify-between'>
                                      <p className='font-medium'>Input Data</p>
                                      <Badge
                                        variant='outline'
                                        className='text-xs'>
                                        {nodeInputs.length} items
                                      </Badge>
                                    </div>
                                    {nodeInputs.length > 0 ? (
                                      <div className='space-y-2 max-h-[300px] overflow-y-auto rounded-lg border p-2'>
                                        {nodeInputs.map(
                                          (input: any, idx: number) => (
                                            <div
                                              key={idx}
                                              className='bg-muted/30 p-3 rounded text-sm'>
                                              <div className='flex items-center justify-between mb-2'>
                                                <span className='font-medium text-muted-foreground'>
                                                  Input {idx + 1}
                                                </span>
                                                <Button
                                                  variant='outline'
                                                  size='sm'
                                                  className='h-7 text-xs px-2 bg-transparent'
                                                  onClick={() =>
                                                    viewJsonData(
                                                      input.input_data
                                                    )
                                                  }>
                                                  View JSON
                                                </Button>
                                              </div>
                                              <pre className='text-xs overflow-auto max-h-[150px] bg-background p-2 rounded'>
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
                                      <div className='flex items-center justify-center p-6 text-center bg-muted/20 rounded-lg'>
                                        <p className='text-sm text-muted-foreground'>
                                          No input data available
                                        </p>
                                      </div>
                                    )}
                                  </div>

                                  {/* Output Data */}
                                  <div className='space-y-2'>
                                    <div className='flex items-center justify-between'>
                                      <p className='font-medium'>Output Data</p>
                                      <Badge
                                        variant='outline'
                                        className='text-xs'>
                                        {nodeOutputs.length} items
                                      </Badge>
                                    </div>
                                    {nodeOutputs.length > 0 ? (
                                      <div className='space-y-2 max-h-[300px] overflow-y-auto rounded-lg border p-2'>
                                        {nodeOutputs.map(
                                          (output: any, idx: number) => (
                                            <div
                                              key={idx}
                                              className='bg-muted/30 p-3 rounded text-sm'>
                                              <div className='flex items-center justify-between mb-2'>
                                                <span className='font-medium text-muted-foreground'>
                                                  Output {idx + 1}
                                                </span>
                                                <Button
                                                  variant='outline'
                                                  size='sm'
                                                  className='h-7 text-xs px-2 bg-transparent'
                                                  onClick={() =>
                                                    viewJsonData(
                                                      output.output_data
                                                    )
                                                  }>
                                                  View JSON
                                                </Button>
                                              </div>
                                              <pre className='text-xs overflow-auto max-h-[150px] bg-background p-2 rounded'>
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
                                      <div className='flex items-center justify-center p-6 text-center bg-muted/20 rounded-lg'>
                                        <p className='text-sm text-muted-foreground'>
                                          No output data available
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {/* Node Logs */}
                                {nodeExec.logs && nodeExec.logs.length > 0 && (
                                  <div className='space-y-2'>
                                    <div className='flex items-center justify-between'>
                                      <p className='font-medium'>Node Logs</p>
                                      <Badge
                                        variant='outline'
                                        className='text-xs'>
                                        {nodeExec.logs.length} logs
                                      </Badge>
                                    </div>
                                    <div className='space-y-2 max-h-[300px] overflow-y-auto rounded-lg border p-2'>
                                      {nodeExec.logs.map(
                                        (logEntry: any, idx: number) => {
                                          const levelClass =
                                            logEntry.level === "error"
                                              ? "border-l-4 border-l-rose-500 bg-rose-50"
                                              : logEntry.level === "warn"
                                                ? "border-l-4 border-l-amber-500 bg-amber-50"
                                                : "border-l-4 border-l-sky-500 bg-sky-50";

                                          const levelBadge =
                                            logEntry.level === "error" ? (
                                              <Badge
                                                variant='destructive'
                                                className='h-5 px-1.5'>
                                                ERROR
                                              </Badge>
                                            ) : logEntry.level === "warn" ? (
                                              <Badge className='bg-amber-100 text-amber-800 hover:bg-amber-200 h-5 px-1.5'>
                                                WARN
                                              </Badge>
                                            ) : (
                                              <Badge className='bg-sky-100 text-sky-800 hover:bg-sky-200 h-5 px-1.5'>
                                                INFO
                                              </Badge>
                                            );

                                          return (
                                            <div
                                              key={idx}
                                              className={`p-2 ${levelClass}`}>
                                              <div className='flex items-center justify-between mb-1'>
                                                <div className='flex items-center gap-2'>
                                                  {levelBadge}
                                                  <span className='text-xs text-muted-foreground'>
                                                    {new Date(
                                                      logEntry.timestamp
                                                    ).toLocaleTimeString()}
                                                  </span>
                                                </div>
                                                {logEntry.metadata && (
                                                  <Button
                                                    variant='outline'
                                                    size='sm'
                                                    className='h-6 text-xs px-2 bg-transparent'
                                                    onClick={() =>
                                                      viewJsonData(
                                                        logEntry.metadata
                                                      )
                                                    }>
                                                    View Metadata
                                                  </Button>
                                                )}
                                              </div>
                                              <div className='text-sm font-mono'>
                                                {logEntry.message}
                                              </div>
                                            </div>
                                          );
                                        }
                                      )}
                                    </div>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    ) : (
                      <div className='flex flex-col items-center justify-center py-12 text-center'>
                        <div className='w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4'>
                          <Code className='h-8 w-8 text-muted-foreground/50' />
                        </div>
                        <h4 className='text-lg font-medium mb-2'>
                          No node executions found
                        </h4>
                        <p className='text-sm text-muted-foreground max-w-md'>
                          {log.status === "failed"
                            ? "Execution failed before nodes could start"
                            : log.status === "running"
                              ? "Nodes are starting up..."
                              : log.status === "pending"
                                ? "Execution is queued and waiting to start"
                                : "Nodes have not started yet"}
                        </p>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value='input' className='space-y-4'>
                    <div className='space-y-4'>
                      {/* Input Summary */}
                      <div className='grid grid-cols-2 gap-4'>
                        <div className='flex flex-col items-center justify-center p-4 bg-muted/30 rounded-lg'>
                          <p className='text-2xl font-semibold'>
                            {Object.keys(log.input_data || {}).length}
                          </p>
                          <p className='text-xs text-muted-foreground'>
                            Input Fields
                          </p>
                        </div>
                        <div className='flex flex-col items-center justify-center p-4 bg-muted/30 rounded-lg'>
                          <p className='text-2xl font-semibold'>
                            {JSON.stringify(log.input_data || {}).length}
                          </p>
                          <p className='text-xs text-muted-foreground'>Bytes</p>
                        </div>
                      </div>

                      {/* Input Data Display */}
                      <Card>
                        <CardHeader className='py-3 px-4'>
                          <div className='flex items-center justify-between'>
                            <h4 className='font-medium'>Input Data</h4>
                            <Button
                              variant='outline'
                              size='sm'
                              className='h-8 text-xs bg-transparent'
                              onClick={() => viewJsonData(log.input_data)}>
                              View Full JSON
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className='p-0'>
                          <pre className='text-sm bg-muted/20 p-4 overflow-auto max-h-[300px] rounded-b-lg font-mono'>
                            {JSON.stringify(log.input_data || {}, null, 2)}
                          </pre>
                        </CardContent>
                      </Card>

                      {/* Node Inputs */}
                      {log.nodeInputs &&
                        Object.keys(log.nodeInputs).length > 0 && (
                          <div className='space-y-3'>
                            <div className='flex items-center justify-between'>
                              <h4 className='font-medium'>Node Inputs</h4>
                              <Badge variant='outline' className='text-xs'>
                                {Object.keys(log.nodeInputs).length} nodes
                              </Badge>
                            </div>
                            <div className='space-y-3'>
                              {Object.entries(log.nodeInputs).map(
                                ([nodeId, inputs]) => (
                                  <Card key={nodeId}>
                                    <CardHeader className='py-3 px-4'>
                                      <div className='flex items-center justify-between'>
                                        <h5 className='font-medium'>
                                          Node: {nodeId}
                                        </h5>
                                        <Badge
                                          variant='outline'
                                          className='text-xs'>
                                          {inputs.length} inputs
                                        </Badge>
                                      </div>
                                    </CardHeader>
                                    <CardContent className='p-4 pt-0'>
                                      <div className='space-y-3 max-h-[300px] overflow-y-auto'>
                                        {inputs.map(
                                          (input: any, idx: number) => (
                                            <div
                                              key={idx}
                                              className='bg-muted/30 p-3 rounded'>
                                              <div className='flex items-center justify-between mb-2'>
                                                <span className='font-medium text-muted-foreground'>
                                                  Input {idx + 1}
                                                </span>
                                                <Button
                                                  variant='outline'
                                                  size='sm'
                                                  className='h-7 text-xs px-2 bg-transparent'
                                                  onClick={() =>
                                                    viewJsonData(
                                                      input.input_data
                                                    )
                                                  }>
                                                  View JSON
                                                </Button>
                                              </div>
                                              <pre className='text-xs overflow-auto max-h-[150px] bg-background p-2 rounded font-mono'>
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
                                    </CardContent>
                                  </Card>
                                )
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  </TabsContent>

                  <TabsContent value='output' className='space-y-4'>
                    <div className='space-y-4'>
                      {/* Output Summary */}
                      <div className='grid grid-cols-2 gap-4'>
                        <div className='flex flex-col items-center justify-center p-4 bg-muted/30 rounded-lg'>
                          <p className='text-2xl font-semibold'>
                            {Object.keys(log.output_data || {}).length}
                          </p>
                          <p className='text-xs text-muted-foreground'>
                            Output Fields
                          </p>
                        </div>
                        <div className='flex flex-col items-center justify-center p-4 bg-muted/30 rounded-lg'>
                          <p className='text-2xl font-semibold'>
                            {JSON.stringify(log.output_data || {}).length}
                          </p>
                          <p className='text-xs text-muted-foreground'>Bytes</p>
                        </div>
                      </div>

                      {/* Output Data Display */}
                      <Card>
                        <CardHeader className='py-3 px-4'>
                          <div className='flex items-center justify-between'>
                            <h4 className='font-medium'>Output Data</h4>
                            <Button
                              variant='outline'
                              size='sm'
                              className='h-8 text-xs bg-transparent'
                              onClick={() => viewJsonData(log.output_data)}>
                              View Full JSON
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className='p-0'>
                          <pre className='text-sm bg-muted/20 p-4 overflow-auto max-h-[300px] rounded-b-lg font-mono'>
                            {JSON.stringify(log.output_data || {}, null, 2)}
                          </pre>
                        </CardContent>
                      </Card>

                      {/* Node Outputs */}
                      {log.nodeOutputs &&
                        Object.keys(log.nodeOutputs).length > 0 && (
                          <div className='space-y-3'>
                            <div className='flex items-center justify-between'>
                              <h4 className='font-medium'>Node Outputs</h4>
                              <Badge variant='outline' className='text-xs'>
                                {Object.keys(log.nodeOutputs).length} nodes
                              </Badge>
                            </div>
                            <div className='space-y-3'>
                              {Object.entries(log.nodeOutputs).map(
                                ([nodeId, outputs]) => (
                                  <Card key={nodeId}>
                                    <CardHeader className='py-3 px-4'>
                                      <div className='flex items-center justify-between'>
                                        <h5 className='font-medium'>
                                          Node: {nodeId}
                                        </h5>
                                        <Badge
                                          variant='outline'
                                          className='text-xs'>
                                          {outputs.length} outputs
                                        </Badge>
                                      </div>
                                    </CardHeader>
                                    <CardContent className='p-4 pt-0'>
                                      <div className='space-y-3 max-h-[300px] overflow-y-auto'>
                                        {outputs.map(
                                          (output: any, idx: number) => (
                                            <div
                                              key={idx}
                                              className='bg-muted/30 p-3 rounded'>
                                              <div className='flex items-center justify-between mb-2'>
                                                <span className='font-medium text-muted-foreground'>
                                                  Output {idx + 1}
                                                </span>
                                                <Button
                                                  variant='outline'
                                                  size='sm'
                                                  className='h-7 text-xs px-2 bg-transparent'
                                                  onClick={() =>
                                                    viewJsonData(
                                                      output.output_data
                                                    )
                                                  }>
                                                  View JSON
                                                </Button>
                                              </div>
                                              <pre className='text-xs overflow-auto max-h-[150px] bg-background p-2 rounded font-mono'>
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
                                    </CardContent>
                                  </Card>
                                )
                              )}
                            </div>
                          </div>
                        )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </CardContent>
        )}
      </Card>
    );
  }
);

ExecutionLogCard.displayName = "ExecutionLogCard";

// Add display names to components
ExecutionLogsList.displayName = "ExecutionLogsList";
ExecutionLogCard.displayName = "ExecutionLogCard";

export default ExecutionLogsList;
