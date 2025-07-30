"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
}

export function ExecutionTimeline({
  nodes,
  isExecuting,
  totalProgress,
  currentExecutionId,
  onNodeClick,
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
            <Loader2 className='w-4 h-4 animate-spin text-blue-500' />
            {isCurrent && (
              <div className='absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-pulse' />
            )}
          </div>
        );
      case "completed":
        return <CheckCircle2 className='w-4 h-4 text-green-500' />;
      case "failed":
        return <XCircle className='w-4 h-4 text-red-500' />;
      case "skipped":
        return <Pause className='w-4 h-4 text-gray-400' />;
      default:
        return <Clock className='w-4 h-4 text-gray-400' />;
    }
  };

  const getStatusColor = (status: string, isCurrent: boolean = false) => {
    if (isCurrent) return "border-blue-500 bg-blue-50";

    switch (status) {
      case "running":
        return "border-blue-300 bg-blue-50";
      case "completed":
        return "border-green-300 bg-green-50";
      case "failed":
        return "border-red-300 bg-red-50";
      case "skipped":
        return "border-gray-300 bg-gray-50";
      default:
        return "border-gray-300 bg-gray-50";
    }
  };

  const getProgressColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-blue-500";
      case "completed":
        return "bg-green-500";
      case "failed":
        return "bg-red-500";
      case "skipped":
        return "bg-gray-400";
      default:
        return "bg-gray-300";
    }
  };

  if (nodes.length === 0) {
    return (
      <Card className='w-full'>
        <CardContent className='p-4'>
          <div className='flex items-center justify-center py-8 text-muted-foreground'>
            <Activity className='w-5 h-5 mr-2' />
            <span className='text-sm'>No execution data available</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className='w-full'>
      <CardContent className='p-4'>
        {/* Header */}
        <div className='flex items-center justify-between mb-4'>
          <div className='flex items-center gap-2'>
            <Zap className='w-4 h-4 text-blue-500' />
            <span className='text-sm font-medium'>Execution Timeline</span>
            {isExecuting && (
              <Badge variant='secondary' className='animate-pulse'>
                <Loader2 className='w-3 h-3 mr-1 animate-spin' />
                Running
              </Badge>
            )}
          </div>
          <div className='flex items-center gap-2'>
            <span className='text-xs text-muted-foreground'>
              {Math.round(totalProgress)}% Complete
            </span>
            <Progress value={totalProgress} className='w-20 h-2' />
          </div>
        </div>

                {/* Timeline */}
        <div className='relative'>
          {/* Horizontal Timeline Line */}
          <div className='absolute top-6 left-0 right-0 h-0.5 bg-gray-200' />
 
          {/* Nodes */}
          <div className='flex gap-4 overflow-x-auto pb-4'>
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
                             "relative flex flex-col items-center gap-2 p-3 rounded-lg border transition-all duration-200 cursor-pointer hover:shadow-sm min-w-[120px]",
                             getStatusColor(node.status, isCurrent),
                             isCurrent && "animate-pulse"
                           )}
                           onClick={() => onNodeClick?.(node.id)}>
                           {/* Node Icon */}
                           <div className='relative z-10 flex items-center justify-center w-12 h-12 rounded-full bg-white border-2 border-current'>
                             {getStatusIcon(node.status, isCurrent)}
                           </div>

                                                   {/* Node Info */}
                           <div className='flex flex-col items-center gap-1 text-center'>
                             <span className='text-xs font-medium truncate w-full'>
                               {node.label}
                             </span>
                             <Badge variant='outline' className='text-xs'>
                               {node.type}
                             </Badge>
                             {isCurrent && (
                               <Badge
                                 variant='secondary'
                                 className='text-xs animate-pulse'>
                                 <Loader2 className='w-3 h-3 mr-1 animate-spin' />
                                 Active
                               </Badge>
                             )}
                           </div>

                                                     {/* Progress Bar for Running Nodes */}
                           {isCurrent && node.progress !== undefined && (
                             <div className='mt-2 w-full'>
                               <div className='flex items-center justify-between text-xs text-muted-foreground mb-1'>
                                 <span>Progress</span>
                                 <span>{Math.round(node.progress)}%</span>
                               </div>
                               <Progress
                                 value={node.progress}
                                 className='h-1.5'
                               />
                             </div>
                           )}

                           {/* Duration for Completed Nodes */}
                           {isCompleted && node.duration && (
                             <div className='mt-1 text-xs text-muted-foreground'>
                               {node.duration}ms
                             </div>
                           )}

                           {/* Error for Failed Nodes */}
                           {isFailed && node.error && (
                             <div className='mt-1 text-xs text-red-600 flex items-center gap-1'>
                               <AlertCircle className='w-3 h-3' />
                               Error
                             </div>
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
           </div>

        {/* Summary */}
        <div className='mt-4 pt-4 border-t'>
          <div className='flex items-center justify-between text-xs text-muted-foreground'>
            <div className='flex items-center gap-4'>
              <div className='flex items-center gap-1'>
                <CheckCircle2 className='w-3 h-3 text-green-500' />
                <span>
                  {nodes.filter((n) => n.status === "completed").length}{" "}
                  completed
                </span>
              </div>
              <div className='flex items-center gap-1'>
                <XCircle className='w-3 h-3 text-red-500' />
                <span>
                  {nodes.filter((n) => n.status === "failed").length} failed
                </span>
              </div>
              <div className='flex items-center gap-1'>
                <Clock className='w-3 h-3 text-gray-500' />
                <span>
                  {nodes.filter((n) => n.status === "pending").length} pending
                </span>
              </div>
            </div>
            {currentExecutionId && (
              <span className='text-xs font-mono'>
                ID: {currentExecutionId.slice(0, 8)}...
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
