"use client";

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
import WorkflowTimeline from "@/components/workflow-execution-timeline";
import { useWorkflowDetail } from "@/lib/hooks/use-workflow-detail";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, Play, Settings } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

export default function WorkflowDetailPage() {
  const paramsClient = useParams();
  const id = Array.isArray(paramsClient?.id)
    ? paramsClient.id[0]
    : paramsClient?.id;

  const [isExecuting, setIsExecuting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  // Use the custom hook for workflow details
  const {
    workflow,
    stats,
    trends,
    heatmap,
    isWorkflowLoading,
    isLogsLoading,
    isStatsLoading,
    executionSummary,
    activeTab,
    setActiveTab,
    executionLogs,
  } = useWorkflowDetail(id);

  const handleExecute = async () => {
    try {
      setIsExecuting(true);
      
      // Import workflow service dynamically
      const { workflowService } = await import("@/lib/services/workflow-service");
      
      await workflowService.executeWorkflow({
        id: id as string,
        nodes: workflow?.nodes || [],
        edges: workflow?.edges || [],
      });

      // Invalidate and refetch execution logs
      await queryClient.invalidateQueries({
        queryKey: ["workflow-executions", id],
      });

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

  if (isWorkflowLoading) {
    return (
      <div className='flex min-h-screen flex-col'>
        <DashboardHeader />
        <main className='flex flex-1 items-center justify-center bg-muted/30'>
          <Loader2 className='h-8 w-8 animate-spin text-primary' />
        </main>
      </div>
    );
  }
  if (!id) return null; // or show a loader

  if (!workflow) {
    return (
      <div className='flex min-h-screen flex-col'>
        <DashboardHeader />
        <main className='flex-1 bg-muted/30 px-4 py-6 sm:px-6 lg:px-8'>
          <div className='mx-auto max-w-7xl'>
            <div className='mb-6 flex items-center gap-4'>
              <Button variant='ghost' size='sm' asChild>
                <Link href='/dashboard'>
                  <ArrowLeft className='mr-2 h-4 w-4' />
                  Back to Dashboard
                </Link>
              </Button>
            </div>
            <div className='rounded-lg border bg-card p-8 text-center'>
              <h2 className='text-xl font-semibold'>Workflow not found</h2>
              <p className='mt-2 text-muted-foreground'>
                The workflow you&apos;re looking for doesn&apos;t exist or you
                don&apos;t have permission to view it.
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
    );
  }

  return (
    <div className='flex min-h-screen flex-col'>
      <DashboardHeader />
      <main className='flex-1 bg-muted/30 px-4 py-6 sm:px-6 lg:px-8'>
        <div className='mx-auto max-w-7xl'>
          <div className='mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center'>
            <div className='flex items-center gap-4'>
              <Button variant='ghost' size='sm' asChild>
                <Link href='/dashboard'>
                  <ArrowLeft className='mr-2 h-4 w-4' />
                  Back
                </Link>
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
              <TabsTrigger value='overview' aria-label='View workflow overview'>
                Overview
              </TabsTrigger>
              <TabsTrigger
                value='timeline'
                aria-label='View execution timeline'>
                Timeline
              </TabsTrigger>
              <TabsTrigger value='history' aria-label='View execution history'>
                Execution History
              </TabsTrigger>
            </TabsList>

            <TabsContent value='overview' className='space-y-4'>
              <Card>
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-xl font-semibold">Workflow Details</CardTitle>
                      <CardDescription className="mt-1 flex items-center gap-2">
                        <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Created {workflow.created_at 
                          ? new Date(workflow.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })
                          : 'Unknown date'
                        }
                      </CardDescription>
                    </div>
                    <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${
                      executionSummary.total === 0 
                        ? 'bg-gray-100 text-gray-700'
                        : executionSummary.failed === 0 
                          ? 'bg-green-100 text-green-700'
                          : executionSummary.successful > executionSummary.failed 
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        executionSummary.total === 0 
                          ? 'bg-gray-400'
                          : executionSummary.failed === 0 
                            ? 'bg-green-500'
                            : executionSummary.successful > executionSummary.failed 
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                      }`} />
                      {executionSummary.total === 0 
                        ? 'Never executed'
                        : executionSummary.failed === 0 
                          ? 'Healthy'
                          : executionSummary.successful > executionSummary.failed 
                            ? 'Mostly successful'
                            : 'Needs attention'
                      }
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Description Section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <h3 className='font-medium text-foreground'>Description</h3>
                    </div>
                    <p className='text-sm text-muted-foreground leading-relaxed pl-6'>
                      {workflow.description || "No description provided."}
                    </p>
                  </div>

                  {/* Tags Section */}
                  {workflow.tags && workflow.tags.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        <h3 className='font-medium text-foreground'>Tags</h3>
                      </div>
                      <div className='flex flex-wrap gap-2 pl-6'>
                        {workflow.tags.map((tag) => (
                          <span
                            key={tag}
                            className='inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10'>
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Stats Grid */}
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Workflow Structure Card */}
                    <Card className="border-0 bg-slate-50/50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <svg className="h-4 w-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          <h4 className="font-medium text-sm">Structure</h4>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Nodes</span>
                            <span className="font-semibold text-blue-600">{workflow.nodes.length}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Connections</span>
                            <span className="font-semibold text-blue-600">{workflow.edges.length}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Complexity</span>
                            <span className={`font-semibold text-xs px-2 py-0.5 rounded-full ${
                              workflow.nodes.length <= 3 
                                ? 'bg-green-100 text-green-700' 
                                : workflow.nodes.length <= 8 
                                  ? 'bg-yellow-100 text-yellow-700' 
                                  : 'bg-red-100 text-red-700'
                            }`}>
                              {workflow.nodes.length <= 3 
                                ? 'Simple' 
                                : workflow.nodes.length <= 8 
                                  ? 'Medium' 
                                  : 'Complex'
                              }
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Execution Stats Card */}
                    <Card className="border-0 bg-green-50/50">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                          <h4 className="font-medium text-sm">Executions</h4>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Total</span>
                            <span className="font-semibold text-green-600">{executionSummary.total}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Successful</span>
                            <span className="font-semibold text-green-600">{executionSummary.successful}</span>
                          </div>
                          {executionSummary.total > 0 && (
                            <div className="flex justify-between text-sm">
                              <span className="text-muted-foreground">Success Rate</span>
                              <span className="font-semibold text-green-600">
                                {Math.round((executionSummary.successful / executionSummary.total) * 100)}%
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Node Types Card */}
                    {workflow.nodes && workflow.nodes.length > 0 && (
                      <Card className="border-0 bg-purple-50/50">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <svg className="h-4 w-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            <h4 className="font-medium text-sm">Node Types</h4>
                          </div>
                          <div className="space-y-2 max-h-20 overflow-y-auto">
                            {Object.entries(
                              workflow.nodes.reduce((acc: Record<string, number>, node: { type?: string }) => {
                                const type = node.type || 'Unknown';
                                acc[type] = (acc[type] || 0) + 1;
                                return acc;
                              }, {})
                            ).slice(0, 3).map(([type, count]) => (
                              <div key={type} className='flex justify-between text-sm'>
                                <span className='text-muted-foreground capitalize truncate'>
                                  {type.replace(/([A-Z])/g, ' $1').trim()}
                                </span>
                                <span className='font-semibold text-purple-600'>{count as number}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Last Execution Card */}
                    {executionLogs.length > 0 && (
                      <Card className="border-0 bg-orange-50/50">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <svg className="h-4 w-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <h4 className="font-medium text-sm">Last Run</h4>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                                executionLogs[0].status === 'completed' 
                                  ? 'bg-green-100 text-green-800'
                                  : executionLogs[0].status === 'failed'
                                    ? 'bg-red-100 text-red-800'
                                    : executionLogs[0].status === 'running'
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-gray-100 text-gray-800'
                              }`}>
                                {executionLogs[0].status}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {executionLogs[0].startedAt 
                                ? new Date(executionLogs[0].startedAt).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })
                                : 'Unknown time'
                              }
                            </div>
                            {executionLogs[0].finishedAt && executionLogs[0].startedAt && (
                              <div className="text-xs text-muted-foreground">
                                Duration: {Math.round(
                                  (new Date(executionLogs[0].finishedAt).getTime() - 
                                   new Date(executionLogs[0].startedAt).getTime()) / 1000
                                )}s
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Metadata Section */}
                  {workflow.updated_at && (
                    <div className="pt-4 border-t border-border/50">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          <span>Last modified</span>
                        </div>
                        <span className="font-medium">
                          {new Date(workflow.updated_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Execution Summary</CardTitle>
                  <CardDescription>Recent execution statistics</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLogsLoading ? (
                    <div className='flex justify-center p-4'>
                      <Loader2 className='h-6 w-6 animate-spin' />
                    </div>
                  ) : (
                    <div className='grid gap-4 sm:grid-cols-3'>
                      <div className='rounded-lg border p-4'>
                        <div className='text-sm font-medium text-muted-foreground'>
                          Total Executions
                        </div>
                        <div className='mt-1 text-2xl font-bold'>
                          {executionSummary.total}
                        </div>
                      </div>
                      <div className='rounded-lg border p-4'>
                        <div className='text-sm font-medium text-muted-foreground'>
                          Successful
                        </div>
                        <div className='mt-1 text-2xl font-bold text-green-500'>
                          {executionSummary.successful}
                        </div>
                      </div>
                      <div className='rounded-lg border p-4'>
                        <div className='text-sm font-medium text-muted-foreground'>
                          Failed
                        </div>
                        <div className='mt-1 text-2xl font-bold text-red-500'>
                          {executionSummary.failed}
                        </div>
                      </div>
                    </div>
                  )}
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
                  {isStatsLoading ? (
                    <div className='flex justify-center p-4'>
                      <Loader2 className='h-6 w-6 animate-spin' />
                    </div>
                  ) : stats ? (
                    <div className='grid gap-4 sm:grid-cols-3'>
                      <div className='rounded-lg border p-4'>
                        <div className='text-sm font-medium text-muted-foreground'>
                          Avg Duration
                        </div>
                        <div className='mt-1 text-2xl font-bold'>
                          {stats.avgDuration}ms
                        </div>
                      </div>
                      <div className='rounded-lg border p-4'>
                        <div className='text-sm font-medium text-muted-foreground'>
                          Median Duration
                        </div>
                        <div className='mt-1 text-2xl font-bold'>
                          {stats.medianDuration}ms
                        </div>
                      </div>
                      <div className='rounded-lg border p-4'>
                        <div className='text-sm font-medium text-muted-foreground'>
                          Peak Concurrency
                        </div>
                        <div className='mt-1 text-2xl font-bold'>
                          {stats.peakConcurrency}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className='text-muted-foreground'>
                      No performance data available
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Executions Over Time</CardTitle>
                  <CardDescription>Last 30 days</CardDescription>
                </CardHeader>
                <CardContent style={{ height: 200 }}>
                  {trends.length > 0 ? (
                    <ResponsiveContainer width='100%' height='100%'>
                      <LineChart
                        data={trends}
                        aria-label='Executions over time chart'>
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
                  ) : (
                    <p className='text-muted-foreground'>
                      No trend data available
                    </p>
                  )}
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
                  {heatmap.length > 0 ? (
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
                        <Scatter data={heatmap} fill='#4f46e5' shape='circle' />
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
  );
}
