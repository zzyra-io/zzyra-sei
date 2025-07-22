"use client";

import React, { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Play,
  Pause,
  Square,
  RefreshCw,
  Clock,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Database,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { io, Socket } from "socket.io-client";

interface ExecutionStatus {
  executionId: string;
  workflowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  currentNodeId?: string;
  progress: {
    totalNodes: number;
    completedNodes: number;
    failedNodes: number;
    currentNode?: {
      id: string;
      type: string;
      label: string;
      status: 'running' | 'completed' | 'failed';
      startTime?: Date;
      endTime?: Date;
      duration?: number;
    };
  };
  startTime: Date;
  endTime?: Date;
  error?: string;
  results?: Record<string, any>;
  logs: ExecutionLog[];
}

interface ExecutionLog {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  nodeId?: string;
  metadata?: Record<string, any>;
}

interface NodeExecutionUpdate {
  executionId: string;
  nodeId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  output?: any;
  error?: string;
  duration?: number;
  progress?: number;
  nodeType?: string;
  nodeLabel?: string;
  startTime?: Date;
  endTime?: Date;
}

interface ExecutionMetrics {
  executionId: string;
  memoryUsage: number;
  cpuUsage: number;
  networkRequests: number;
  totalDuration: number;
  nodeMetrics: Record<string, {
    duration: number;
    memoryDelta: number;
    outputSize: number;
  }>;
}

interface RealtimeExecutionMonitorProps {
  executionId?: string;
  workflowId?: string;
  autoStart?: boolean;
  showLogs?: boolean;
  showMetrics?: boolean;
  onExecutionComplete?: (result: any) => void;
  onExecutionFailed?: (error: string) => void;
}

export function RealtimeExecutionMonitor({
  executionId,
  workflowId,
  autoStart = false,
  showLogs = true,
  showMetrics = true,
  onExecutionComplete,
  onExecutionFailed
}: RealtimeExecutionMonitorProps) {
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus | null>(null);
  const [nodeUpdates, setNodeUpdates] = useState<Map<string, NodeExecutionUpdate>>(new Map());
  const [metrics, setMetrics] = useState<ExecutionMetrics | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedLogLevel, setSelectedLogLevel] = useState<'all' | 'info' | 'warn' | 'error'>('all');
  
  const socketRef = useRef<Socket | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    if (!executionId) return;

    const socket = io(`${process.env.NEXT_PUBLIC_WORKER_URL || 'ws://localhost:3005'}/execution`, {
      transports: ['websocket'],
      forceNew: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to execution monitor');
      
      // Subscribe to execution updates
      socket.emit('subscribe_execution', { executionId });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from execution monitor');
    });

    socket.on('execution_status', (status: ExecutionStatus) => {
      setExecutionStatus(status);
    });

    socket.on('execution_started', (status: ExecutionStatus) => {
      setExecutionStatus(status);
    });

    socket.on('execution_completed', (result: any) => {
      setExecutionStatus(prev => prev ? {
        ...prev,
        status: 'completed',
        endTime: new Date(),
        results: result.results
      } : null);
      
      onExecutionComplete?.(result);
    });

    socket.on('execution_failed', (data: { executionId: string; error: string }) => {
      setExecutionStatus(prev => prev ? {
        ...prev,
        status: 'failed',
        endTime: new Date(),
        error: data.error
      } : null);
      
      onExecutionFailed?.(data.error);
    });

    socket.on('node_execution_update', (update: NodeExecutionUpdate) => {
      setNodeUpdates(prev => new Map(prev).set(update.nodeId, update));
      
      // Update current node in execution status
      if (update.status === 'running') {
        setExecutionStatus(prev => prev ? {
          ...prev,
          currentNodeId: update.nodeId,
          progress: {
            ...prev.progress,
            currentNode: {
              id: update.nodeId,
              type: update.nodeType || 'unknown',
              label: update.nodeLabel || update.nodeId,
              status: update.status,
              startTime: update.startTime,
              endTime: update.endTime,
              duration: update.duration,
            }
          }
        } : null);
      }
    });

    socket.on('execution_log', (log: ExecutionLog) => {
      setExecutionStatus(prev => prev ? {
        ...prev,
        logs: [...prev.logs, log].slice(-100) // Keep last 100 logs
      } : null);
    });

    socket.on('execution_metrics', (newMetrics: ExecutionMetrics) => {
      setMetrics(newMetrics);
    });

    socket.on('error', (error: any) => {
      console.error('WebSocket error:', error);
    });

    return () => {
      socket.disconnect();
    };
  }, [executionId, onExecutionComplete, onExecutionFailed]);

  // Auto-scroll logs to bottom
  useEffect(() => {
    if (logsEndRef.current && executionStatus?.logs) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [executionStatus?.logs]);

  // Calculate progress percentage
  const getProgressPercentage = () => {
    if (!executionStatus) return 0;
    const { totalNodes, completedNodes } = executionStatus.progress;
    return totalNodes > 0 ? (completedNodes / totalNodes) * 100 : 0;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'completed': return 'bg-green-100 text-green-800 border-green-300';
      case 'failed': return 'bg-red-100 text-red-800 border-red-300';
      case 'paused': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Activity className="w-4 h-4 animate-pulse" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'failed': return <XCircle className="w-4 h-4" />;
      case 'paused': return <Pause className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  // Filter logs by level
  const filteredLogs = executionStatus?.logs.filter(log => 
    selectedLogLevel === 'all' || log.level === selectedLogLevel
  ) || [];

  if (!executionId) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 text-center">
          <Activity className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-500">No execution to monitor</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                {getStatusIcon(executionStatus?.status || 'pending')}
                <CardTitle className="text-lg">Execution Monitor</CardTitle>
                {executionStatus && (
                  <Badge className={getStatusColor(executionStatus.status)}>
                    {executionStatus.status}
                  </Badge>
                )}
              </div>
              
              {/* Connection Status */}
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            </div>
            
            <div className="flex items-center space-x-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                  >
                    {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isExpanded ? 'Collapse' : 'Expand'}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Progress Bar */}
          {executionStatus && (
            <div className="space-y-2">
              <Progress value={getProgressPercentage()} className="w-full" />
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  {executionStatus.progress.completedNodes} / {executionStatus.progress.totalNodes} nodes completed
                </span>
                <span>
                  {executionStatus.progress.failedNodes > 0 && (
                    <span className="text-red-600">
                      {executionStatus.progress.failedNodes} failed
                    </span>
                  )}
                </span>
              </div>
            </div>
          )}
        </CardHeader>

        {isExpanded && (
          <CardContent className="space-y-4">
            {/* Current Node Status */}
            {executionStatus?.progress.currentNode && (
              <Alert>
                <Activity className="h-4 w-4" />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <span>
                      Executing: <strong>{executionStatus.progress.currentNode.label}</strong>
                    </span>
                    {executionStatus.progress.currentNode.duration && (
                      <Badge variant="outline">
                        {executionStatus.progress.currentNode.duration}ms
                      </Badge>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Error Display */}
            {executionStatus?.error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Execution Failed:</strong> {executionStatus.error}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Execution Logs */}
              {showLogs && (
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Execution Logs</CardTitle>
                      <div className="flex items-center space-x-2">
                        <select
                          value={selectedLogLevel}
                          onChange={(e) => setSelectedLogLevel(e.target.value as any)}
                          className="text-xs border rounded px-2 py-1"
                        >
                          <option value="all">All</option>
                          <option value="info">Info</option>
                          <option value="warn">Warnings</option>
                          <option value="error">Errors</option>
                        </select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-48 w-full">
                      <div className="space-y-1 text-xs font-mono">
                        {filteredLogs.length === 0 ? (
                          <p className="text-gray-500 text-center py-4">No logs available</p>
                        ) : (
                          filteredLogs.map((log) => (
                            <div key={log.id} className={`p-2 rounded ${
                              log.level === 'error' ? 'bg-red-50 text-red-800' :
                              log.level === 'warn' ? 'bg-yellow-50 text-yellow-800' :
                              'bg-gray-50 text-gray-800'
                            }`}>
                              <div className="flex items-start space-x-2">
                                <span className="text-gray-500 shrink-0">
                                  {new Date(log.timestamp).toLocaleTimeString()}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {log.level}
                                </Badge>
                                {log.nodeId && (
                                  <Badge variant="secondary" className="text-xs">
                                    {log.nodeId}
                                  </Badge>
                                )}
                              </div>
                              <div className="mt-1">{log.message}</div>
                            </div>
                          ))
                        )}
                        <div ref={logsEndRef} />
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {/* Execution Metrics */}
              {showMetrics && metrics && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Database className="w-4 h-4 text-blue-500" />
                        <span>Memory: {Math.round(metrics.memoryUsage)}MB</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Zap className="w-4 h-4 text-green-500" />
                        <span>CPU: {Math.round(metrics.cpuUsage)}%</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RefreshCw className="w-4 h-4 text-purple-500" />
                        <span>Requests: {metrics.networkRequests}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-orange-500" />
                        <span>Duration: {Math.round(metrics.totalDuration)}ms</span>
                      </div>
                    </div>

                    {/* Node Performance */}
                    {Object.keys(metrics.nodeMetrics).length > 0 && (
                      <div>
                        <h4 className="text-sm font-medium mb-2">Node Performance</h4>
                        <ScrollArea className="h-32">
                          <div className="space-y-1 text-xs">
                            {Object.entries(metrics.nodeMetrics).map(([nodeId, nodeMetric]) => (
                              <div key={nodeId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                <span className="truncate">{nodeId}</span>
                                <div className="flex space-x-2 text-gray-600">
                                  <span>{nodeMetric.duration}ms</span>
                                  <span>{Math.round(nodeMetric.outputSize / 1024)}KB</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Node Status Grid */}
            {nodeUpdates.size > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Node Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {Array.from(nodeUpdates.entries()).map(([nodeId, update]) => (
                      <Tooltip key={nodeId}>
                        <TooltipTrigger asChild>
                          <div className={`p-2 rounded-md text-xs border-2 transition-all ${
                            update.status === 'running' ? 'border-blue-300 bg-blue-50' :
                            update.status === 'completed' ? 'border-green-300 bg-green-50' :
                            update.status === 'failed' ? 'border-red-300 bg-red-50' :
                            'border-gray-300 bg-gray-50'
                          }`}>
                            <div className="flex items-center justify-between">
                              <span className="font-medium truncate">
                                {update.nodeLabel || nodeId}
                              </span>
                              {getStatusIcon(update.status)}
                            </div>
                            {update.duration && (
                              <div className="text-gray-600 mt-1">
                                {update.duration}ms
                              </div>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <div className="text-xs">
                            <div><strong>Node:</strong> {nodeId}</div>
                            <div><strong>Status:</strong> {update.status}</div>
                            {update.nodeType && <div><strong>Type:</strong> {update.nodeType}</div>}
                            {update.duration && <div><strong>Duration:</strong> {update.duration}ms</div>}
                            {update.error && <div className="text-red-500"><strong>Error:</strong> {update.error}</div>}
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        )}
      </Card>
    </TooltipProvider>
  );
}