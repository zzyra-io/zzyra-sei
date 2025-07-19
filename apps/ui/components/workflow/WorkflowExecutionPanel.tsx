import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Download, 
  Filter, 
  Search,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  Activity,
  Zap,
  BarChart3,
  Terminal,
  Eye,
  ArrowRight,
  X
} from 'lucide-react';
import { useWorkflowExecution, BlockExecutionMonitor, LogLevel } from './BlockExecutionMonitor';

export function WorkflowExecutionPanel() {
  const { execution, startExecution, stopExecution, clearLogs } = useWorkflowExecution();
  const [searchTerm, setSearchTerm] = useState('');
  const [logLevelFilter, setLogLevelFilter] = useState<LogLevel | 'all'>('all');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  const filteredLogs = execution?.logs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = logLevelFilter === 'all' || log.level === logLevelFilter;
    return matchesSearch && matchesLevel;
  }) || [];

  const getExecutionStateIcon = () => {
    if (!execution) return <div className="h-4 w-4 rounded-full bg-gray-300" />;
    
    switch (execution.state) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <X className="h-4 w-4 text-gray-500" />;
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-300" />;
    }
  };

  const getExecutionStateColor = () => {
    if (!execution) return 'bg-gray-300';
    
    switch (execution.state) {
      case 'running': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'cancelled': return 'bg-gray-500';
      default: return 'bg-gray-300';
    }
  };

  const blockEntries = execution ? Object.entries(execution.blocks) : [];

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-muted/50">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${getExecutionStateColor()}`} />
          <h2 className="font-semibold">Workflow Execution</h2>
          {getExecutionStateIcon()}
          {execution && (
            <Badge variant="outline" className="text-xs">
              {execution.executionId}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => startExecution('workflow-1')}
            disabled={execution?.state === 'running'}
          >
            <Play className="h-4 w-4 mr-1" />
            Start
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={stopExecution}
            disabled={execution?.state !== 'running'}
          >
            <Square className="h-4 w-4 mr-1" />
            Stop
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={clearLogs}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {/* Progress Overview */}
      {execution && (
        <div className="p-4 border-b bg-background">
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{execution.progress.total}</div>
              <div className="text-xs text-muted-foreground">Total Blocks</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-500">{execution.progress.completed}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-500">{execution.progress.running}</div>
              <div className="text-xs text-muted-foreground">Running</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-500">{execution.progress.failed}</div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Progress</span>
              <span>{execution.progress.completed}/{execution.progress.total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${execution.progress.total > 0 ? (execution.progress.completed / execution.progress.total) * 100 : 0}%`
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="blocks" className="h-full flex flex-col">
          <TabsList className="mx-4 mt-4 grid w-auto grid-cols-4 h-8">
            <TabsTrigger value="blocks" className="text-xs">Blocks</TabsTrigger>
            <TabsTrigger value="logs" className="text-xs">Logs</TabsTrigger>
            <TabsTrigger value="data" className="text-xs">Data Flow</TabsTrigger>
            <TabsTrigger value="performance" className="text-xs">Performance</TabsTrigger>
          </TabsList>

          {/* Blocks Tab */}
          <TabsContent value="blocks" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-full px-4">
              <div className="space-y-4">
                {blockEntries.map(([blockId, blockData]) => (
                  <BlockExecutionMonitor
                    key={blockId}
                    blockId={blockId}
                    className="w-full"
                  />
                ))}
                {blockEntries.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <div className="text-sm">No blocks executed yet</div>
                    <div className="text-xs">Start a workflow to see block execution details</div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Logs Tab */}
          <TabsContent value="logs" className="flex-1 overflow-hidden mt-4">
            <div className="px-4">
              {/* Log Filters */}
              <div className="flex items-center gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 h-8"
                  />
                </div>
                <div className="flex items-center gap-1">
                  {(['all', 'error', 'warn', 'info', 'debug'] as const).map((level) => (
                    <Button
                      key={level}
                      size="sm"
                      variant={logLevelFilter === level ? "default" : "outline"}
                      onClick={() => setLogLevelFilter(level)}
                      className="h-8 px-2 text-xs"
                    >
                      {level}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <ScrollArea className="h-full px-4">
              <div className="space-y-2">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className={`p-3 rounded border text-xs ${
                      log.level === 'error' ? 'border-red-200 bg-red-50' :
                      log.level === 'warn' ? 'border-yellow-200 bg-yellow-50' :
                      log.level === 'info' ? 'border-blue-200 bg-blue-50' :
                      'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {log.level.toUpperCase()}
                      </Badge>
                      {log.blockId && (
                        <Badge variant="secondary" className="text-xs">
                          {log.blockType}: {log.blockId}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1 text-sm">{log.message}</div>
                    {log.data && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-muted-foreground">
                          View Data
                        </summary>
                        <pre className="mt-1 text-xs bg-black/5 p-2 rounded overflow-x-auto">
                          {JSON.stringify(log.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
                {filteredLogs.length === 0 && (
                  <div className="text-center text-muted-foreground py-8">
                    <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <div className="text-sm">No logs found</div>
                    <div className="text-xs">Try adjusting your filters or start a workflow</div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Data Flow Tab */}
          <TabsContent value="data" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-full px-4">
              <div className="space-y-4">
                {blockEntries.map(([blockId, blockData], index) => (
                  <div key={blockId} className="relative">
                    <Card>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{blockData.blockType}</Badge>
                            <span className="text-sm font-medium">{blockData.blockName}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setSelectedBlockId(blockId)}
                            className="h-6 w-6 p-0"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Input</div>
                            <div className="bg-blue-50 p-2 rounded text-xs">
                              {blockData.inputData ? (
                                <pre className="truncate">
                                  {JSON.stringify(blockData.inputData, null, 2).slice(0, 100)}...
                                </pre>
                              ) : (
                                <span className="text-muted-foreground">No input data</span>
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">Output</div>
                            <div className="bg-green-50 p-2 rounded text-xs">
                              {blockData.outputData ? (
                                <pre className="truncate">
                                  {JSON.stringify(blockData.outputData, null, 2).slice(0, 100)}...
                                </pre>
                              ) : (
                                <span className="text-muted-foreground">No output data</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Arrow to next block */}
                    {index < blockEntries.length - 1 && (
                      <div className="flex justify-center my-2">
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-full px-4">
              <div className="space-y-4">
                {execution && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Overall Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-muted-foreground">Total Duration</div>
                          <div className="text-sm font-medium">
                            {execution.startTime && execution.endTime 
                              ? `${new Date(execution.endTime).getTime() - new Date(execution.startTime).getTime()}ms`
                              : 'In progress...'
                            }
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Average Block Time</div>
                          <div className="text-sm font-medium">
                            {blockEntries.length > 0 
                              ? `${Math.round(blockEntries.reduce((sum, [, block]) => sum + (block.duration || 0), 0) / blockEntries.length)}ms`
                              : 'N/A'
                            }
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {blockEntries.map(([blockId, blockData]) => (
                  <Card key={blockId}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{blockData.blockType}</Badge>
                          <span className="text-sm font-medium">{blockData.blockName}</span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {blockData.duration ? `${blockData.duration}ms` : 'N/A'}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-xs">
                        <div>
                          <div className="text-muted-foreground">Status</div>
                          <div className="capitalize">{blockData.state}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Memory</div>
                          <div>
                            {blockData.metadata?.memoryUsage 
                              ? `${(blockData.metadata.memoryUsage / 1024 / 1024).toFixed(2)}MB`
                              : 'N/A'
                            }
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Retries</div>
                          <div>
                            {blockData.metadata?.retryCount !== undefined
                              ? `${blockData.metadata.retryCount}/${blockData.metadata.maxRetries || 0}`
                              : 'N/A'
                            }
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}