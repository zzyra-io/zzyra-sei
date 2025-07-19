"use client";
import React, { createContext, useContext, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  Eye,
  Download,
  RotateCcw,
  Activity,
  Database,
  ArrowRight,
  Info,
} from "lucide-react";

// Universal block execution states
export type BlockExecutionState =
  | "idle"
  | "queued"
  | "running"
  | "success"
  | "error"
  | "warning"
  | "skipped"
  | "cancelled";

// Execution log levels
export type LogLevel = "debug" | "info" | "warn" | "error";

// Log entry structure
export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  message: string;
  blockId?: string;
  blockType?: string;
  data?: any;
  duration?: number;
}

// Block execution data
export interface BlockExecutionData {
  blockId: string;
  blockType: string;
  blockName: string;
  state: BlockExecutionState;
  startTime?: string;
  endTime?: string;
  duration?: number;
  inputData?: any;
  outputData?: any;
  error?: string;
  logs: LogEntry[];
  metadata?: {
    retryCount?: number;
    maxRetries?: number;
    memoryUsage?: number;
    cpuUsage?: number;
  };
}

// Workflow execution context
export interface WorkflowExecutionContext {
  workflowId: string;
  executionId: string;
  state: "idle" | "running" | "completed" | "failed" | "cancelled";
  startTime?: string;
  endTime?: string;
  blocks: Record<string, BlockExecutionData>;
  logs: LogEntry[];
  progress: {
    total: number;
    completed: number;
    failed: number;
    running: number;
  };
}

// Context for workflow execution
const WorkflowExecutionContext = createContext<{
  execution: WorkflowExecutionContext | null;
  updateBlockState: (
    blockId: string,
    data: Partial<BlockExecutionData>
  ) => void;
  addLog: (log: Omit<LogEntry, "id" | "timestamp">) => void;
  startExecution: (workflowId: string) => void;
  stopExecution: () => void;
  clearLogs: () => void;
} | null>(null);

// Provider component
export function WorkflowExecutionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [execution, setExecution] = useState<WorkflowExecutionContext | null>(
    null
  );

  const updateBlockState = (
    blockId: string,
    data: Partial<BlockExecutionData>
  ) => {
    setExecution((prev) => {
      if (!prev) return null;

      const existingBlock = prev.blocks[blockId] || {
        blockId,
        blockType: data.blockType || "unknown",
        blockName: data.blockName || blockId,
        state: "idle",
        logs: [],
      };

      const updatedBlock = { ...existingBlock, ...data };

      // Update progress
      const blocks = { ...prev.blocks, [blockId]: updatedBlock };
      const blockValues = Object.values(blocks);
      const progress = {
        total: blockValues.length,
        completed: blockValues.filter((b) => b.state === "success").length,
        failed: blockValues.filter((b) => b.state === "error").length,
        running: blockValues.filter((b) => b.state === "running").length,
      };

      return {
        ...prev,
        blocks,
        progress,
      };
    });
  };

  const addLog = (log: Omit<LogEntry, "id" | "timestamp">) => {
    const newLog: LogEntry = {
      ...log,
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
    };

    setExecution((prev) => {
      if (!prev) return null;

      const logs = [...prev.logs, newLog];

      // Also add to block-specific logs if blockId is provided
      const blocks = log.blockId
        ? {
            ...prev.blocks,
            [log.blockId]: {
              ...prev.blocks[log.blockId],
              logs: [...(prev.blocks[log.blockId]?.logs || []), newLog],
            },
          }
        : prev.blocks;

      return { ...prev, logs, blocks };
    });
  };

  const startExecution = (workflowId: string) => {
    const executionId = `exec_${Date.now()}`;
    setExecution({
      workflowId,
      executionId,
      state: "running",
      startTime: new Date().toISOString(),
      blocks: {},
      logs: [],
      progress: { total: 0, completed: 0, failed: 0, running: 0 },
    });
  };

  const stopExecution = () => {
    setExecution((prev) =>
      prev
        ? {
            ...prev,
            state: "cancelled",
            endTime: new Date().toISOString(),
          }
        : null
    );
  };

  const clearLogs = () => {
    setExecution((prev) =>
      prev
        ? {
            ...prev,
            logs: [],
            blocks: Object.fromEntries(
              Object.entries(prev.blocks).map(([id, block]) => [
                id,
                { ...block, logs: [] },
              ])
            ),
          }
        : null
    );
  };

  return (
    <WorkflowExecutionContext.Provider
      value={{
        execution,
        updateBlockState,
        addLog,
        startExecution,
        stopExecution,
        clearLogs,
      }}>
      {children}
    </WorkflowExecutionContext.Provider>
  );
}

// Hook to use execution context
export function useWorkflowExecution() {
  const context = useContext(WorkflowExecutionContext);
  if (!context) {
    throw new Error(
      "useWorkflowExecution must be used within WorkflowExecutionProvider"
    );
  }
  return context;
}

// Block execution monitor component
interface BlockExecutionMonitorProps {
  blockId: string;
  className?: string;
}

export function BlockExecutionMonitor({
  blockId,
  className,
}: BlockExecutionMonitorProps) {
  const { execution } = useWorkflowExecution();
  const blockData = execution?.blocks[blockId];

  if (!blockData) return null;

  const getStateIcon = (state: BlockExecutionState) => {
    switch (state) {
      case "running":
        return <Loader2 className='h-4 w-4 animate-spin text-blue-500' />;
      case "success":
        return <CheckCircle className='h-4 w-4 text-green-500' />;
      case "error":
        return <AlertCircle className='h-4 w-4 text-red-500' />;
      case "warning":
        return <AlertCircle className='h-4 w-4 text-yellow-500' />;
      case "queued":
        return <Clock className='h-4 w-4 text-gray-500' />;
      case "skipped":
        return <ArrowRight className='h-4 w-4 text-gray-400' />;
      default:
        return <div className='h-4 w-4 rounded-full bg-gray-300' />;
    }
  };

  const getStateColor = (state: BlockExecutionState) => {
    switch (state) {
      case "running":
        return "bg-blue-500";
      case "success":
        return "bg-green-500";
      case "error":
        return "bg-red-500";
      case "warning":
        return "bg-yellow-500";
      case "queued":
        return "bg-gray-500";
      case "skipped":
        return "bg-gray-400";
      default:
        return "bg-gray-300";
    }
  };

  const getLevelIcon = (level: LogLevel) => {
    switch (level) {
      case "error":
        return <AlertCircle className='h-3 w-3 text-red-500' />;
      case "warn":
        return <AlertCircle className='h-3 w-3 text-yellow-500' />;
      case "info":
        return <Info className='h-3 w-3 text-blue-500' />;
      case "debug":
        return <Activity className='h-3 w-3 text-gray-500' />;
    }
  };

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case "error":
        return "border-red-200 bg-red-50";
      case "warn":
        return "border-yellow-200 bg-yellow-50";
      case "info":
        return "border-blue-200 bg-blue-50";
      case "debug":
        return "border-gray-200 bg-gray-50";
    }
  };

  return (
    <Card className={className}>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <div
              className={`w-2 h-2 rounded-full ${getStateColor(blockData.state)}`}
            />
            <CardTitle className='text-sm'>{blockData.blockName}</CardTitle>
            {getStateIcon(blockData.state)}
          </div>
          <div className='flex items-center gap-2'>
            <Badge variant='outline' className='text-xs'>
              {blockData.blockType}
            </Badge>
            {blockData.duration && (
              <Badge variant='secondary' className='text-xs'>
                <Clock className='h-2 w-2 mr-1' />
                {blockData.duration}ms
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className='pt-0'>
        <Tabs defaultValue='logs' className='w-full'>
          <TabsList className='grid w-full grid-cols-4 h-8'>
            <TabsTrigger value='logs' className='text-xs'>
              Logs
            </TabsTrigger>
            <TabsTrigger value='data' className='text-xs'>
              Data
            </TabsTrigger>
            <TabsTrigger value='performance' className='text-xs'>
              Performance
            </TabsTrigger>
            <TabsTrigger value='debug' className='text-xs'>
              Debug
            </TabsTrigger>
          </TabsList>

          <TabsContent value='logs' className='mt-3'>
            <ScrollArea className='h-40'>
              <div className='space-y-2'>
                {blockData.logs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-2 rounded border text-xs ${getLevelColor(log.level)}`}>
                    <div className='flex items-center gap-2'>
                      {getLevelIcon(log.level)}
                      <span className='font-mono text-xs'>
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <span className='font-medium uppercase'>{log.level}</span>
                    </div>
                    <div className='mt-1 text-sm'>{log.message}</div>
                    {log.data && (
                      <details className='mt-2'>
                        <summary className='cursor-pointer text-xs text-muted-foreground'>
                          View Data
                        </summary>
                        <pre className='mt-1 text-xs bg-black/5 p-2 rounded overflow-x-auto'>
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
                {blockData.logs.length === 0 && (
                  <div className='text-center text-muted-foreground text-xs py-4'>
                    No logs yet
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value='data' className='mt-3'>
            <div className='space-y-3'>
              {blockData.inputData && (
                <div>
                  <div className='flex items-center gap-2 mb-2'>
                    <Database className='h-3 w-3 text-blue-500' />
                    <span className='text-xs font-medium'>Input Data</span>
                  </div>
                  <pre className='bg-blue-50 p-3 rounded text-xs overflow-x-auto border'>
                    {JSON.stringify(blockData.inputData, null, 2)}
                  </pre>
                </div>
              )}

              {blockData.outputData && (
                <div>
                  <div className='flex items-center gap-2 mb-2'>
                    <Database className='h-3 w-3 text-green-500' />
                    <span className='text-xs font-medium'>Output Data</span>
                  </div>
                  <pre className='bg-green-50 p-3 rounded text-xs overflow-x-auto border'>
                    {JSON.stringify(blockData.outputData, null, 2)}
                  </pre>
                </div>
              )}

              {blockData.error && (
                <div>
                  <div className='flex items-center gap-2 mb-2'>
                    <AlertCircle className='h-3 w-3 text-red-500' />
                    <span className='text-xs font-medium'>Error</span>
                  </div>
                  <div className='bg-red-50 p-3 rounded text-xs border border-red-200'>
                    <code className='text-red-800'>{blockData.error}</code>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value='performance' className='mt-3'>
            <div className='space-y-3'>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <div className='text-xs text-muted-foreground'>Duration</div>
                  <div className='text-sm font-medium'>
                    {blockData.duration ? `${blockData.duration}ms` : "N/A"}
                  </div>
                </div>
                <div>
                  <div className='text-xs text-muted-foreground'>Status</div>
                  <div className='text-sm font-medium capitalize'>
                    {blockData.state}
                  </div>
                </div>
              </div>

              {blockData.metadata && (
                <div className='grid grid-cols-2 gap-4'>
                  {blockData.metadata.retryCount !== undefined && (
                    <div>
                      <div className='text-xs text-muted-foreground'>
                        Retries
                      </div>
                      <div className='text-sm font-medium'>
                        {blockData.metadata.retryCount}/
                        {blockData.metadata.maxRetries || 0}
                      </div>
                    </div>
                  )}
                  {blockData.metadata.memoryUsage && (
                    <div>
                      <div className='text-xs text-muted-foreground'>
                        Memory
                      </div>
                      <div className='text-sm font-medium'>
                        {(blockData.metadata.memoryUsage / 1024 / 1024).toFixed(
                          2
                        )}
                        MB
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className='text-xs text-muted-foreground space-y-1'>
                {blockData.startTime && (
                  <div>
                    Started: {new Date(blockData.startTime).toLocaleString()}
                  </div>
                )}
                {blockData.endTime && (
                  <div>
                    Finished: {new Date(blockData.endTime).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value='debug' className='mt-3'>
            <div className='space-y-3'>
              <div className='flex gap-2'>
                <Button size='sm' variant='outline' className='text-xs'>
                  <Eye className='h-3 w-3 mr-1' />
                  Inspect
                </Button>
                <Button size='sm' variant='outline' className='text-xs'>
                  <Download className='h-3 w-3 mr-1' />
                  Export
                </Button>
                <Button size='sm' variant='outline' className='text-xs'>
                  <RotateCcw className='h-3 w-3 mr-1' />
                  Retry
                </Button>
              </div>

              <div className='text-xs space-y-2'>
                <div>
                  <span className='text-muted-foreground'>Block ID:</span>
                  <code className='ml-2 bg-gray-100 px-1 rounded'>
                    {blockData.blockId}
                  </code>
                </div>
                <div>
                  <span className='text-muted-foreground'>Type:</span>
                  <code className='ml-2 bg-gray-100 px-1 rounded'>
                    {blockData.blockType}
                  </code>
                </div>
                <div>
                  <span className='text-muted-foreground'>Execution ID:</span>
                  <code className='ml-2 bg-gray-100 px-1 rounded'>
                    {execution?.executionId}
                  </code>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
