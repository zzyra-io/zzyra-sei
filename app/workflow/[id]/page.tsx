"use client";

import { use, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { AuthGate } from "@/components/auth-gate";
import { DashboardHeader } from "@/components/dashboard-header";
import { ExecutionLogsList } from "@/components/execution-logs-list";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { workflowService } from "@/lib/services/workflow-service";
import { executionService } from "@/lib/services/execution-service";
import type { Workflow } from "@/lib/supabase/schema";
import type { ExecutionResult } from "@/lib/services/execution-service";
import type {
  NodeExecution,
  ExecutionLog,
} from "@/lib/services/execution-service";
import { ArrowLeft, Play, Settings, Loader2 } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
  Scatter,
  Legend,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { getPausedNodeSnapshot } from "@/lib/services/paused-node-service";
import { useRef } from "react";
import WorkflowTimeline from "@/components/workflow-execution-timeline";

export default function WorkflowDetailPage() {
  // Grab route params client-side
  const paramsClient = useParams();
  const id = Array.isArray(paramsClient?.id)
    ? paramsClient.id[0]
    : paramsClient?.id;
  if (!id) {
    return null; // or show a loader
  }

  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [executionLogs, setExecutionLogs] = useState<ExecutionResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState<{
    avgDuration: number;
    medianDuration: number;
    peakConcurrency: number;
  } | null>(null);
  const [trends, setTrends] = useState<
    Array<{ timestamp: string; count: number }>
  >([]);
  const [heatmap, setHeatmap] = useState<
    Array<{
      nodeId: string;
      date: string;
      avgDuration: number;
      failureRate: number;
    }>
  >([]);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(
    null
  );
  const [execDetail, setExecDetail] = useState<ExecutionResult | null>(null);
  const [replaying, setReplaying] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [levelFilter, setLevelFilter] = useState<
    "all" | "info" | "warning" | "error"
  >("all");
  const [modalLog, setModalLog] = useState<ExecutionLog | null>(null);
  const [pausedSnapshot, setPausedSnapshot] = useState<any | null>(null);
  const [resumeLoading, setResumeLoading] = useState(false);
  const pausedInputRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const router = useRouter();

  // Supabase browser client for realtime
  const supabaseClient = createClient();

  // Prepare timeline data for Gantt
  // --- PATCH: Always show all nodes, even if not started ---
  const timelineData =
    execDetail && workflow
      ? workflow.nodes.map((node) => {
          const ne = execDetail.nodeExecutions.find(
            (n) => n.node_id === node.id
          );
          const startMs = ne?.started_at
            ? new Date(ne.started_at).getTime()
            : null;
          const endMs = ne?.completed_at
            ? new Date(ne.completed_at).getTime()
            : startMs;
          return {
            name: node.id,
            label: node.data?.label || node.data?.name || node.type || node.id,
            status: ne?.status || "pending",
            start: startMs,
            duration: startMs && endMs ? endMs - startMs : 0,
          };
        })
      : [];

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // First fetch the workflow data
        const workflowData = await workflowService.getWorkflow(id);
        setWorkflow(workflowData);

        // Then try to fetch execution logs, but don't fail if they can't be fetched
        try {
          const logsData = await executionService.getWorkflowExecutions(id);
          setExecutionLogs(logsData);
        } catch (logsError) {
          console.error("Error fetching execution logs:", logsError);
          // Set empty logs array if there's an error
          setExecutionLogs([]);
          // Show a toast notification about the logs error
          toast({
            title: "Warning",
            description:
              "Could not load execution history. Some features may be limited.",
          });
        }

        // Fetch aggregated stats
        try {
          const statsRes = await fetch(
            `/api/executions/stats?workflowId=${id}`
          );
          if (statsRes.ok) setStats(await statsRes.json());
        } catch (err) {
          console.error("Error fetching stats:", err);
        }
        // Fetch execution trends
        try {
          const trendsRes = await fetch(
            `/api/executions/trends?workflowId=${id}`
          );
          if (trendsRes.ok) setTrends(await trendsRes.json());
        } catch (err) {
          console.error("Error fetching trends:", err);
        }
        // Fetch heatmap data
        try {
          const hmRes = await fetch(`/api/executions/heatmap?workflowId=${id}`);
          if (hmRes.ok) setHeatmap(await hmRes.json());
        } catch (err) {
          console.error("Error fetching heatmap:", err);
        }
        // Initialize selected exec ID to latest
        if (executionLogs.length > 0) {
          setSelectedExecutionId(executionLogs[0].id);
        }
      } catch (error) {
        toast({
          title: "Error fetching workflow",
          description: "Failed to load workflow details. Please try again.",
          variant: "destructive",
        });
        router.push("/dashboard");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [id, toast, router]);

  useEffect(() => {
    if (activeTab === "timeline" && selectedExecutionId) {
      executionService
        .getExecution(selectedExecutionId)
        .then(setExecDetail)
        .catch((err) => console.error("Error fetching execution detail:", err));
      // reset node selection on exec change
      setSelectedNodeId(null);
    }
  }, [activeTab, selectedExecutionId]);

  useEffect(() => {
    if (activeTab === "timeline" && selectedExecutionId) {
      const channel = supabaseClient
        .channel(`node_exec_${selectedExecutionId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "node_executions",
            filter: `execution_id=eq.${selectedExecutionId}`,
          },
          (payload) => {
            setExecDetail((prev) =>
              prev
                ? {
                    ...prev,
                    nodeExecutions: [
                      ...prev.nodeExecutions,
                      payload.new as NodeExecution,
                    ],
                  }
                : prev
            );
          }
        )
        .subscribe();
      return () => {
        supabaseClient.removeChannel(channel);
      };
    }
  }, [activeTab, selectedExecutionId]);

  useEffect(() => {
    if (replaying && timelineData.length) {
      const timer = setInterval(() => {
        setReplayIndex((i) => {
          if (i + 1 >= timelineData.length) {
            setReplaying(false);
            return i;
          }
          return i + 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [replaying, timelineData]);

  const formatTime = (ms: number) => new Date(ms).toLocaleTimeString();
  const formatDuration = (val: number) => `${val} ms`;

  const handleExecute = async () => {
    try {
      setIsExecuting(true);
      // Start execution via API
      const res = await fetch("/api/execute-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workflowId: id }),
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to start execution");
      // Refresh execution history
      const logs = await executionService.getWorkflowExecutions(id);
      setExecutionLogs(logs);
      toast({
        title: "Workflow started",
        description: "Your workflow execution has been queued.",
      });
      setActiveTab("history");
    } catch (error) {
      toast({
        title: "Execution failed",
        description:
          error instanceof Error
            ? error.message
            : "Failed to execute workflow.",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleEdit = () => {
    router.push(`/builder?id=${id}`);
  };

  if (isLoading) {
    return (
      <AuthGate>
        <div className='flex min-h-screen flex-col'>
          <DashboardHeader />
          <main className='flex flex-1 items-center justify-center bg-muted/30'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
          </main>
        </div>
      </AuthGate>
    );
  }

  if (!workflow) {
    return (
      <AuthGate>
        <div className='flex min-h-screen flex-col'>
          <DashboardHeader />
          <main className='flex-1 bg-muted/30 px-4 py-6 sm:px-6 lg:px-8'>
            <div className='mx-auto max-w-7xl'>
              <div className='mb-6 flex items-center gap-4'>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => router.push("/dashboard")}>
                  <ArrowLeft className='mr-2 h-4 w-4' />
                  Back to Dashboard
                </Button>
              </div>
              <div className='rounded-lg border bg-card p-8 text-center'>
                <h2 className='text-xl font-semibold'>Workflow not found</h2>
                <p className='mt-2 text-muted-foreground'>
                  The workflow you're looking for doesn't exist or you don't
                  have permission to view it.
                </p>
                <Button
                  className='mt-4'
                  onClick={() => router.push("/dashboard")}>
                  Return to Dashboard
                </Button>
              </div>
            </div>
          </main>
        </div>
      </AuthGate>
    );
  }

  return (
    <AuthGate>
      <div className='flex min-h-screen flex-col'>
        <DashboardHeader />
        <main className='flex-1 bg-muted/30 px-4 py-6 sm:px-6 lg:px-8'>
          <div className='mx-auto max-w-7xl'>
            <div className='mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center'>
              <div className='flex items-center gap-4'>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={() => router.push("/dashboard")}>
                  <ArrowLeft className='mr-2 h-4 w-4' />
                  Back
                </Button>
                <h1 className='text-2xl font-bold tracking-tight'>
                  {workflow.name}
                </h1>
              </div>
              <div className='flex gap-2'>
                <Button variant='outline' onClick={handleEdit}>
                  <Settings className='mr-2 h-4 w-4' />
                  Edit
                </Button>
                <Button onClick={handleExecute} disabled={isExecuting}>
                  {isExecuting ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Executing...
                    </>
                  ) : (
                    <>
                      <Play className='mr-2 h-4 w-4' />
                      Execute
                    </>
                  )}
                </Button>
              </div>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className='space-y-4'>
              <TabsList>
                <TabsTrigger value='overview'>Overview</TabsTrigger>
                <TabsTrigger value='timeline'>Timeline</TabsTrigger>
                <TabsTrigger value='history'>Execution History</TabsTrigger>
              </TabsList>

              <TabsContent value='overview' className='space-y-4'>
                <Card>
                  <CardHeader>
                    <CardTitle>Workflow Details</CardTitle>
                    <CardDescription>
                      Created on{" "}
                      {new Date(workflow.created_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className='space-y-4'>
                      <div>
                        <h3 className='text-sm font-medium'>Description</h3>
                        <p className='mt-1 text-sm text-muted-foreground'>
                          {workflow.description || "No description provided."}
                        </p>
                      </div>
                      {workflow.tags && workflow.tags.length > 0 && (
                        <div>
                          <h3 className='text-sm font-medium'>Tags</h3>
                          <div className='mt-1 flex flex-wrap gap-1'>
                            {workflow.tags.map((tag) => (
                              <div
                                key={tag}
                                className='rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground'>
                                {tag}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <div>
                        <h3 className='text-sm font-medium'>
                          Workflow Structure
                        </h3>
                        <p className='mt-1 text-sm text-muted-foreground'>
                          This workflow contains {workflow.nodes.length} nodes
                          and {workflow.edges.length} connections.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Execution Summary</CardTitle>
                    <CardDescription>
                      Recent execution statistics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className='grid gap-4 sm:grid-cols-3'>
                      <div className='rounded-lg border p-4'>
                        <div className='text-sm font-medium text-muted-foreground'>
                          Total Executions
                        </div>
                        <div className='mt-1 text-2xl font-bold'>
                          {executionLogs.length}
                        </div>
                      </div>
                      <div className='rounded-lg border p-4'>
                        <div className='text-sm font-medium text-muted-foreground'>
                          Successful
                        </div>
                        <div className='mt-1 text-2xl font-bold text-green-500'>
                          {
                            executionLogs.filter(
                              (log) => log.status === "completed"
                            ).length
                          }
                        </div>
                      </div>
                      <div className='rounded-lg border p-4'>
                        <div className='text-sm font-medium text-muted-foreground'>
                          Failed
                        </div>
                        <div className='mt-1 text-2xl font-bold text-red-500'>
                          {
                            executionLogs.filter(
                              (log) => log.status === "failed"
                            ).length
                          }
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Performance KPIs</CardTitle>
                    <CardDescription>
                      Avg/Median Duration & Peak Concurrency
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className='grid gap-4 sm:grid-cols-3'>
                      <div className='rounded-lg border p-4'>
                        <div className='text-sm font-medium text-muted-foreground'>
                          Avg Duration
                        </div>
                        <div className='mt-1 text-2xl font-bold'>
                          {stats?.avgDuration ?? "-"}ms
                        </div>
                      </div>
                      <div className='rounded-lg border p-4'>
                        <div className='text-sm font-medium text-muted-foreground'>
                          Median Duration
                        </div>
                        <div className='mt-1 text-2xl font-bold'>
                          {stats?.medianDuration ?? "-"}ms
                        </div>
                      </div>
                      <div className='rounded-lg border p-4'>
                        <div className='text-sm font-medium text-muted-foreground'>
                          Peak Concurrency
                        </div>
                        <div className='mt-1 text-2xl font-bold'>
                          {stats?.peakConcurrency ?? "-"}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Executions Over Time</CardTitle>
                    <CardDescription>Last 30 days</CardDescription>
                  </CardHeader>
                  <CardContent style={{ height: 200 }}>
                    <ResponsiveContainer width='100%' height='100%'>
                      <LineChart data={trends}>
                        <XAxis dataKey='timestamp' hide />
                        <Tooltip />
                        <Line
                          type='monotone'
                          dataKey='count'
                          stroke='#4f46e5'
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Node Performance Heatmap</CardTitle>
                    <CardDescription>
                      Execution performance by node (last 30 days)
                    </CardDescription>
                  </CardHeader>
                  <CardContent style={{ height: 400 }}>
                    {heatmap && heatmap.length > 0 ? (
                      <ResponsiveContainer width='100%' height='100%'>
                        <ScatterChart
                          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                          <CartesianGrid strokeDasharray='3 3' />
                          <XAxis
                            type='category'
                            dataKey='date'
                            name='Date'
                            tick={{ fontSize: 12 }}
                            label={{
                              value: "Date",
                              position: "insideBottom",
                              offset: -15,
                            }}
                          />
                          <YAxis
                            type='category'
                            dataKey='nodeLabel'
                            name='Node'
                            width={150}
                            tick={{ fontSize: 12 }}
                            label={{
                              value: "Node",
                              angle: -90,
                              position: "insideLeft",
                            }}
                          />
                          <ZAxis
                            type='number'
                            dataKey='avgDuration'
                            range={[100, 1500]}
                            name='AvgDuration'
                          />
                          <Scatter
                            data={heatmap}
                            fill='#4f46e5'
                            shape='circle'
                          />
                          <Tooltip
                            cursor={{ strokeDasharray: "3 3" }}
                            content={({ active, payload }) => {
                              if (active && payload && payload.length) {
                                const data = payload[0].payload;
                                return (
                                  <div className='bg-white p-3 border rounded-md shadow-md text-xs'>
                                    <p className='font-medium'>
                                      {data.nodeLabel}
                                    </p>
                                    <p className='text-gray-500'>{data.date}</p>
                                    <div className='mt-2'>
                                      <p>
                                        <span className='font-medium'>
                                          Avg Duration:
                                        </span>{" "}
                                        {data.avgDuration} ms
                                      </p>
                                      <p>
                                        <span className='font-medium'>
                                          Failure Rate:
                                        </span>{" "}
                                        {data.failureRate}%
                                      </p>
                                      <p>
                                        <span className='font-medium'>
                                          Executions:
                                        </span>{" "}
                                        {data.executionCount}
                                      </p>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Legend verticalAlign='top' height={36} />
                        </ScatterChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className='h-full flex items-center justify-center flex-col p-6 text-center'>
                        <svg
                          xmlns='http://www.w3.org/2000/svg'
                          width='24'
                          height='24'
                          viewBox='0 0 24 24'
                          fill='none'
                          stroke='currentColor'
                          strokeWidth='2'
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          className='text-gray-400 mb-2'>
                          <rect
                            width='18'
                            height='18'
                            x='3'
                            y='3'
                            rx='2'
                            ry='2'></rect>
                          <line x1='3' x2='21' y1='9' y2='9'></line>
                          <line x1='9' x2='9' y1='21' y2='9'></line>
                        </svg>
                        <p className='text-gray-500 text-sm'>
                          No performance data available for this workflow
                        </p>
                        <p className='text-gray-400 text-xs mt-1'>
                          Run more executions to see performance metrics
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value='timeline' className='space-y-4'>
                <WorkflowTimeline />
              </TabsContent>

              <TabsContent value='history'>
                <Card>
                  <CardContent>
                    <ExecutionLogsList workflowId={id} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </AuthGate>
  );
}
