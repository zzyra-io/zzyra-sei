"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Play,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  Pause,
  RotateCw,
} from "lucide-react";
import { ExecutionHistory } from "@/components/execution/execution-history";
import { ExecutionLogs } from "@/components/execution/execution-logs";
import { ExecutionNodeExecutions } from "@/components/execution/execution-node-executions";
import { toast } from "@/components/ui/use-toast";
import { executionsApi, workflowsApi } from "@/lib/services/api";

interface Execution {
  id: string;
  workflowId: string;
  status: string;
  startedAt: string;
  finishedAt?: string;
  error?: string;
}

interface ExecutionPanelProps {
  workflowId: string;
  executions: Execution[];
  activeExecutionId?: string;
}

export function ExecutionPanel({
  workflowId,
  executions,
  activeExecutionId,
}: ExecutionPanelProps) {
  const [isExecuting, setIsExecuting] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [currentExecutionId, setCurrentExecutionId] = useState<
    string | undefined
  >(activeExecutionId);
  const router = useRouter();

  // Poll for updates every 3 seconds for running executions
  useEffect(() => {
    if (!currentExecutionId) return;

    const activeExecution = executions.find(
      (execution) => execution.id === currentExecutionId
    );
    if (!activeExecution || activeExecution.status !== "running") return;

    const interval = setInterval(() => {
      router.refresh();
    }, 3000);

    return () => clearInterval(interval);
  }, [currentExecutionId, router, executions]);

  async function handleExecute() {
    setIsExecuting(true);
    try {
      const result = await workflowsApi.executeWorkflow(workflowId);

      if (result.executionId) {
        setCurrentExecutionId(result.executionId);
        toast({
          title: "Execution started",
          description: "Your workflow is now running.",
        });
        router.refresh();
      } else {
        toast({
          title: "Execution failed",
          description: "Failed to start execution",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  }

  async function handleResume() {
    if (!currentExecutionId) return;

    setIsResuming(true);
    try {
      await executionsApi.resumeExecution(currentExecutionId);

      toast({
        title: "Execution resumed",
        description: "Your workflow is now running again.",
      });

      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsResuming(false);
    }
  }

  async function handlePause() {
    if (!currentExecutionId) return;

    setIsPausing(true);
    try {
      await executionsApi.pauseExecution(currentExecutionId);

      toast({
        title: "Execution paused",
        description: "Your workflow has been paused.",
      });

      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPausing(false);
    }
  }

  async function handleRetry() {
    if (!currentExecutionId) return;

    setIsRetrying(true);
    try {
      await executionsApi.retryExecution(currentExecutionId);

      toast({
        title: "Execution retried",
        description: "Your workflow is running again.",
      });

      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsRetrying(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "completed":
        return <Badge className='bg-green-100 text-green-800'>Completed</Badge>;
      case "failed":
        return <Badge className='bg-red-100 text-red-800'>Failed</Badge>;
      case "running":
        return <Badge className='bg-blue-100 text-blue-800'>Running</Badge>;
      case "paused":
        return <Badge className='bg-yellow-100 text-yellow-800'>Paused</Badge>;
      default:
        return <Badge className='bg-gray-100 text-gray-800'>Pending</Badge>;
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case "completed":
        return <CheckCircle className='h-5 w-5 text-green-500' />;
      case "failed":
        return <AlertCircle className='h-5 w-5 text-red-500' />;
      case "running":
        return <Play className='h-5 w-5 text-blue-500' />;
      case "paused":
        return <Pause className='h-5 w-5 text-yellow-500' />;
      default:
        return <Clock className='h-5 w-5 text-gray-500' />;
    }
  }

  // Get the active execution
  const activeExecution = currentExecutionId
    ? executions.find((execution) => execution.id === currentExecutionId)
    : undefined;

  return (
    <div className='space-y-6'>
      {/* Execution Controls */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            {activeExecution && getStatusIcon(activeExecution.status)}
            Execution Controls
          </CardTitle>
          <CardDescription>
            Start, pause, resume, or retry workflow executions
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex gap-2'>
            <Button
              onClick={handleExecute}
              disabled={isExecuting || activeExecution?.status === "running"}
              className='flex items-center gap-2'>
              {isExecuting ? (
                <Loader2 className='h-4 w-4 animate-spin' />
              ) : (
                <Play className='h-4 w-4' />
              )}
              Start Execution
            </Button>

            {activeExecution?.status === "paused" && (
              <Button
                onClick={handleResume}
                disabled={isResuming}
                variant='outline'
                className='flex items-center gap-2'>
                {isResuming ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <Play className='h-4 w-4' />
                )}
                Resume
              </Button>
            )}

            {activeExecution?.status === "running" && (
              <Button
                onClick={handlePause}
                disabled={isPausing}
                variant='outline'
                className='flex items-center gap-2'>
                {isPausing ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <Pause className='h-4 w-4' />
                )}
                Pause
              </Button>
            )}

            {(activeExecution?.status === "failed" ||
              activeExecution?.status === "paused") && (
              <Button
                onClick={handleRetry}
                disabled={isRetrying}
                variant='outline'
                className='flex items-center gap-2'>
                {isRetrying ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <RotateCw className='h-4 w-4' />
                )}
                Retry
              </Button>
            )}
          </div>

          {activeExecution && (
            <div className='flex items-center gap-2'>
              <span className='text-sm font-medium'>Status:</span>
              {getStatusBadge(activeExecution.status)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Execution Details */}
      {activeExecution && (
        <Card>
          <CardHeader>
            <CardTitle>Execution Details</CardTitle>
            <CardDescription>
              Real-time monitoring of workflow execution
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue='nodes' className='w-full'>
              <TabsList className='grid w-full grid-cols-3'>
                <TabsTrigger value='nodes'>Node Executions</TabsTrigger>
                <TabsTrigger value='logs'>Logs</TabsTrigger>
                <TabsTrigger value='history'>History</TabsTrigger>
              </TabsList>

              <TabsContent value='nodes' className='space-y-4'>
                <ExecutionNodeExecutions
                  executionId={currentExecutionId!}
                  refreshInterval={3000}
                />
              </TabsContent>

              <TabsContent value='logs' className='space-y-4'>
                <ExecutionLogs executionId={currentExecutionId!} />
              </TabsContent>

              <TabsContent value='history' className='space-y-4'>
                <ExecutionHistory
                  workflowId={workflowId}
                  executions={executions}
                  onSelectExecution={(id) => setCurrentExecutionId(id)}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {activeExecution?.error && (
        <Alert variant='destructive'>
          <AlertCircle className='h-4 w-4' />
          <AlertTitle>Execution Error</AlertTitle>
          <AlertDescription>{activeExecution.error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
