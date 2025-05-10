import React from 'react';
import { ExecutionStatus } from '@/hooks/use-workflow-execution';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, XCircle, Clock, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ExecutionStatusPanelProps {
  executionStatus: ExecutionStatus | undefined;
  isLoadingStatus: boolean;
  onClose?: () => void;
}

export function ExecutionStatusPanel({ executionStatus, isLoadingStatus, onClose }: ExecutionStatusPanelProps) {
  if (isLoadingStatus && !executionStatus) {
    return (
      <Card className="w-full h-auto">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading execution status...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!executionStatus) {
    return null;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'failed':
        return <Badge className="bg-red-500">Failed</Badge>;
      case 'running':
        return <Badge className="bg-blue-500">Running</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500">Pending</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <Card className="w-full h-auto">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Execution Status</CardTitle>
          <div className="flex items-center space-x-2">
            {getStatusBadge(executionStatus.status)}
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close panel">
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        <CardDescription>
          Execution ID: {executionStatus.id}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{executionStatus.execution_progress || 0}%</span>
            </div>
            <Progress value={executionStatus.execution_progress || 0} />
          </div>

          {/* Current Node */}
          {executionStatus.current_node_id && (
            <div className="flex items-center text-sm">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-blue-500" />
              <span>Currently executing: <strong>{executionStatus.current_node_id}</strong></span>
            </div>
          )}

          {/* Node Stats */}
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div className="flex flex-col items-center p-2 bg-green-100 rounded">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                <span>{executionStatus.nodes_completed?.length || 0}</span>
              </div>
              <span className="text-xs mt-1">Completed</span>
            </div>
            <div className="flex flex-col items-center p-2 bg-red-100 rounded">
              <div className="flex items-center">
                <XCircle className="h-4 w-4 text-red-500 mr-1" />
                <span>{executionStatus.nodes_failed?.length || 0}</span>
              </div>
              <span className="text-xs mt-1">Failed</span>
            </div>
            <div className="flex flex-col items-center p-2 bg-yellow-100 rounded">
              <div className="flex items-center">
                <Clock className="h-4 w-4 text-yellow-500 mr-1" />
                <span>{executionStatus.nodes_pending?.length || 0}</span>
              </div>
              <span className="text-xs mt-1">Pending</span>
            </div>
          </div>

          {/* Logs */}
          {executionStatus.logs && executionStatus.logs.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Execution Logs</h4>
              <ScrollArea className="h-32 rounded border p-2">
                <div className="space-y-1">
                  {executionStatus.logs.map((log, index) => (
                    <div key={index} className="text-xs font-mono">
                      {log}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Error */}
          {executionStatus.error && (
            <div className="p-2 bg-red-100 rounded text-sm">
              <h4 className="font-medium text-red-700">Error</h4>
              <p className="text-xs">{executionStatus.error}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
