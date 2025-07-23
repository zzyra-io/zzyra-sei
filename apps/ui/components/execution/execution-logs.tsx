"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  RefreshCw,
  Search,
  Info,
  XCircle,
  Filter,
} from "lucide-react";
import { executionsApi } from "@/lib/services/api";
import { useToast } from "@/hooks/use-toast";

interface ExecutionLogsProps {
  executionId: string;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  node_id?: string;
  data?: Record<string, any>;
}

export function ExecutionLogs({ executionId }: ExecutionLogsProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState<
    "all" | "info" | "warn" | "error" | "debug"
  >("all");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch execution details which includes logs
      const execution = await executionsApi.getCompleteExecution(executionId);

      // Extract logs from execution
      const executionLogs = execution.executionLogs || [];
      const nodeExecutions = execution.nodeExecutions || [];

      // Transform execution logs
      const allLogs: LogEntry[] = [
        ...executionLogs.map((log: any) => ({
          id: log.id,
          timestamp: log.timestamp,
          level: log.level as "info" | "warn" | "error" | "debug",
          message: log.message,
          node_id: log.metadata?.nodeId || "system",
          data: log.metadata,
        })),
        // Add node logs
        ...nodeExecutions.flatMap((nodeExec: any) => {
          const nodeLogs = (nodeExec.logs || []).map((log: any) => ({
            id: `${nodeExec.node_id}-${log.id}`,
            timestamp: log.timestamp,
            level: log.level as "info" | "warn" | "error" | "debug",
            message: log.message,
            node_id: nodeExec.node_id,
            data: log.data,
          }));

          // Add node error as a log entry if there's an error
          if (nodeExec.error) {
            nodeLogs.push({
              id: `${nodeExec.node_id}-error`,
              timestamp: nodeExec.completed_at || nodeExec.started_at,
              level: "error" as "info" | "warn" | "error" | "debug",
              message: `Node execution failed: ${nodeExec.error}`,
              node_id: nodeExec.node_id,
              data: { error: nodeExec.error, status: nodeExec.status },
            });
          }

          return nodeLogs;
        }),
      ];

      // Sort by timestamp
      allLogs.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );

      setLogs(allLogs);

      // Auto-filter to errors if there are any
      const hasErrors = allLogs.some((log) => log.level === "error");
      if (hasErrors && levelFilter === "all") {
        setLevelFilter("error");
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch logs");
      toast({
        title: "Error",
        description: "Failed to load execution logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (executionId) {
      fetchLogs();
    }
  }, [executionId]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesSearch = log.message
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesLevel = levelFilter === "all" || log.level === levelFilter;
      return matchesSearch && matchesLevel;
    });
  }, [logs, searchTerm, levelFilter]);

  const errorLogs = useMemo(() => {
    return logs.filter((log) => log.level === "error");
  }, [logs]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchLogs();
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case "error":
        return <XCircle className='h-4 w-4 text-red-500' />;
      case "warn":
        return <AlertCircle className='h-4 w-4 text-yellow-500' />;
      case "info":
        return <Info className='h-4 w-4 text-blue-500' />;
      case "debug":
        return <CheckCircle className='h-4 w-4 text-gray-500' />;
      default:
        return <Clock className='h-4 w-4 text-gray-500' />;
    }
  };

  const getLevelBadge = (level: string) => {
    const baseClasses = "text-xs px-2 py-1";
    switch (level) {
      case "error":
        return (
          <Badge variant='destructive' className={baseClasses}>
            ERROR
          </Badge>
        );
      case "warn":
        return (
          <Badge className={`bg-yellow-100 text-yellow-800 ${baseClasses}`}>
            WARN
          </Badge>
        );
      case "info":
        return (
          <Badge className={`bg-blue-100 text-blue-800 ${baseClasses}`}>
            INFO
          </Badge>
        );
      case "debug":
        return (
          <Badge className={`bg-gray-100 text-gray-800 ${baseClasses}`}>
            DEBUG
          </Badge>
        );
      default:
        return (
          <Badge variant='outline' className={baseClasses}>
            {level.toUpperCase()}
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Loader2 className='h-5 w-5 animate-spin' />
            Loading Execution Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex items-center justify-center py-8'>
            <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <AlertCircle className='h-5 w-5 text-red-500' />
            Error Loading Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='text-center py-8'>
            <AlertCircle className='h-12 w-12 text-red-500 mx-auto mb-4' />
            <p className='text-muted-foreground'>{error}</p>
            <Button onClick={handleRefresh} className='mt-4'>
              <RefreshCw className='h-4 w-4 mr-2' />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <CardTitle className='flex items-center gap-2'>
            <Info className='h-5 w-5' />
            Execution Logs
            <Badge variant='outline'>{logs.length} total</Badge>
          </CardTitle>
          <Button
            variant='outline'
            size='sm'
            onClick={handleRefresh}
            disabled={isRefreshing}>
            <RefreshCw
              className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className='flex items-center gap-4 mb-4'>
          <div className='flex items-center gap-2'>
            <Search className='h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='Search logs...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='w-64'
            />
          </div>
          <div className='flex items-center gap-2'>
            <Filter className='h-4 w-4 text-muted-foreground' />
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value as any)}
              className='border rounded px-3 py-1 text-sm'
              aria-label='Filter logs by level'>
              <option value='all'>All Levels</option>
              <option value='error'>Errors</option>
              <option value='warn'>Warnings</option>
              <option value='info'>Info</option>
              <option value='debug'>Debug</option>
            </select>
          </div>
        </div>

        {/* Error Summary */}
        {errorLogs.length > 0 && (
          <div className='mb-4 p-3 bg-red-50 border border-red-200 rounded-lg'>
            <div className='flex items-center gap-2 mb-2'>
              <XCircle className='h-4 w-4 text-red-600' />
              <span className='font-semibold text-red-800'>
                {errorLogs.length} Error{errorLogs.length > 1 ? "s" : ""} Found
              </span>
            </div>
            <div className='space-y-1'>
              {errorLogs.slice(0, 3).map((log) => (
                <div key={log.id} className='text-sm text-red-700'>
                  <span className='font-medium'>
                    {log.node_id || "System"}:
                  </span>{" "}
                  {log.message}
                </div>
              ))}
              {errorLogs.length > 3 && (
                <div className='text-xs text-red-600'>
                  +{errorLogs.length - 3} more errors...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Logs */}
        <ScrollArea className='h-[400px]'>
          {filteredLogs.length === 0 ? (
            <div className='text-center py-8 text-muted-foreground'>
              <Info className='h-12 w-12 mx-auto mb-4 opacity-50' />
              <p>No logs found</p>
              {searchTerm && (
                <p className='text-sm'>Try adjusting your search or filters</p>
              )}
            </div>
          ) : (
            <div className='space-y-2'>
              {filteredLogs.map((log) => (
                <div
                  key={log.id}
                  className={`p-3 rounded-lg border ${
                    log.level === "error"
                      ? "border-red-200 bg-red-50"
                      : log.level === "warn"
                        ? "border-yellow-200 bg-yellow-50"
                        : log.level === "info"
                          ? "border-blue-200 bg-blue-50"
                          : "border-gray-200 bg-gray-50"
                  }`}>
                  <div className='flex items-start justify-between'>
                    <div className='flex items-start gap-3 flex-1'>
                      {getLevelIcon(log.level)}
                      <div className='flex-1 min-w-0'>
                        <div className='flex items-center gap-2 mb-1'>
                          {getLevelBadge(log.level)}
                          {log.node_id && (
                            <Badge
                              variant={
                                log.level === "error"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className='text-xs'>
                              {log.node_id}
                            </Badge>
                          )}
                          <span className='text-xs text-muted-foreground font-mono'>
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p
                          className={`text-sm ${log.level === "error" ? "font-semibold text-red-700" : ""}`}>
                          {log.message}
                        </p>
                        {log.data && Object.keys(log.data).length > 0 && (
                          <details
                            className='mt-2'
                            open={log.level === "error"}>
                            <summary className='cursor-pointer text-xs text-muted-foreground'>
                              {log.level === "error"
                                ? "Error Details"
                                : "View Data"}
                            </summary>
                            <pre className='mt-1 text-xs bg-black/5 p-2 rounded overflow-x-auto'>
                              {JSON.stringify(log.data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
