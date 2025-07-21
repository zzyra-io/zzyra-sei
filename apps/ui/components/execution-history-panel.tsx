"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ExecutionLog } from "@/hooks/use-execution-websocket";
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Copy, 
  Download, 
  Filter, 
  Info, 
  Loader2, 
  XCircle,
  Eye,
  EyeOff
} from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

interface ExecutionHistoryPanelProps {
  logs: ExecutionLog[];
  isConnected: boolean;
  executionId?: string;
}

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

const logLevelConfig: Record<LogLevel, {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
}> = {
  info: {
    icon: Info,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  warn: {
    icon: AlertCircle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
  error: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
  },
  debug: {
    icon: CheckCircle2,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
  },
};

export function ExecutionHistoryPanel({ logs, isConnected, executionId }: ExecutionHistoryPanelProps) {
  const [selectedLevels, setSelectedLevels] = useState<Set<LogLevel>>(new Set(['info', 'warn', 'error']));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showMetadata, setShowMetadata] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Filter by log level
      if (!selectedLevels.has(log.level)) return false;
      
      // Filter by node ID if selected
      if (selectedNodeId && log.nodeId !== selectedNodeId) return false;
      
      // Filter by search term
      if (searchTerm && !log.message.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  }, [logs, selectedLevels, selectedNodeId, searchTerm]);

  const uniqueNodeIds = useMemo(() => {
    const nodeIds = new Set(logs.map(log => log.nodeId).filter(Boolean));
    return Array.from(nodeIds);
  }, [logs]);

  const logCounts = useMemo(() => {
    return logs.reduce((counts, log) => {
      counts[log.level] = (counts[log.level] || 0) + 1;
      return counts;
    }, {} as Record<LogLevel, number>);
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

  const exportLogs = () => {
    const logsText = filteredLogs.map(log => {
      const timestamp = new Date(log.timestamp).toLocaleString();
      const metadata = log.metadata ? `\nMetadata: ${JSON.stringify(log.metadata, null, 2)}` : '';
      return `[${timestamp}] [${log.level.toUpperCase()}] ${log.nodeId ? `[${log.nodeId}] ` : ''}${log.message}${metadata}`;
    }).join('\n\n');

    const blob = new Blob([logsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `execution-logs-${executionId || Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <Card className="w-full h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Execution History
              <Badge variant={isConnected ? "default" : "destructive"}>
                {isConnected ? "Live" : "Stale"}
              </Badge>
            </CardTitle>
            <CardDescription>
              Real-time execution logs and timeline ({filteredLogs.length} of {logs.length} logs)
            </CardDescription>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMetadata(!showMetadata)}
            >
              {showMetadata ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              Metadata
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportLogs}
              disabled={filteredLogs.length === 0}
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-3">
          {/* Search */}
          <div>
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Log Level Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">Levels:</span>
            {Object.entries(logLevelConfig).map(([level, config]) => {
              const count = logCounts[level as LogLevel] || 0;
              return (
                <Button
                  key={level}
                  variant={selectedLevels.has(level as LogLevel) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleLogLevel(level as LogLevel)}
                  className="gap-1"
                >
                  <config.icon className="w-3 h-3" />
                  {level}
                  {count > 0 && <Badge variant="secondary">{count}</Badge>}
                </Button>
              );
            })}
          </div>

          {/* Node Filters */}
          {uniqueNodeIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium">Nodes:</span>
              <Button
                variant={!selectedNodeId ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedNodeId(null)}
              >
                All
              </Button>
              {uniqueNodeIds.slice(0, 5).map(nodeId => (
                <Button
                  key={nodeId}
                  variant={selectedNodeId === nodeId ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedNodeId(nodeId)}
                  className="font-mono text-xs"
                >
                  {nodeId}
                </Button>
              ))}
              {uniqueNodeIds.length > 5 && (
                <span className="text-xs text-muted-foreground">
                  +{uniqueNodeIds.length - 5} more
                </span>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full px-6 pb-6">
          {filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <div className="text-muted-foreground">
                {logs.length === 0 ? "No logs available" : "No logs match your filters"}
              </div>
              {logs.length > 0 && filteredLogs.length === 0 && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setSelectedLevels(new Set(['info', 'warn', 'error', 'debug']));
                    setSelectedNodeId(null);
                    setSearchTerm('');
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLogs.map((log, index) => {
                const config = logLevelConfig[log.level];
                const Icon = config.icon;
                const timestamp = new Date(log.timestamp).toLocaleString();

                return (
                  <div
                    key={log.id}
                    className={cn(
                      "relative p-3 rounded-lg border transition-all",
                      config.bgColor,
                      config.borderColor,
                      "hover:shadow-sm"
                    )}
                  >
                    {/* Timeline connector */}
                    {index < filteredLogs.length - 1 && (
                      <div className="absolute left-6 top-10 w-px h-4 bg-border" />
                    )}

                    <div className="flex items-start gap-3">
                      <div className={cn("flex-shrink-0 mt-0.5", config.color)}>
                        <Icon className="w-4 h-4" />
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-mono">{timestamp}</span>
                          {log.nodeId && (
                            <>
                              <Separator orientation="vertical" className="h-3" />
                              <Badge variant="outline" className="font-mono text-xs">
                                {log.nodeId}
                              </Badge>
                            </>
                          )}
                        </div>

                        <div className="text-sm font-medium">{log.message}</div>

                        {showMetadata && log.metadata && (
                          <div className="mt-2">
                            <div className="text-xs font-medium text-muted-foreground mb-1">
                              Metadata:
                            </div>
                            <div className="bg-white dark:bg-gray-900 p-2 rounded text-xs font-mono border overflow-x-auto">
                              <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex-shrink-0 flex items-center gap-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(log.message)}
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              Copy message
                            </TooltipContent>
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