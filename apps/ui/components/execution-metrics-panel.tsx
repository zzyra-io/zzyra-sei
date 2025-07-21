"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ExecutionMetrics } from "@/hooks/use-execution-websocket";
import { Activity, Clock, Database, Network, Zap } from "lucide-react";
import { useMemo } from "react";

interface ExecutionMetricsPanelProps {
  metrics: ExecutionMetrics | null;
  isConnected: boolean;
}

export function ExecutionMetricsPanel({ metrics, isConnected }: ExecutionMetricsPanelProps) {
  const formattedMetrics = useMemo(() => {
    if (!metrics) return null;

    return {
      totalDuration: formatDuration(metrics.totalDuration),
      memoryUsage: formatBytes(metrics.memoryUsage * 1024 * 1024), // Convert MB to bytes
      cpuUsage: `${metrics.cpuUsage.toFixed(1)}%`,
      networkRequests: metrics.networkRequests.toString(),
      nodeCount: Object.keys(metrics.nodeMetrics).length,
      avgNodeDuration: calculateAverageNodeDuration(metrics.nodeMetrics),
      slowestNode: findSlowestNode(metrics.nodeMetrics),
      fastestNode: findFastestNode(metrics.nodeMetrics),
      totalDataProcessed: calculateTotalDataProcessed(metrics.nodeMetrics),
    };
  }, [metrics]);

  if (!metrics || !formattedMetrics) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Execution Metrics
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </CardTitle>
          <CardDescription>
            Real-time execution performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            {isConnected ? "No execution data available" : "Connect to view metrics"}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Execution Metrics
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected ? "Live" : "Stale"}
          </Badge>
        </CardTitle>
        <CardDescription>
          Real-time execution performance metrics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Performance */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-500" />
              <span className="text-sm font-medium">Duration</span>
            </div>
            <div className="text-2xl font-bold">{formattedMetrics.totalDuration}</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium">Memory</span>
            </div>
            <div className="text-2xl font-bold">{formattedMetrics.memoryUsage}</div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">CPU</span>
            </div>
            <div className="text-2xl font-bold">{formattedMetrics.cpuUsage}</div>
            <Progress value={metrics.cpuUsage} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-medium">Requests</span>
            </div>
            <div className="text-2xl font-bold">{formattedMetrics.networkRequests}</div>
          </div>
        </div>

        <Separator />

        {/* Node Performance */}
        <div className="space-y-4">
          <h4 className="font-semibold">Node Performance</h4>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <span className="text-sm font-medium">Total Nodes</span>
              <div className="text-xl font-bold">{formattedMetrics.nodeCount}</div>
            </div>
            
            <div className="space-y-2">
              <span className="text-sm font-medium">Average Duration</span>
              <div className="text-xl font-bold">{formattedMetrics.avgNodeDuration}</div>
            </div>
            
            <div className="space-y-2">
              <span className="text-sm font-medium">Data Processed</span>
              <div className="text-xl font-bold">{formattedMetrics.totalDataProcessed}</div>
            </div>
          </div>

          {/* Performance Extremes */}
          {formattedMetrics.slowestNode && (
            <div className="space-y-2">
              <span className="text-sm font-medium">Slowest Node</span>
              <div className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-950 rounded">
                <span className="text-sm font-mono">{formattedMetrics.slowestNode.nodeId}</span>
                <Badge variant="destructive">
                  {formatDuration(formattedMetrics.slowestNode.duration)}
                </Badge>
              </div>
            </div>
          )}

          {formattedMetrics.fastestNode && (
            <div className="space-y-2">
              <span className="text-sm font-medium">Fastest Node</span>
              <div className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-950 rounded">
                <span className="text-sm font-mono">{formattedMetrics.fastestNode.nodeId}</span>
                <Badge variant="default">
                  {formatDuration(formattedMetrics.fastestNode.duration)}
                </Badge>
              </div>
            </div>
          )}
        </div>

        {/* Detailed Node Metrics */}
        <div className="space-y-4">
          <h4 className="font-semibold">Individual Node Metrics</h4>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {Object.entries(metrics.nodeMetrics)
              .sort(([, a], [, b]) => b.duration - a.duration)
              .map(([nodeId, metric]) => (
                <div key={nodeId} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                  <span className="text-sm font-mono truncate flex-1 mr-4">
                    {nodeId}
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline">
                      {formatDuration(metric.duration)}
                    </Badge>
                    <Badge variant="outline">
                      {formatBytes(metric.outputSize)}
                    </Badge>
                  </div>
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Utility functions for formatting
function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  } else {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function calculateAverageNodeDuration(nodeMetrics: Record<string, { duration: number; memoryDelta: number; outputSize: number }>): string {
  const durations = Object.values(nodeMetrics).map(m => m.duration);
  if (durations.length === 0) return '0ms';
  const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
  return formatDuration(avg);
}

function findSlowestNode(nodeMetrics: Record<string, { duration: number; memoryDelta: number; outputSize: number }>): { nodeId: string; duration: number } | null {
  const entries = Object.entries(nodeMetrics);
  if (entries.length === 0) return null;
  
  const slowest = entries.reduce((prev, [nodeId, metric]) => 
    metric.duration > prev.duration ? { nodeId, duration: metric.duration } : prev,
    { nodeId: entries[0][0], duration: entries[0][1].duration }
  );
  
  return slowest;
}

function findFastestNode(nodeMetrics: Record<string, { duration: number; memoryDelta: number; outputSize: number }>): { nodeId: string; duration: number } | null {
  const entries = Object.entries(nodeMetrics);
  if (entries.length === 0) return null;
  
  const fastest = entries.reduce((prev, [nodeId, metric]) => 
    metric.duration < prev.duration ? { nodeId, duration: metric.duration } : prev,
    { nodeId: entries[0][0], duration: entries[0][1].duration }
  );
  
  return fastest;
}

function calculateTotalDataProcessed(nodeMetrics: Record<string, { duration: number; memoryDelta: number; outputSize: number }>): string {
  const totalBytes = Object.values(nodeMetrics).reduce((total, metric) => total + metric.outputSize, 0);
  return formatBytes(totalBytes);
}