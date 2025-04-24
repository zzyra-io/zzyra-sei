"use client";

import React from "react";

import { DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import { useState, useEffect } from "react";
import { formatDistance } from "date-fns";
import {
  AlertCircle,
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

interface ExecutionLogsListProps {
  workflowId: string;
}

export function ExecutionLogsList({ workflowId }: ExecutionLogsListProps) {
  const supabase = createClient();
  const { toast } = useToast();

  // State
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortKey, setSortKey] = useState<"started_at" | "duration">(
    "started_at"
  );
  const [sortAsc, setSortAsc] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState("all");
  const [jsonViewerData, setJsonViewerData] = useState<any>(null);
  const [isJsonDialogOpen, setIsJsonDialogOpen] = useState(false);
  const [nodeInputs, setNodeInputs] = useState<Record<string, any>>({});
  const [nodeOutputs, setNodeOutputs] = useState<Record<string, any>>({});
  const [nodeLogs, setNodeLogs] = useState<Record<string, any[]>>({});

  // Fetch logs on component mount and when filters change
  useEffect(() => {
    fetchLogs();
  }, [statusFilter, sortKey, sortAsc]);

  // Fetch logs and all related data
  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      let q = supabase
        .from("workflow_executions")
        .select("*, node_executions(*)")
        .eq("workflow_id", workflowId)
        .order(sortKey, { ascending: sortAsc });
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      setLogs(data || []);
      // Fetch node_inputs/outputs/logs for all executions
      if (data && data.length > 0) {
        const execIds = data.map((e: any) => e.id);
        const nodeExecs = data.flatMap((e: any) => e.node_executions || []);
        // Inputs
        const { data: inputs } = await supabase
          .from("node_inputs")
          .select("*")
          .in("execution_id", execIds);
        const inputsMap: Record<string, any> = {};
        (inputs || []).forEach((i: any) => {
          inputsMap[`${i.execution_id}_${i.node_id}`] = i.data;
        });
        setNodeInputs(inputsMap);
        // Outputs
        const { data: outputs } = await supabase
          .from("node_outputs")
          .select("*")
          .in("execution_id", execIds);
        const outputsMap: Record<string, any> = {};
        (outputs || []).forEach((o: any) => {
          outputsMap[`${o.execution_id}_${o.node_id}`] = o.data;
        });
        setNodeOutputs(outputsMap);
        // Logs
        const { data: logsData } = await supabase
          .from("node_logs")
          .select("*")
          .in("execution_id", execIds);
        console.log("[ExecutionLogsList] fetched node_logs data:", logsData);
        const logsMap: Record<string, any[]> = {};
        (logsData || []).forEach((l: any) => {
          const k = `${l.execution_id}_${l.node_id}`;
          console.log(`Mapping log key ${k}`, l);
          if (!logsMap[k]) logsMap[k] = [];
          logsMap[k].push(l);
        });
        setNodeLogs(logsMap);
      }
    } catch (e: any) {
      toast({
        title: "Fetch error",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(date);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className='h-4 w-4 text-green-500' />;
      case "failed":
        return <XCircle className='h-4 w-4 text-red-500' />;
      case "running":
        return <Loader2 className='h-4 w-4 text-blue-500 animate-spin' />;
      case "paused":
        return <Pause className='h-4 w-4 text-amber-500' />;
      default:
        return <Clock className='h-4 w-4 text-gray-500' />;
    }
  };

  const getStatusBadge = (status: string) => {
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
  };

  // Real-time subscriptions
  useEffect(() => {
    fetchLogs();
    const execSub = supabase
      .channel("realtime-executions")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workflow_executions",
          filter: `workflow_id=eq.${workflowId}`,
        },
        fetchLogs
      )
      .subscribe();
    const nodeSub = supabase
      .channel("realtime-node_executions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "node_executions" },
        fetchLogs
      )
      .subscribe();
    const inputSub = supabase
      .channel("realtime-node_inputs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "node_inputs" },
        fetchLogs
      )
      .subscribe();
    const outputSub = supabase
      .channel("realtime-node_outputs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "node_outputs" },
        fetchLogs
      )
      .subscribe();
    const logsSub = supabase
      .channel("realtime-node_logs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "node_logs" },
        fetchLogs
      )
      .subscribe();
    return () => {
      supabase.removeChannel(execSub);
      supabase.removeChannel(nodeSub);
      supabase.removeChannel(inputSub);
      supabase.removeChannel(outputSub);
      supabase.removeChannel(logsSub);
    };
    // eslint-disable-next-line
  }, [workflowId, statusFilter, sortKey, sortAsc]);

  // Action handler (pause, resume, retry, cancel)
  const handleAction = async (
    action: string,
    logId: string,
    nodeId?: string
  ) => {
    setIsLoading(true);
    try {
      await fetch(`/api/execution/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ executionId: logId, nodeId }),
      });
      await fetchLogs();
    } catch (e: any) {
      toast({
        title: "Action error",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const viewJsonData = (data: any) => {
    setJsonViewerData(data);
    setIsJsonDialogOpen(true);
  };

  // Filter logs by tab
  const getFilteredLogs = () => {
    if (activeTab === "all") return logs;
    return logs.filter((log) => log.status === activeTab);
  };

  // Count logs by status for tab badges
  const getStatusCounts = () => {
    const counts = {
      all: logs.length,
      completed: 0,
      failed: 0,
      running: 0,
      paused: 0,
    };

    logs.forEach((log) => {
      if (counts[log.status as keyof typeof counts] !== undefined) {
        counts[log.status as keyof typeof counts]++;
      }
    });

    return counts;
  };

  const statusCounts = getStatusCounts();

  return (
    <div className='space-y-6'>
      {/* Header with improved layout and visual hierarchy */}
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
              <DropdownMenuItem
                className={statusFilter === "all" ? "bg-muted" : ""}
                onClick={() => setStatusFilter("all")}>
                All Statuses
              </DropdownMenuItem>
              <DropdownMenuItem
                className={statusFilter === "completed" ? "bg-muted" : ""}
                onClick={() => setStatusFilter("completed")}>
                <CheckCircle2 className='mr-2 h-4 w-4 text-green-500' />
                Completed
              </DropdownMenuItem>
              <DropdownMenuItem
                className={statusFilter === "failed" ? "bg-muted" : ""}
                onClick={() => setStatusFilter("failed")}>
                <XCircle className='mr-2 h-4 w-4 text-red-500' />
                Failed
              </DropdownMenuItem>
              <DropdownMenuItem
                className={statusFilter === "running" ? "bg-muted" : ""}
                onClick={() => setStatusFilter("running")}>
                <Loader2 className='mr-2 h-4 w-4 text-blue-500' />
                Running
              </DropdownMenuItem>
              <DropdownMenuItem
                className={statusFilter === "paused" ? "bg-muted" : ""}
                onClick={() => setStatusFilter("paused")}>
                <Pause className='mr-2 h-4 w-4 text-amber-500' />
                Paused
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                className={sortKey === "started_at" ? "bg-muted" : ""}
                onClick={() => {
                  setSortKey("started_at");
                  setSortAsc(false);
                }}>
                <Clock className='mr-2 h-4 w-4' />
                Sort by Start Time
              </DropdownMenuItem>
              <DropdownMenuItem
                className={sortKey === "duration" ? "bg-muted" : ""}
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

      {/* Status tabs for quick filtering */}
      <Tabs
        defaultValue='all'
        value={activeTab}
        onValueChange={setActiveTab}
        className='w-full'>
        <TabsList className='grid grid-cols-5'>
          <TabsTrigger value='all' className='relative'>
            All
            <Badge variant='secondary' className='ml-1 text-xs'>
              {statusCounts.all}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value='running' className='relative'>
            Running
            <Badge variant='secondary' className='ml-1 text-xs'>
              {statusCounts.running}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value='paused' className='relative'>
            Paused
            <Badge variant='secondary' className='ml-1 text-xs'>
              {statusCounts.paused}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value='completed' className='relative'>
            Completed
            <Badge variant='secondary' className='ml-1 text-xs'>
              {statusCounts.completed}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value='failed' className='relative'>
            Failed
            <Badge variant='secondary' className='ml-1 text-xs'>
              {statusCounts.failed}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className='mt-4'>
          {isLoading ? (
            <div className='flex items-center justify-center p-12'>
              <div className='flex flex-col items-center gap-2'>
                <Loader2 className='h-8 w-8 animate-spin text-primary' />
                <p className='text-sm text-muted-foreground'>
                  Loading execution logs...
                </p>
              </div>
            </div>
          ) : getFilteredLogs().length === 0 ? (
            <div className='flex flex-col items-center justify-center rounded-lg border border-dashed p-12'>
              <div className='flex h-20 w-20 items-center justify-center rounded-full bg-muted'>
                <FileText className='h-10 w-10 text-muted-foreground' />
              </div>
              <h3 className='mt-4 text-lg font-semibold'>
                No execution logs found
              </h3>
              <p className='mt-2 text-center text-sm text-muted-foreground'>
                {statusFilter !== "all"
                  ? `No executions with status "${statusFilter}" were found.`
                  : "There are no execution logs available."}
              </p>
              <Button onClick={fetchLogs} variant='outline' className='mt-4'>
                <RefreshCw className='mr-2 h-4 w-4' />
                Refresh
              </Button>
            </div>
          ) : (
            <div className='space-y-4'>
              {getFilteredLogs().map((log) => (
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
                  nodeInputs={nodeInputs}
                  nodeOutputs={nodeOutputs}
                  nodeLogs={nodeLogs}
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

export const ExecutionLogCard = ({
  log,
  expandedLogs,
  setExpandedLogs,
  formatDate,
  getStatusIcon,
  getStatusBadge,
  handleAction,
  viewJsonData,
  nodeInputs,
  nodeOutputs,
  nodeLogs,
}: {
  log: any;
  expandedLogs: Record<string, boolean>;
  setExpandedLogs: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  formatDate: (dateString: string) => string;
  getStatusIcon: (status: string) => any;
  getStatusBadge: (status: string) => any;
  handleAction: (
    action: string,
    logId: string,
    nodeId?: string
  ) => Promise<void>;
  viewJsonData: (data: any) => void;
  nodeInputs: Record<string, any>;
  nodeOutputs: Record<string, any>;
  nodeLogs: Record<string, any[]>;
}) => {
  console.log("log", log);
  return (
    <Card
      className={`overflow-hidden transition-all duration-200 ${
        log.status === "failed"
          ? "border-red-200"
          : log.status === "running"
          ? "border-blue-200"
          : log.status === "paused"
          ? "border-amber-200"
          : log.status === "completed"
          ? "border-green-200"
          : ""
      }`}>
      <CardHeader className='pb-2'>
        <div className='flex justify-between items-start'>
          <div className='flex items-center gap-2'>
            {getStatusIcon(log.status)}
            <div>
              <CardTitle className='text-base flex items-center gap-2'>
                Execution {log.id.substring(0, 8)}
              </CardTitle>
              <CardDescription>
                Started: {formatDate(log.started_at)}
              </CardDescription>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            {getStatusBadge(log.status)}

            {/* Quick action buttons based on status */}
            {log.status === "running" && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size='icon'
                      variant='ghost'
                      className='h-8 w-8 text-amber-600 hover:bg-amber-50 hover:text-amber-700'
                      onClick={() => handleAction("pause", log.id)}>
                      <Pause className='h-4 w-4' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Pause Execution</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {log.status === "paused" && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size='icon'
                      variant='ghost'
                      className='h-8 w-8 text-green-600 hover:bg-green-50 hover:text-green-700'
                      onClick={() => handleAction("resume", log.id)}>
                      <Play className='h-4 w-4' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Resume Execution</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            {log.status === "failed" && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size='icon'
                      variant='ghost'
                      className='h-8 w-8 text-blue-600 hover:bg-blue-50 hover:text-blue-700'
                      onClick={() => handleAction("retry", log.id)}>
                      <RotateCcw className='h-4 w-4' />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Retry Execution</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </CardHeader>

      <Accordion
        type='single'
        collapsible
        value={expandedLogs[log.id] ? log.id : ""}
        onValueChange={(val) => {
          setExpandedLogs((prev) => ({
            ...prev,
            [log.id]: val === log.id,
          }));
        }}>
        <AccordionItem value={log.id} className='border-0'>
          <AccordionTrigger className='py-2 px-6 hover:no-underline'>
            <span className='text-sm font-medium'>View Details</span>
          </AccordionTrigger>
          <AccordionContent>
            <CardContent className='pt-0'>
              <div className='space-y-4'>
                {/* Execution metadata */}
                <div className='grid grid-cols-2 sm:grid-cols-4 gap-4 p-3 bg-muted/30 rounded-lg'>
                  <div>
                    <p className='text-xs font-medium text-muted-foreground'>
                      Started
                    </p>
                    <p className='text-sm'>{formatDate(log.started_at)}</p>
                  </div>
                  <div>
                    <p className='text-xs font-medium text-muted-foreground'>
                      Completed
                    </p>
                    <p className='text-sm'>
                      {log.completed_at
                        ? formatDate(log.completed_at)
                        : "Not completed"}
                    </p>
                  </div>
                  <div>
                    <p className='text-xs font-medium text-muted-foreground'>
                      Duration
                    </p>
                    <p className='text-sm'>
                      {log.completed_at
                        ? formatDistance(
                            new Date(log.created_at),
                            new Date(log.completed_at)
                          )
                        : "In progress"}
                    </p>
                  </div>
                  <div>
                    <p className='text-xs font-medium text-muted-foreground'>
                      Execution ID
                    </p>
                    <p className='text-sm font-mono'>{log.id}</p>
                  </div>
                </div>

                {/* Error message if present */}
                {log.error && (
                  <div className='bg-red-50 border border-red-200 rounded-md p-3'>
                    <div className='flex items-center gap-2 mb-1'>
                      <AlertCircle className='h-4 w-4 text-red-500' />
                      <p className='text-sm font-medium text-red-800'>Error</p>
                    </div>
                    <p className='text-sm text-red-700'>{log.error}</p>
                  </div>
                )}

                {/* Node executions */}
                <div>
                  <div className='flex items-center justify-between mb-3'>
                    <p className='text-sm font-medium'>Node Executions</p>
                    <Badge variant='outline' className='text-xs'>
                      {log.node_executions?.length || 0} nodes
                    </Badge>
                  </div>

                  {!log.node_executions ? (
                    <div className='flex items-center justify-center p-8 border rounded-md'>
                      <Loader2 className='h-4 w-4 animate-spin mr-2' />
                      <span className='text-sm text-muted-foreground'>
                        Loading node executions...
                      </span>
                    </div>
                  ) : (
                    <div className='border rounded-md divide-y'>
                      {log.node_executions.map((nodeExec: any) => (
                        <NodeExecutionItem
                          nodeInputs={nodeInputs}
                          nodeOutputs={nodeOutputs}
                          nodeLogs={nodeLogs}
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
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <CardFooter className='py-3 bg-muted/10'>
        <div className='w-full flex justify-between text-xs text-muted-foreground'>
          <span>
            Duration:{" "}
            {log.completed_at
              ? formatDistance(
                  new Date(log.started_at),
                  new Date(log.completed_at)
                )
              : "In progress"}
          </span>
          <span className='font-mono'>ID: {log.id}</span>
        </div>
      </CardFooter>
    </Card>
  );
};

// Node execution component
type NodeExecutionItemProps = {
  nodeExec: any;
  log: any;
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
  nodeLogs: Record<string, any[]>;
};

function NodeExecutionItem({
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
}: NodeExecutionItemProps) {
  const [logLevel, setLogLevel] = useState("all");
  const [resumeData, setResumeData] = useState("");

  const loadInputData = async () => {
    try {
      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 400));

      // Mock input data
      const mockInputData = {
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
      };

      setResumeData(JSON.stringify(mockInputData, null, 2));
    } catch (error) {
      // Handle error
    }
  };

  // Filter logs by level
  const getFilteredLogs = () => {
    const logsArr = nodeLogs[`${log.id}_${nodeExec.node_id}`] || [];
    if (logLevel === "all") return logsArr;
    return logsArr.filter((l: any) => l.level === logLevel);
  };

  return (
    <div className='p-3'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          {getStatusIcon(nodeExec.status)}
          <span className='text-sm font-medium'>Node: {nodeExec.node_id}</span>
        </div>
        {getStatusBadge(nodeExec.status)}
      </div>

      <p className='text-xs text-muted-foreground mt-1'>
        {formatDate(nodeExec.completed_at || nodeExec.started_at)}
      </p>

      {/* Node action buttons */}
      <div className='flex flex-wrap gap-2 mt-3 items-center justify-between border-t pt-2'>
        <div className='flex gap-1.5'>
          {/* Show pause only for running nodes */}
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

          {/* Show cancel for running or paused nodes */}
          {(nodeExec.status === "running" || nodeExec.status === "paused") && (
            <Button
              size='sm'
              variant='outline'
              className='h-7 text-xs px-2 bg-red-50 hover:bg-red-100 border-red-200 text-red-700'
              onClick={() => handleAction("cancel", log.id, nodeExec.node_id)}>
              <XCircle className='w-3 h-3 mr-1' />
              Cancel
            </Button>
          )}

          {/* Show retry for failed nodes */}
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

        {/* Resume button for paused nodes */}
        <div>
          {nodeExec.status === "paused" && (
            <Button
              size='sm'
              variant='default'
              className='h-7 text-xs px-3 bg-green-600 hover:bg-green-700'
              onClick={() => {
                // Expand this specific log+node combination
                const key = `${log.id}-${nodeExec.node_id}`;
                setExpandedLogs((prev) => ({
                  ...prev,
                  [key]: true,
                }));
              }}>
              <Play className='w-3 h-3 mr-1' />
              Resume
            </Button>
          )}
        </div>
      </div>

      {/* Node Logs Section */}
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
            setExpandedLogs((prev) => ({
              ...prev,
              [key]: val === key,
            }));
          }}>
          <AccordionItem value={`${log.id}-${nodeExec.node_id}`}>
            <AccordionTrigger className='text-xs py-1 hover:no-underline'>
              <span className='flex items-center gap-1'>
                <FileText className='h-3 w-3' />
                View Logs & Details
              </span>
            </AccordionTrigger>
            <AccordionContent>
              {/* Log Level Filter */}
              <div className='mb-3 flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <span className='text-xs font-medium'>Filter:</span>
                  <select
                    className='text-xs border rounded px-2 py-1 bg-white'
                    value={logLevel}
                    aria-label='Filter logs by level'
                    onChange={(e) => setLogLevel(e.target.value)}>
                    <option value='all'>All Levels</option>
                    <option value='info'>Info</option>
                    <option value='warning'>Warning</option>
                    <option value='error'>Error</option>
                  </select>
                </div>
                <div className='text-xs text-muted-foreground'>
                  {getFilteredLogs().length} log entries
                </div>
              </div>

              {/* Inputs/Outputs */}
              <div className='mb-3 grid grid-cols-1 md:grid-cols-2 gap-2'>
                <div>
                  <span className='text-xs font-medium text-muted-foreground'>
                    Inputs
                  </span>
                  <pre className='bg-muted p-2 rounded text-xs overflow-x-auto mt-1'>
                    {nodeInputs[`${log.id}_${nodeExec.node_id}`]
                      ? JSON.stringify(
                          nodeInputs[`${log.id}_${nodeExec.node_id}`],
                          null,
                          2
                        )
                      : "No input"}
                  </pre>
                </div>
                <div>
                  <span className='text-xs font-medium text-muted-foreground'>
                    Outputs
                  </span>
                  <pre className='bg-muted p-2 rounded text-xs overflow-x-auto mt-1'>
                    {nodeOutputs[`${log.id}_${nodeExec.node_id}`]
                      ? JSON.stringify(
                          nodeOutputs[`${log.id}_${nodeExec.node_id}`],
                          null,
                          2
                        )
                      : "No output"}
                  </pre>
                </div>
              </div>
              {/* Node Logs */}
              <div className='bg-gray-50 border rounded-md p-3 max-h-48 overflow-y-auto text-xs font-mono'>
                {getFilteredLogs().length > 0 ? (
                  getFilteredLogs().map((logEntry: any, idx: number) => {
                    // Determine log level styling
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

              {/* Output Data */}
              {nodeExec.output_data && (
                <div className='mt-2'>
                  <div className='font-medium text-xs mb-1'>Output Data</div>
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

              {/* Error Details */}
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

              {/* Paused Node Resume Controls */}
              {nodeExec.status === "paused" && (
                <div className='mt-4 border rounded-md bg-green-50 border-green-100 p-3'>
                  <div className='flex items-center gap-2 mb-2'>
                    <Play className='h-4 w-4 text-green-600' />
                    <div className='font-medium text-sm text-green-800'>
                      Resume Paused Execution
                    </div>
                  </div>

                  <div className='text-xs text-green-700 mb-2'>
                    This node is paused. You can modify the input data before
                    resuming execution.
                  </div>

                  <div className='mb-1 text-xs font-medium text-green-800'>
                    Input Data:
                  </div>
                  <textarea
                    value={resumeData}
                    onChange={(e) => setResumeData(e.target.value)}
                    className='w-full text-xs border rounded p-2 mb-3 font-mono bg-white border-green-200 focus:border-green-400 focus:ring-green-400'
                    rows={5}
                    placeholder='Edit input data before resuming (JSON format)'
                  />

                  <div className='flex justify-between items-center'>
                    <Button
                      variant='outline'
                      size='sm'
                      className='text-xs bg-white border-green-200 text-green-700 hover:bg-green-100'
                      onClick={loadInputData}>
                      Load Input Data
                    </Button>

                    <Button
                      size='sm'
                      className='text-xs bg-green-600 hover:bg-green-700'
                      onClick={() =>
                        handleAction("resume", log.id, nodeExec.node_id)
                      }>
                      <Play className='h-3 w-3 mr-1' />
                      Resume Execution
                    </Button>
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

// Mock data generator function
function generateMockLogs() {
  const statuses = ["completed", "failed", "running", "paused"];
  const nodeTypes = [
    "fetch_data",
    "process_data",
    "analyze_results",
    "generate_report",
    "send_notification",
  ];

  const logs = [];

  for (let i = 0; i < 5; i++) {
    const startDate = new Date();
    startDate.setHours(startDate.getHours() - Math.floor(Math.random() * 24));

    const status = statuses[Math.floor(Math.random() * statuses.length)];

    const completedDate =
      status === "completed" || status === "failed"
        ? new Date(startDate.getTime() + Math.floor(Math.random() * 3600000))
        : null;

    const nodeExecutions = [];
    const logEntries = [];

    // Generate 2-5 node executions per log
    const nodeCount = Math.floor(Math.random() * 4) + 2;

    for (let j = 0; j < nodeCount; j++) {
      const nodeType = nodeTypes[Math.floor(Math.random() * nodeTypes.length)];
      const nodeStatus = j === nodeCount - 1 ? status : "completed";

      const nodeStartDate = new Date(startDate.getTime() + j * 300000);
      const nodeCompletedDate =
        nodeStatus === "completed" || nodeStatus === "failed"
          ? new Date(
              nodeStartDate.getTime() + Math.floor(Math.random() * 600000)
            )
          : null;

      // Generate output data for completed nodes
      const outputData =
        nodeStatus === "completed"
          ? {
              processedItems: Math.floor(Math.random() * 100) + 1,
              success: true,
              metadata: {
                duration: Math.floor(Math.random() * 500) + 100,
                timestamp: nodeCompletedDate?.toISOString(),
              },
            }
          : null;

      // Generate error for failed nodes
      const error =
        nodeStatus === "failed"
          ? "Failed to process data: timeout exceeded"
          : null;

      nodeExecutions.push({
        id: `node_${i}_${j}_${Math.random().toString(36).substring(2, 10)}`,
        node_id: `${nodeType}_${j}`,
        status: nodeStatus,
        started_at: nodeStartDate.toISOString(),
        completed_at: nodeCompletedDate?.toISOString(),
        output_data: outputData,
        error,
      });

      // Generate 3-8 log entries per node
      const logCount = Math.floor(Math.random() * 6) + 3;

      for (let k = 0; k < logCount; k++) {
        const logTimestamp = new Date(nodeStartDate.getTime() + k * 60000);
        const logLevel =
          Math.random() > 0.8
            ? "error"
            : Math.random() > 0.6
            ? "warning"
            : "info";

        let logMessage = "";
        if (logLevel === "info") {
          logMessage = `Processing ${nodeType} step ${k + 1}`;
        } else if (logLevel === "warning") {
          logMessage = `Warning: Slow response time detected in ${nodeType}`;
        } else {
          logMessage = `Error: Failed to complete operation in ${nodeType}`;
        }

        logEntries.push({
          node_id: `${nodeType}_${j}`,
          timestamp: logTimestamp.toISOString(),
          level: logLevel,
          message: logMessage,
          data:
            Math.random() > 0.5
              ? {
                  details: "Additional log data here",
                  code: Math.floor(Math.random() * 100),
                }
              : null,
        });
      }
    }

    logs.push({
      id: `exec_${Math.random().toString(36).substring(2, 15)}`,
      status,
      started_at: startDate.toISOString(),
      completed_at: completedDate?.toISOString(),
      node_executions: nodeExecutions,
      logs: logEntries,
      error:
        status === "failed"
          ? "Execution failed due to an error in one of the nodes"
          : null,
    });
  }

  return logs;
}
