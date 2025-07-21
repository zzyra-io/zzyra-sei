"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useExecutionWebSocket, NodeExecutionUpdate, EdgeFlowUpdate, ExecutionMetrics, ExecutionLog } from '@/hooks/use-execution-websocket';
import { Activity, CheckCircle2, XCircle, Clock, Zap, Wifi, WifiOff, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface RealTimeExecutionMonitorProps {
  executionId: string;
  workflowId: string;
  onNodeUpdate?: (nodeId: string, update: NodeExecutionUpdate) => void;
  onEdgeUpdate?: (edgeId: string, update: EdgeFlowUpdate) => void;
  className?: string;
}

interface ExecutionState {
  status: 'idle' | 'running' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  completedNodes: number;
  totalNodes: number;
  failedNodes: number;
  currentNode?: string;
  progress: number;
}

interface NodeState {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  error?: string;
  progress?: number;
}

export default function RealTimeExecutionMonitor({
  executionId,
  workflowId,
  onNodeUpdate,
  onEdgeUpdate,
  className
}: RealTimeExecutionMonitorProps) {
  const [executionState, setExecutionState] = useState<ExecutionState>({
    status: 'idle',
    completedNodes: 0,
    totalNodes: 0,
    failedNodes: 0,
    progress: 0
  });

  const [nodeStates, setNodeStates] = useState<Map<string, NodeState>>(new Map());
  const [recentLogs, setRecentLogs] = useState<ExecutionLog[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<ExecutionMetrics | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  // Handle node execution updates
  const handleNodeUpdate = useCallback((update: NodeExecutionUpdate) => {
    setNodeStates(prev => {
      const newState = new Map(prev);
      const nodeState: NodeState = {
        id: update.nodeId,
        status: update.status,
        startTime: update.startTime,
        endTime: update.endTime,
        duration: update.duration,
        error: update.error,
        progress: update.progress
      };
      newState.set(update.nodeId, nodeState);
      return newState;
    });

    // Update overall execution state
    setExecutionState(prev => {
      let newStatus = prev.status;
      let completedNodes = prev.completedNodes;
      let failedNodes = prev.failedNodes;
      let currentNode = prev.currentNode;

      if (update.status === 'running') {
        newStatus = 'running';
        currentNode = update.nodeId;
      } else if (update.status === 'completed') {
        completedNodes += 1;
        // Check if this was the last node
        if (completedNodes >= prev.totalNodes && failedNodes === 0) {
          newStatus = 'completed';
        }
      } else if (update.status === 'failed') {
        failedNodes += 1;
        newStatus = 'failed';
      }

      const progress = prev.totalNodes > 0 
        ? ((completedNodes + failedNodes) / prev.totalNodes) * 100 
        : 0;

      return {
        ...prev,
        status: newStatus,
        completedNodes,
        failedNodes,
        currentNode,
        progress
      };
    });

    // Notify parent component
    onNodeUpdate?.(update.nodeId, update);
  }, [onNodeUpdate]);

  // Handle edge flow updates
  const handleEdgeFlow = useCallback((update: EdgeFlowUpdate) => {
    // Trigger visual edge animation in parent component
    onEdgeUpdate?.(update.edgeId, update);
  }, [onEdgeUpdate]);

  // Handle execution completion
  const handleExecutionComplete = useCallback((data: { executionId: string; results?: any; duration: number }) => {
    setExecutionState(prev => ({
      ...prev,
      status: 'completed',
      endTime: new Date(),
      duration: data.duration
    }));
  }, []);

  // Handle execution failure
  const handleExecutionFailed = useCallback((data: { executionId: string; error: string; duration: number }) => {
    setExecutionState(prev => ({
      ...prev,
      status: 'failed',
      endTime: new Date(),
      duration: data.duration
    }));
  }, []);

  // Handle execution logs
  const handleExecutionLog = useCallback((log: ExecutionLog) => {
    setRecentLogs(prev => {
      const newLogs = [log, ...prev].slice(0, 50); // Keep last 50 logs
      return newLogs;
    });
  }, []);

  // Handle metrics updates
  const handleMetricsUpdate = useCallback((metrics: ExecutionMetrics) => {
    setCurrentMetrics(metrics);
  }, []);

  // Initialize WebSocket connection
  const { isConnected: wsConnected, connectionError } = useExecutionWebSocket({
    executionId,
    onNodeUpdate: handleNodeUpdate,
    onEdgeFlow: handleEdgeFlow,
    onExecutionComplete: handleExecutionComplete,
    onExecutionFailed: handleExecutionFailed,
    onExecutionLog: handleExecutionLog,
    onMetricsUpdate: handleMetricsUpdate,
  });

  // Get status color and icon
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'running':
        return {
          color: 'text-blue-500',
          bgColor: 'bg-blue-500/10',
          icon: <Activity className="w-4 h-4 animate-spin" />,
          label: 'Running'
        };
      case 'completed':
        return {
          color: 'text-green-500',
          bgColor: 'bg-green-500/10',
          icon: <CheckCircle2 className="w-4 h-4" />,
          label: 'Completed'
        };
      case 'failed':
        return {
          color: 'text-red-500',
          bgColor: 'bg-red-500/10',
          icon: <XCircle className="w-4 h-4" />,
          label: 'Failed'
        };
      default:
        return {
          color: 'text-gray-500',
          bgColor: 'bg-gray-500/10',
          icon: <Clock className="w-4 h-4" />,
          label: 'Idle'
        };
    }
  };

  const statusDisplay = getStatusDisplay(executionState.status);

  if (isMinimized) {
    return (
      <div className={cn("fixed bottom-4 right-4 z-50", className)}>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsMinimized(false)}
          className="flex items-center gap-2 shadow-lg">
          <div className={cn("w-2 h-2 rounded-full", statusDisplay.bgColor)} />
          <span className="text-sm">{statusDisplay.label}</span>
          <Eye className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <Card className={cn("fixed bottom-4 right-4 w-80 z-50 shadow-lg", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <div className="flex items-center gap-2">
              {statusDisplay.icon}
              <span>Execution Monitor</span>
            </div>
            <div className="flex items-center gap-1">
              {wsConnected ? (
                <Wifi className="w-3 h-3 text-green-500" />
              ) : (
                <WifiOff className="w-3 h-3 text-red-500" />
              )}
            </div>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(true)}
            className="h-6 w-6 p-0">
            <EyeOff className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={cn(statusDisplay.color, statusDisplay.bgColor)}>
            {statusDisplay.label}
          </Badge>
          {executionState.currentNode && (
            <Badge variant="outline" className="text-xs">
              Node: {executionState.currentNode.slice(0, 8)}...
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* Progress Bar */}
        {executionState.status === 'running' && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span>{Math.round(executionState.progress)}%</span>
            </div>
            <Progress value={executionState.progress} className="h-2" />
          </div>
        )}

        {/* Execution Stats */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className="font-medium text-green-600">{executionState.completedNodes}</div>
            <div className="text-muted-foreground">Completed</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-red-600">{executionState.failedNodes}</div>
            <div className="text-muted-foreground">Failed</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-blue-600">{executionState.totalNodes}</div>
            <div className="text-muted-foreground">Total</div>
          </div>
        </div>

        {/* Recent Logs */}
        {recentLogs.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Recent Logs</div>
            <div className="max-h-24 overflow-y-auto space-y-1">
              {recentLogs.slice(0, 3).map((log, index) => (
                <div
                  key={`${log.id}-${index}`}
                  className={cn(
                    "text-xs p-1.5 rounded text-left",
                    log.level === 'error'
                      ? "bg-red-50 text-red-700 border-l-2 border-red-500"
                      : log.level === 'warn'
                        ? "bg-yellow-50 text-yellow-700 border-l-2 border-yellow-500"
                        : "bg-gray-50 text-gray-700 border-l-2 border-gray-400"
                  )}>
                  <div className="font-mono truncate">{log.message}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Performance Metrics */}
        {currentMetrics && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Performance</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div className="font-medium">{(currentMetrics.memoryUsage / 1024 / 1024).toFixed(1)}MB</div>
                <div className="text-muted-foreground">Memory</div>
              </div>
              <div>
                <div className="font-medium">{currentMetrics.cpuUsage.toFixed(1)}%</div>
                <div className="text-muted-foreground">CPU</div>
              </div>
            </div>
          </div>
        )}

        {/* Connection Status */}
        {connectionError && (
          <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
            Connection error: {connectionError}
          </div>
        )}
      </CardContent>
    </Card>
  );
}