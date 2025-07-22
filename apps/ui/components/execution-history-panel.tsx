"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ExecutionLog } from "@/hooks/use-execution-websocket";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  Info,
  Loader2,
  XCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Filter,
} from "lucide-react";
import { useState, useMemo, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface ExecutionHistoryPanelProps {
  logs: ExecutionLog[];
  isConnected: boolean;
  executionId?: string;
  onRefresh?: () => void;
  isExecuting?: boolean;
  onCreateMockLogs?: () => void;
}

type LogLevel = "info" | "warn" | "error" | "debug";

const logLevelConfig: Record<
  LogLevel,
  {
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    bgColor: string;
    borderColor: string;
  }
> = {
  info: {
    icon: Info,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
  },
  warn: {
    icon: AlertCircle,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
  },
  error: {
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
  },
  debug: {
    icon: CheckCircle2,
    color: "text-gray-600",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
  },
};

export function ExecutionHistoryPanel({
  logs,
  isConnected,
  executionId,
  onRefresh,
  isExecuting = false,
  onCreateMockLogs,
}: ExecutionHistoryPanelProps) {
  const [selectedLevels, setSelectedLevels] = useState<Set<LogLevel>>(
    new Set(["info", "warn", "error"] as LogLevel[])
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showMetadata, setShowMetadata] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const { toast } = useToast();

  // Auto-refresh logs when execution is running
  useEffect(() => {
    if (!isExecuting || !executionId) return;

    const interval = setInterval(() => {
      if (onRefresh) {
        onRefresh();
        setLastRefresh(new Date());
      }
    }, 3000); // Refresh every 3 seconds during execution

    return () => clearInterval(interval);
  }, [isExecuting, executionId, onRefresh]);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Filter by log level
      if (!selectedLevels.has(log.level)) return false;

      // Filter by node ID if selected
      if (selectedNodeId && log.nodeId !== selectedNodeId) return false;

      // Filter by search term
      if (
        searchTerm &&
        !log.message.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }

      return true;
    });
  }, [logs, selectedLevels, selectedNodeId, searchTerm]);

  const uniqueNodeIds = useMemo(() => {
    const nodeIds = new Set(logs.map((log) => log.nodeId).filter(Boolean));
    return Array.from(nodeIds);
  }, [logs]);

  const logCounts = useMemo(() => {
    return logs.reduce(
      (counts, log) => {
        counts[log.level] = (counts[log.level] || 0) + 1;
        return counts;
      },
      {} as Record<LogLevel, number>
    );
  }, [logs]);

  const toggleLogLevel = (level: LogLevel) => {
    const newLevels = new Set(selectedLevels);
    if (newLevels.has(level)) {
      newLevels.delete(level);
    } else {
      newLevels.add(level);
    }
    setSelectedLevels(newLevels);
  };

  const handleRefresh = useCallback(async () => {
    if (!executionId) return;

    setIsLoadingLogs(true);
    try {
      if (onRefresh) {
        onRefresh();
        setLastRefresh(new Date());
        toast({
          title: "Logs refreshed",
          description: "Execution logs have been updated.",
        });
      }
    } catch (error) {
      console.error("Failed to refresh logs:", error);
      toast({
        title: "Refresh failed",
        description: "Failed to refresh execution logs.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingLogs(false);
    }
  }, [executionId, onRefresh, toast]);

  const exportLogs = () => {
    const logsText = filteredLogs
      .map((log) => {
        const timestamp = new Date(log.timestamp).toLocaleString();
        const metadata = log.metadata
          ? `\nMetadata: ${JSON.stringify(log.metadata, null, 2)}`
          : "";
        return `[${timestamp}] [${log.level.toUpperCase()}] ${log.nodeId ? `[${log.nodeId}] ` : ""}${log.message}${metadata}`;
      })
      .join("\n\n");

    const blob = new Blob([logsText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `execution-logs-${executionId || Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Logs exported",
      description: `Exported ${filteredLogs.length} logs to file.`,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Log message copied to clipboard.",
    });
  };

  const clearFilters = () => {
    setSelectedLevels(
      new Set(["info", "warn", "error", "debug"] as LogLevel[])
    );
    setSelectedNodeId(null);
    setSearchTerm("");
  };

  return (
    <Card className='w-full h-full flex flex-col'>
      <CardHeader className='pb-3 space-y-4'>
        <div className='flex items-center justify-between'>
          <div className='space-y-1'>
            <CardTitle className='flex items-center gap-2 text-lg'>
              <Clock className='w-5 h-5' />
              Execution History
              <Badge
                variant={isConnected ? "default" : "destructive"}
                className='text-xs'>
                {isConnected ? "Live" : "Stale"}
              </Badge>
              {isExecuting && (
                <Badge variant='secondary' className='animate-pulse text-xs'>
                  <Loader2 className='w-3 h-3 mr-1 animate-spin' />
                  Running
                </Badge>
              )}
            </CardTitle>
            <CardDescription className='text-sm'>
              Real-time execution logs and timeline ({filteredLogs.length} of{" "}
              {logs.length} logs)
              {lastRefresh && (
                <span className='text-xs text-muted-foreground ml-2'>
                  Last updated: {lastRefresh.toLocaleTimeString()}
                </span>
              )}
            </CardDescription>
          </div>

          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={handleRefresh}
              disabled={isLoadingLogs || !executionId}
              className='h-8 px-3'>
              {isLoadingLogs ? (
                <Loader2 className='w-4 h-4 animate-spin' />
              ) : (
                <RefreshCw className='w-4 h-4' />
              )}
              Refresh
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setShowMetadata(!showMetadata)}
              className='h-8 px-3'>
              {showMetadata ? (
                <EyeOff className='w-4 h-4' />
              ) : (
                <Eye className='w-4 h-4' />
              )}
              Metadata
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={exportLogs}
              disabled={filteredLogs.length === 0}
              className='h-8 px-3'>
              <Download className='w-4 h-4' />
              Export
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className='space-y-4'>
          {/* Search */}
          <div>
            <input
              type='text'
              placeholder='Search logs...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-background'
            />
          </div>

          {/* Log Level Filters */}
          <div className='flex flex-wrap items-center gap-2'>
            <span className='text-sm font-medium text-muted-foreground'>
              Levels:
            </span>
            {Object.entries(logLevelConfig).map(([level, config]) => {
              const count = logCounts[level as LogLevel] || 0;
              return (
                <Button
                  key={level}
                  variant={
                    selectedLevels.has(level as LogLevel)
                      ? "default"
                      : "outline"
                  }
                  size='sm'
                  onClick={() => toggleLogLevel(level as LogLevel)}
                  className='gap-1 h-7 text-xs'>
                  <config.icon className='w-3 h-3' />
                  {level}
                  {count > 0 && (
                    <Badge variant='secondary' className='ml-1 text-xs'>
                      {count}
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>

          {/* Node Filters */}
          {uniqueNodeIds.length > 0 && (
            <div className='flex flex-wrap items-center gap-2'>
              <span className='text-sm font-medium text-muted-foreground'>
                Nodes:
              </span>
              <Button
                variant={!selectedNodeId ? "default" : "outline"}
                size='sm'
                onClick={() => setSelectedNodeId(null)}
                className='h-7 text-xs'>
                All
              </Button>
              {uniqueNodeIds.slice(0, 5).map((nodeId) => (
                <Button
                  key={nodeId}
                  variant={selectedNodeId === nodeId ? "default" : "outline"}
                  size='sm'
                  onClick={() => setSelectedNodeId(nodeId || null)}
                  className='font-mono text-xs h-7'>
                  {nodeId}
                </Button>
              ))}
              {uniqueNodeIds.length > 5 && (
                <span className='text-xs text-muted-foreground'>
                  +{uniqueNodeIds.length - 5} more
                </span>
              )}
            </div>
          )}

          {/* Clear Filters */}
          {(selectedLevels.size < 4 || selectedNodeId || searchTerm) && (
            <div className='flex items-center gap-2'>
              <Button
                variant='ghost'
                size='sm'
                onClick={clearFilters}
                className='text-xs h-6'>
                Clear filters
              </Button>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className='flex-1 p-0'>
        <ScrollArea className='h-full px-6 pb-6'>
          {filteredLogs.length === 0 ? (
            <div className='flex flex-col items-center justify-center h-32 text-center'>
              <div className='text-muted-foreground space-y-2'>
                {logs.length === 0 ? (
                  <div className='flex flex-col items-center gap-2'>
                    <Clock className='w-8 h-8 opacity-50' />
                    <p className='text-sm'>No logs available yet</p>
                    {isExecuting && (
                      <p className='text-xs text-muted-foreground'>
                        Logs will appear as the execution progresses
                      </p>
                    )}
                    {!isExecuting && onCreateMockLogs && (
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={onCreateMockLogs}
                        className='mt-2'>
                        Create Test Logs
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className='flex flex-col items-center gap-2'>
                    <Filter className='w-8 h-8 opacity-50' />
                    <p className='text-sm'>No logs match your filters</p>
                  </div>
                )}
              </div>
              {logs.length > 0 && filteredLogs.length === 0 && (
                <Button
                  variant='link'
                  size='sm'
                  onClick={clearFilters}
                  className='mt-2'>
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className='space-y-3'>
              {filteredLogs.map((log, index) => {
                const config = logLevelConfig[log.level];
                const Icon = config.icon;
                const timestamp = new Date(log.timestamp).toLocaleString();

                return (
                  <div
                    key={log.id}
                    className={cn(
                      "relative p-4 rounded-lg border transition-all hover:shadow-sm",
                      config.bgColor,
                      config.borderColor
                    )}>
                    {/* Timeline connector */}
                    {index < filteredLogs.length - 1 && (
                      <div className='absolute left-6 top-12 w-px h-6 bg-border' />
                    )}

                    <div className='flex items-start gap-3'>
                      <div className={cn("flex-shrink-0 mt-0.5", config.color)}>
                        <Icon className='w-4 h-4' />
                      </div>

                      <div className='flex-1 min-w-0 space-y-2'>
                        <div className='flex items-center gap-2 text-xs text-muted-foreground'>
                          <span className='font-mono'>{timestamp}</span>
                          {log.nodeId && (
                            <>
                              <Separator
                                orientation='vertical'
                                className='h-3'
                              />
                              <Badge
                                variant='outline'
                                className='font-mono text-xs'>
                                {log.nodeId}
                              </Badge>
                            </>
                          )}
                        </div>

                        <div className='text-sm font-medium leading-relaxed'>
                          {log.message}
                        </div>

                        {showMetadata && log.metadata && (
                          <div className='mt-3'>
                            <div className='text-xs font-medium text-muted-foreground mb-2'>
                              Metadata:
                            </div>
                            <div className='bg-background p-3 rounded text-xs font-mono border overflow-x-auto'>
                              <pre className='whitespace-pre-wrap'>
                                {JSON.stringify(log.metadata, null, 2)}
                              </pre>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className='flex-shrink-0 flex items-center gap-1'>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant='ghost'
                                size='sm'
                                onClick={() => copyToClipboard(log.message)}
                                className='h-6 w-6 p-0'>
                                <Copy className='w-3 h-3' />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy message</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
