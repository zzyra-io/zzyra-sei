"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { formatDistance } from "date-fns";
import {
  CheckCircle2,
  Clock,
  Loader2,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  XCircle,
  FileText,
  ArrowDownAZ,
  ArrowUpZA,
  Filter,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createClient } from "@/lib/supabase/client";
import { debounce } from "lodash";
// import { topologicalSort } from "@/lib/utils/graph";
import { Workflow } from "@/lib/supabase/schema";

// ### TypeScript Interfaces
interface Execution {
  id: string;
  workflow_id: string;
  status: "completed" | "failed" | "running" | "paused" | "pending";
  started_at: string;
  completed_at?: string;
  error?: string;
}

interface NodeExecution {
  id: string;
  execution_id: string;
  node_id: string;
  status: "completed" | "failed" | "running" | "paused" | "pending";
  started_at: string;
  completed_at?: string;
  error?: string;
  output_data?: Record<string, unknown>;
  output?: Record<string, unknown>;
  input_data?: Record<string, unknown>;
  input?: Record<string, unknown>;
}

interface NodeInput {
  execution_id: string;
  node_id: string;
  data: Record<string, unknown>;
}

interface NodeOutput {
  execution_id: string;
  node_id: string;
  data: Record<string, unknown>;
}

interface NodeLog {
  execution_id: string;
  node_id: string;
  timestamp: string;
  level: "info" | "warning" | "error";
  message: string;
  data?: Record<string, unknown>;
}

interface ExecutionLogsListProps {
  workflowId: string;
  workflow?: Workflow;
}

// ### Main Component
export function ExecutionLogsList({
  workflowId,
  workflow,
}: ExecutionLogsListProps) {
  const supabase = createClient();
  const { toast } = useToast();

  // ### State Definitions
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [nodeExecutionsMap, setNodeExecutionsMap] = useState<
    Record<string, NodeExecution[]>
  >({});
  const [nodeInputsMap, setNodeInputsMap] = useState<Record<string, Record<string, unknown>>>({});
  const [nodeOutputsMap, setNodeOutputsMap] = useState<Record<string, Record<string, unknown>>>({});
  const [nodeLogsMap, setNodeLogsMap] = useState<Record<string, NodeLog[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | Execution["status"]>(
    "all"
  );
  const [sortKey, setSortKey] = useState<"started_at" | "duration">(
    "started_at"
  );
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"all" | Execution["status"]>(
    "all"
  );
  const [jsonViewerData, setJsonViewerData] = useState<Record<string, unknown> | null>(null);
  const [isJsonDialogOpen, setIsJsonDialogOpen] = useState(false);
  const [loadingExecutionIds, setLoadingExecutionIds] = useState<Set<string>>(
    new Set()
  );

  // ### Fetch Executions (Lazy Loading Initial Data)
  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("workflow_executions")
        .select("*")
        .eq("workflow_id", workflowId)
        .order(sortKey, { ascending: sortAsc });

      if (statusFilter !== "all") query = query.eq("status", statusFilter);

      const { data, error } = await query;
      if (error)
        throw new Error(`Failed to fetch executions: ${error.message}`);
      if (!data) throw new Error("No execution data returned");

      setExecutions(data as Execution[]);
    } catch (e: any) {
      toast({
        title: "Fetch Error",
        description: e.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [supabase, workflowId, statusFilter, sortKey, sortAsc, toast]);
  console.log("nodeExecutionsMap", nodeExecutionsMap);

  const debouncedFetchLogs = useCallback(debounce(fetchLogs, 1000), [
    fetchLogs,
  ]);

  const loadNodeData = useCallback(
    async (executionId: string) => {
      if (
        loadingExecutionIds.has(executionId) ||
        nodeExecutionsMap[executionId]
      ) {
        return;
      }

      setLoadingExecutionIds((prev) => new Set(prev).add(executionId));
      try {
        const [nodeExecutionsRes, inputsRes, outputsRes, logsRes] =
          await Promise.all([
            supabase
              .from("node_executions")
              .select("*")
              .eq("execution_id", executionId),
            supabase
              .from("node_inputs")
              .select("*")
              .eq("execution_id", executionId),
            supabase
              .from("node_outputs")
              .select("*")
              .eq("execution_id", executionId),
            supabase
              .from("node_logs")
              .select("*")
              .eq("execution_id", executionId),
          ]);

        if (nodeExecutionsRes.error)
          throw new Error(nodeExecutionsRes.error.message);
        if (inputsRes.error) throw new Error(inputsRes.error.message);
        if (outputsRes.error) throw new Error(outputsRes.error.message);
        if (logsRes.error) throw new Error(logsRes.error.message);

        const nodeExecutions = nodeExecutionsRes.data as NodeExecution[];
        // Map inputs from the database to our state
        const inputsMap = Object.fromEntries(
          (inputsRes.data || []).map((input: any) => [
            `${input.execution_id}_${input.node_id}`,
            input.input_data || input.data,
          ])
        );
        // Map outputs from the database to our state
        const outputsMap = Object.fromEntries(
          (outputsRes.data || []).map((output: any) => [
            `${output.execution_id}_${output.node_id}`,
            output.output_data || output.data,
          ])
        );
        const logsMap = (logsRes.data || []).reduce(
          (acc: Record<string, NodeLog[]>, l: NodeLog) => {
            const key = `${l.execution_id}_${l.node_id}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(l);
            return acc;
          },
          {}
        );

        setNodeExecutionsMap((prev) => ({
          ...prev,
          [executionId]: nodeExecutions,
        }));
        setNodeInputsMap((prev) => ({ ...prev, ...inputsMap }));
        setNodeOutputsMap((prev) => ({ ...prev, ...outputsMap }));
        setNodeLogsMap((prev) => ({ ...prev, ...logsMap }));
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        toast({
          title: "Error Loading Node Data",
          description: errorMessage || "Failed to load node details",
          variant: "destructive",
        });
      } finally {
        setLoadingExecutionIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(executionId);
          return newSet;
        });
      }
    },
    [
      supabase,
      toast,
      loadingExecutionIds,
      nodeExecutionsMap,
      setNodeExecutionsMap,
      setNodeInputsMap,
      setNodeOutputsMap,
      setNodeLogsMap,
    ]
  );

  // Optimized useEffect to trigger loadNodeData
  useEffect(() => {
    const toLoad = Object.entries(expandedLogs)
      .filter(
        ([id, isExpanded]) =>
          isExpanded && !nodeExecutionsMap[id] && !loadingExecutionIds.has(id)
      )
      .map(([id]) => id);

    if (toLoad.length === 0) return;

    // Batch load to prevent multiple rapid triggers
    const loadAll = async () => {
      await Promise.all(toLoad.map((executionId) => loadNodeData(executionId)));
    };

    loadAll();
  }, [expandedLogs, nodeExecutionsMap, loadingExecutionIds, loadNodeData]);

  // ### Real-Time Subscriptions
  useEffect(() => {
    fetchLogs();

    const subscriptions = [
      supabase
        .channel("realtime-executions")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "workflow_executions",
            filter: `workflow_id=eq.${workflowId}`,
          },
          debouncedFetchLogs
        )
        .subscribe(),
    ];

    return () => {
      subscriptions.forEach((sub) => supabase.removeChannel(sub));
    };
  }, [
    workflowId,
    statusFilter,
    sortKey,
    sortAsc,
    debouncedFetchLogs,
    fetchLogs,
  ]);

  // ### Memoized Status Counts
  const statusCounts = useMemo(() => {
    const counts = {
      all: executions.length,
      completed: 0,
      failed: 0,
      running: 0,
      paused: 0,
    };
    executions.forEach((exec) => {
      if (counts[exec.status as keyof typeof counts] !== undefined) {
        counts[exec.status as keyof typeof counts]++;
      }
    });
    return counts;
  }, [executions]);

  // ### Memoized Filtered Executions
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

  useEffect(() => {
    if (!supabase) return;
  }, [supabase]);

  // ### Utility Functions
  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(date);
  }, []);

  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case "completed":
        return (
          <CheckCircle2
            className='h-4 w-4 text-green-500'
            aria-label='Completed'
          />
        );
      case "failed":
        return <XCircle className='h-4 w-4 text-red-500' aria-label='Failed' />;
      case "running":
        return (
          <Loader2
            className='h-4 w-4 text-blue-500 animate-spin'
            aria-label='Running'
          />
        );
      case "paused":
        return <Pause className='h-4 w-4 text-amber-500' aria-label='Paused' />;
      default:
        return <Clock className='h-4 w-4 text-gray-500' aria-label='Pending' />;
    }
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

  const handleAction = async (
    action: string,
    logId: string,
    nodeId?: string
  ) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/execution/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ executionId: logId, nodeId }),
      });
      if (!response.ok) throw new Error(`Action ${action} failed`);
      await fetchLogs();
    } catch (e: any) {
      toast({
        title: "Action Error",
        description: e.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const viewJsonData = (data: Record<string, unknown>) => {
    setJsonViewerData(data);
    setIsJsonDialogOpen(true);
  };

  // ### Render
  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0'>
        <CardHeader className='-mx-4'>
          <CardTitle>Execution Logs</CardTitle>
          <CardDescription>
            Monitor and manage your workflow executions
          </CardDescription>
        </CardHeader>
        <div className='flex items-center gap-2'>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='outline'
                  size='icon'
                  onClick={fetchLogs}
                  disabled={isLoading}
                  aria-label='Refresh logs'
                  className='h-9 w-9'>
                  <RefreshCw
                    className={isLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh logs</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant='outline' size='sm' className='gap-1'>
                <Filter className='h-4 w-4' />
                <span>Filter</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-56'>
              <DropdownMenuItem onClick={() => setStatusFilter("all")}>
                All Statuses
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("completed")}>
                <CheckCircle2 className='mr-2 h-4 w-4 text-green-500' />
                Completed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("failed")}>
                <XCircle className='mr-2 h-4 w-4 text-red-500' />
                Failed
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("running")}>
                <Loader2 className='mr-2 h-4 w-4 text-blue-500' />
                Running
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setStatusFilter("paused")}>
                <Pause className='mr-2 h-4 w-4 text-amber-500' />
                Paused
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setSortKey("started_at");
                  setSortAsc(false);
                }}>
                <Clock className='mr-2 h-4 w-4' />
                Sort by Start Time
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setSortKey("duration");
                  setSortAsc(false);
                }}>
                <FileText className='mr-2 h-4 w-4' />
                Sort by Duration
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSortAsc(!sortAsc)}>
                {sortAsc ? (
                  <>
                    <ArrowUpZA className='mr-2 h-4 w-4' />
                    Sort Ascending
                  </>
                ) : (
                  <>
                    <ArrowDownAZ className='mr-2 h-4 w-4' />
                    Sort Descending
                  </>
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Status Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className='w-full'>
        <TabsList className='grid grid-cols-5'>
          <TabsTrigger value='all'>
            All{" "}
            <Badge variant='secondary' className='ml-1 text-xs'>
              {statusCounts.all}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value='running'>
            Running{" "}
            <Badge variant='secondary' className='ml-1 text-xs'>
              {statusCounts.running}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value='paused'>
            Paused{" "}
            <Badge variant='secondary' className='ml-1 text-xs'>
              {statusCounts.paused}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value='completed'>
            Completed{" "}
            <Badge variant='secondary' className='ml-1 text-xs'>
              {statusCounts.completed}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value='failed'>
            Failed{" "}
            <Badge variant='secondary' className='ml-1 text-xs'>
              {statusCounts.failed}
            </Badge>
          </TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className='mt-4'>
          {isLoading ? (
            <div className='flex items-center justify-center p-12'>
              <Loader2 className='h-8 w-8 animate-spin text-primary' />
              <p className='text-sm text-muted-foreground'>
                Loading execution logs...
              </p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className='flex flex-col items-center justify-center rounded-lg border border-dashed p-12'>
              <FileText className='h-10 w-10 text-muted-foreground' />
              <h3 className='mt-4 text-lg font-semibold'>
                No execution logs found
              </h3>
            </div>
          ) : (
            <div className='space-y-4'>
              {filteredLogs.map((log) => (
                <ExecutionLogCard
                  key={log.id}
                  log={log}
                  expandedLogs={expandedLogs}
                  setExpandedLogs={setExpandedLogs}
                  formatDate={formatDate}
                  getStatusIcon={getStatusIcon}
                  getStatusBadge={getStatusBadge}
                  handleAction={handleAction}
                  viewJsonData={viewJsonData}
                  nodeExecutions={nodeExecutionsMap[log.id]}
                  nodeInputs={nodeInputsMap}
                  nodeOutputs={nodeOutputsMap}
                  nodeLogs={nodeLogsMap}
                  isLoading={loadingExecutionIds.has(log.id)}
                  workflow={workflow}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* JSON Viewer Dialog */}
      <Dialog open={isJsonDialogOpen} onOpenChange={setIsJsonDialogOpen}>
        <DialogContent className='max-w-3xl'>
          <DialogHeader>
            <DialogTitle>JSON Data</DialogTitle>
            <DialogDescription>
              Detailed view of the execution data
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className='max-h-[60vh]'>
            <pre className='bg-muted p-4 rounded-md text-xs font-mono overflow-auto'>
              {jsonViewerData
                ? JSON.stringify(jsonViewerData, null, 2)
                : "No data available"}
            </pre>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ### Execution Log Card Component
interface ExecutionLogCardProps {
  log: Execution;
  expandedLogs: Record<string, boolean>;
  setExpandedLogs: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  formatDate: (dateString: string) => string;
  getStatusIcon: (status: string) => JSX.Element;
  getStatusBadge: (status: string) => JSX.Element;
  handleAction: (
    action: string,
    logId: string,
    nodeId?: string
  ) => Promise<void>;
  viewJsonData: (data: any) => void;
  nodeExecutions?: NodeExecution[];
  nodeInputs: Record<string, any>;
  nodeOutputs: Record<string, any>;
  nodeLogs: Record<string, NodeLog[]>;
  isLoading: boolean;
  workflow?: Workflow;
}

export const ExecutionLogCard = React.memo(
  ({
    log,
    expandedLogs,
    setExpandedLogs,
    formatDate,
    getStatusIcon,
    getStatusBadge,
    handleAction,
    viewJsonData,
    nodeExecutions,
    nodeInputs,
    nodeOutputs,
    nodeLogs,
    isLoading,
    workflow,
  }: ExecutionLogCardProps) => {
    const duration = useMemo(() => {
      return log.completed_at
        ? formatDistance(new Date(log.started_at), new Date(log.completed_at))
        : "In progress";
    }, [log.completed_at, log.started_at]);

    return (
      <Card
        className={`overflow-hidden transition-all duration-200 ${
          log.status === "failed" ? "border-red-200" : ""
        }`}>
        <CardHeader className='pb-2'>
          <div className='flex justify-between items-start'>
            <div className='flex items-center gap-2'>
              {getStatusIcon(log.status)}
              <div>
                <CardTitle className='text-base'>
                  Execution {log.id.substring(0, 8)}
                </CardTitle>
                <CardDescription>
                  Started: {formatDate(log.started_at)}
                </CardDescription>
              </div>
            </div>
            <div className='flex items-center gap-2'>
              {getStatusBadge(log.status)}
              {/* Action Buttons */}
              {log.status === "running" && (
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => handleAction("pause", log.id)}
                  className='h-7 text-xs px-2'>
                  <Pause className='w-3 h-3 mr-1' />
                  Pause
                </Button>
              )}
              {log.status === "paused" && (
                <Button
                  size='sm'
                  variant='default'
                  onClick={() => handleAction("resume", log.id)}
                  className='h-7 text-xs px-2'>
                  <Play className='w-3 h-3 mr-1' />
                  Resume
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <Accordion
          type='single'
          collapsible
          value={expandedLogs[log.id] ? log.id : ""}
          onValueChange={(val) =>
            setExpandedLogs((prev) => ({ ...prev, [log.id]: val === log.id }))
          }>
          <AccordionItem value={log.id} className='border-0'>
            <AccordionTrigger className='py-2 px-6 hover:no-underline'>
              <span className='text-sm font-medium'>View Details</span>
            </AccordionTrigger>
            <AccordionContent>
              <CardContent className='pt-0'>
                <div className='space-y-4'>
                  <div className='grid grid-cols-2 sm:grid-cols-4 gap-4 p-3 bg-muted/30 rounded-lg'>
                    <div>
                      <p className='text-xs font-medium text-muted-foreground'>
                        Started
                      </p>
                      <p className='text-sm'>{formatDate(log.started_at)}</p>
                    </div>
                    {log.completed_at && (
                      <div>
                        <p className='text-xs font-medium text-muted-foreground'>
                          Completed
                        </p>
                        <p className='text-sm'>
                          {formatDate(log.completed_at)}
                        </p>
                      </div>
                    )}
                  </div>

                  {log.error && (
                    <div className='bg-red-50 border border-red-200 rounded-md p-3'>
                      <p className='text-sm text-red-700'>{log.error}</p>
                    </div>
                  )}

                  <div>
                    <div className='flex items-center justify-between mb-3'>
                      <p className='text-sm font-medium'>Node Executions</p>
                      <Badge variant='outline' className='text-xs'>
                        {nodeExecutions?.length || 0} nodes
                      </Badge>
                    </div>

                    {expandedLogs[log.id] && (
                      <>
                        {isLoading ? (
                          <div className='flex items-center justify-center p-8'>
                            <Loader2 className='h-4 w-4 animate-spin mr-2' />
                            <span className='text-sm text-muted-foreground'>
                              Loading node executions...
                            </span>
                          </div>
                        ) : nodeExecutions ? (
                          <div className='border rounded-md divide-y'>
                            {nodeExecutions.map((nodeExec) => (
                              <NodeExecutionItem
                                key={nodeExec.id}
                                nodeExec={nodeExec}
                                log={log}
                                expandedLogs={expandedLogs}
                                setExpandedLogs={setExpandedLogs}
                                getStatusIcon={getStatusIcon}
                                getStatusBadge={getStatusBadge}
                                formatDate={formatDate}
                                handleAction={handleAction}
                                viewJsonData={viewJsonData}
                                nodeInputs={nodeInputs}
                                nodeOutputs={nodeOutputs}
                                nodeLogs={nodeLogs}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className='text-sm text-muted-foreground'>
                            No node executions available
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        <CardFooter className='py-3 bg-muted/10'>
          <div className='w-full flex justify-between text-xs text-muted-foreground'>
            <span>Duration: {duration}</span>
            <span className='font-mono'>ID: {log.id}</span>
          </div>
        </CardFooter>
      </Card>
    );
  }
);

// ### Node Execution Item Component
const NodeExecutionItem = React.memo(
  ({
    nodeExec,
    log,
    expandedLogs,
    setExpandedLogs,
    getStatusIcon,
    getStatusBadge,
    formatDate,
    handleAction,
    viewJsonData,
    nodeInputs,
    nodeOutputs,
    nodeLogs,
  }: {
    nodeExec: NodeExecution;
    log: Execution;
    expandedLogs: Record<string, boolean>;
    setExpandedLogs: React.Dispatch<
      React.SetStateAction<Record<string, boolean>>
    >;
    getStatusIcon: (status: string) => JSX.Element;
    getStatusBadge: (status: string) => JSX.Element;
    formatDate: (dateString: string) => string;
    handleAction: (
      action: string,
      logId: string,
      nodeId?: string
    ) => Promise<void>;
    viewJsonData: (data: any) => void;
    nodeInputs: Record<string, any>;
    nodeOutputs: Record<string, any>;
    nodeLogs: Record<string, NodeLog[]>;
  }) => {
    const [logLevel, setLogLevel] = useState<
      "all" | "info" | "warning" | "error"
    >("all");
    console.log("nodeInputs", nodeInputs);

    const filteredNodeLogs = useMemo(() => {
      const logsArr = nodeLogs[`${log.id}_${nodeExec.node_id}`] || [];
      if (logLevel === "all") return logsArr;
      return logsArr.filter((l) => l.level === logLevel);
    }, [nodeLogs, log.id, nodeExec.node_id, logLevel]);
    console.log("log", {
      log,
      nodeExec,
      nodeLogs,
      logLevel,
      filteredNodeLogs,
    });

    return (
      <div className='p-3'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            {getStatusIcon(nodeExec.status)}
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
                    <span className='text-xs font-medium'>Filter:</span>
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
                          {JSON.stringify(nodeInputs[`${log.id}_${nodeExec.node_id}`], null, 2)}
                          <Button
                            variant='outline'
                            size='sm'
                            className='absolute top-2 right-2 h-6 text-xs'
                            onClick={() => viewJsonData(nodeInputs[`${log.id}_${nodeExec.node_id}`])}
                          >
                            Expand
                          </Button>
                        </div>
                      ) : nodeExec?.input_data || nodeExec?.input ? (
                        <div className='relative'>
                          {JSON.stringify(nodeExec?.input_data || nodeExec?.input, null, 2)}
                          <Button
                            variant='outline'
                            size='sm'
                            className='absolute top-2 right-2 h-6 text-xs'
                            onClick={() => viewJsonData(nodeExec?.input_data || nodeExec?.input)}
                          >
                            Expand
                          </Button>
                        </div>
                      ) : "No input"}
                    </pre>
                  </div>
                  <div>
                    <span className='text-xs font-medium text-muted-foreground'>
                      Outputs
                    </span>
                    <pre className='bg-muted p-2 rounded text-xs overflow-x-auto mt-1'>
                      {nodeOutputs[`${log.id}_${nodeExec.node_id}`] ? (
                        <div className='relative'>
                          {JSON.stringify(nodeOutputs[`${log.id}_${nodeExec.node_id}`], null, 2)}
                          <Button
                            variant='outline'
                            size='sm'
                            className='absolute top-2 right-2 h-6 text-xs'
                            onClick={() => viewJsonData(nodeOutputs[`${log.id}_${nodeExec.node_id}`])}
                          >
                            Expand
                          </Button>
                        </div>
                      ) : nodeExec?.output_data || nodeExec?.output ? (
                        <div className='relative'>
                          {JSON.stringify(nodeExec?.output_data || nodeExec?.output, null, 2)}
                          <Button
                            variant='outline'
                            size='sm'
                            className='absolute top-2 right-2 h-6 text-xs'
                            onClick={() => viewJsonData(nodeExec?.output_data || nodeExec?.output)}
                          >
                            Expand
                          </Button>
                        </div>
                      ) : "No output"}
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
                            {logEntry.data && (
                              <Button
                                variant='ghost'
                                size='sm'
                                className='text-[10px] p-0 h-5 px-1.5'
                                onClick={() => viewJsonData(logEntry.data)}>
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
                        onClick={() => viewJsonData(nodeInputs[nodeExec.node_id])}>
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
                        onClick={() => viewJsonData(nodeOutputs[nodeExec.node_id])}>
                        Expand
                      </Button>
                    </div>
                  </div>
                )}
                
                {/* Fallback to output_data if nodeOutputs doesn't have this node's data */}
                {!nodeOutputs[nodeExec.node_id] && nodeExec.output_data && (
                  <div className='mt-2'>
                    <div className='font-medium text-xs mb-1'>Output Data (Legacy)</div>
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

// Add display names to components
ExecutionLogsList.displayName = 'ExecutionLogsList';
ExecutionLogCard.displayName = 'ExecutionLogCard';

export default ExecutionLogsList;
