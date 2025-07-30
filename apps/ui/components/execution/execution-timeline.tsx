"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Clock,
  Loader2,
  XCircle,
  Play,
  Pause,
  AlertCircle,
  Zap,
  Activity,
} from "lucide-react";
import { useMemo } from "react";

interface ExecutionTimelineProps {
  nodes: Array<{
    id: string;
    label: string;
    type: string;
    status: "pending" | "running" | "completed" | "failed" | "skipped";
    startTime?: Date;
    endTime?: Date;
    duration?: number;
    progress?: number;
    error?: string;
  }>;
  isExecuting: boolean;
  totalProgress: number;
  currentExecutionId?: string;
  onNodeClick?: (nodeId: string) => void;
  onClose?: () => void;
}

export function ExecutionTimeline({
  nodes,
  isExecuting,
  totalProgress,
  currentExecutionId,
  onNodeClick,
  onClose,
}: ExecutionTimelineProps) {
  const sortedNodes = useMemo(() => {
    return [...nodes].sort((a, b) => {
      // Sort by execution order (pending -> running -> completed/failed)
      const statusOrder = {
        pending: 0,
        running: 1,
        completed: 2,
        failed: 3,
        skipped: 4,
      };
      return statusOrder[a.status] - statusOrder[b.status];
    });
  }, [nodes]);

  const getStatusIcon = (status: string, isCurrent: boolean = false) => {
    switch (status) {
      case "running":
        return (
          <div className='relative'>
            <Loader2 className='w-3 h-3 animate-spin text-blue-500' />
            {isCurrent && (
              <div className='absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse' />
            )}
          </div>
        );
      case "completed":
        return <CheckCircle2 className='w-3 h-3 text-green-500' />;
      case "failed":
        return <XCircle className='w-3 h-3 text-red-500' />;
      case "skipped":
        return <Pause className='w-3 h-3 text-gray-400' />;
      default:
        return <Clock className='w-3 h-3 text-gray-400' />;
    }
  };

  const getStatusColor = (status: string, isCurrent: boolean = false) => {
    if (isCurrent) return "bg-blue-100 border-blue-300";

    switch (status) {
      case "running":
        return "bg-blue-50 border-blue-200";
      case "completed":
        return "bg-green-50 border-green-200";
      case "failed":
        return "bg-red-50 border-red-200";
      case "skipped":
        return "bg-gray-50 border-gray-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  if (nodes.length === 0) {
    return null;
  }

  return (
    <div className='fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50'>
      <div className='bg-white/95 backdrop-blur-sm border border-gray-200 rounded-full shadow-lg px-4 py-2 flex items-center gap-3'>
        {/* Header */}
        <div className='flex items-center gap-2'>
          <Zap className='w-3 h-3 text-blue-500' />
          <span className='text-xs font-medium text-gray-700'>Timeline</span>
          {isExecuting && (
            <Badge
              variant='secondary'
              className='text-xs px-1.5 py-0.5 animate-pulse'>
              <Loader2 className='w-2.5 h-2.5 mr-1 animate-spin' />
              Running
            </Badge>
          )}
        </div>

        {/* Progress */}
        <div className='flex items-center gap-2'>
          <span className='text-xs text-gray-500'>
            {Math.round(totalProgress)}%
          </span>
          <Progress value={totalProgress} className='w-16 h-1.5' />
        </div>

        {/* Nodes */}
        <div className='flex gap-2'>
          {sortedNodes.map((node, index) => {
            const isCurrent = node.status === "running";
            const isCompleted = node.status === "completed";
            const isFailed = node.status === "failed";

            return (
              <TooltipProvider key={node.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className={cn(
                        "relative flex items-center gap-1.5 px-2 py-1 rounded-full border transition-all duration-200 cursor-pointer hover:shadow-sm min-w-[60px] justify-center",
                        getStatusColor(node.status, isCurrent),
                        isCurrent && "animate-pulse"
                      )}
                      onClick={() => onNodeClick?.(node.id)}>
                      {/* Node Icon */}
                      <div className='relative flex items-center justify-center'>
                        {getStatusIcon(node.status, isCurrent)}
                      </div>

                      {/* Node Label */}
                      <span className='text-xs font-medium truncate max-w-[40px]'>
                        {node.label}
                      </span>

                      {/* Status Badge for Current */}
                      {isCurrent && (
                        <div className='absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse' />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className='space-y-1'>
                      <div className='font-medium'>{node.label}</div>
                      <div className='text-xs text-muted-foreground'>
                        Type: {node.type}
                      </div>
                      <div className='text-xs text-muted-foreground'>
                        Status: {node.status}
                      </div>
                      {node.duration && (
                        <div className='text-xs text-muted-foreground'>
                          Duration: {node.duration}ms
                        </div>
                      )}
                      {node.error && (
                        <div className='text-xs text-red-600'>
                          Error: {node.error}
                        </div>
                      )}
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>

        {/* Summary */}
        <div className='flex items-center gap-3 text-xs text-gray-500'>
          <div className='flex items-center gap-1'>
            <CheckCircle2 className='w-3 h-3 text-green-500' />
            <span>{nodes.filter((n) => n.status === "completed").length}</span>
          </div>
          <div className='flex items-center gap-1'>
            <XCircle className='w-3 h-3 text-red-500' />
            <span>{nodes.filter((n) => n.status === "failed").length}</span>
          </div>
          <div className='flex items-center gap-1'>
            <Clock className='w-3 h-3 text-gray-400' />
            <span>{nodes.filter((n) => n.status === "pending").length}</span>
          </div>
        </div>

        {/* Close Button */}
        {onClose && (
          <Button
            variant='ghost'
            size='sm'
            onClick={onClose}
            className='h-6 w-6 p-0 ml-2'>
            <XCircle className='w-3 h-3' />
          </Button>
        )}
      </div>
    </div>
  );
}
