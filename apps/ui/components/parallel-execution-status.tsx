"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  GitBranch,
  Zap,
  Cpu,
  Database,
  Eye,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ParallelGroup {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  nodeCount: number;
  activeNodes: number;
  memoryUsage: number;
  duration?: number;
}

interface ParallelExecutionStatusProps {
  executionId?: string;
  groups?: ParallelGroup[];
  overallProgress?: number;
  isActive?: boolean;
  compact?: boolean;
  showDetails?: boolean;
  onViewDetails?: () => void;
}

export function ParallelExecutionStatus({
  executionId,
  groups = [],
  overallProgress = 0,
  isActive = false,
  compact = false,
  showDetails = false,
  onViewDetails,
}: ParallelExecutionStatusProps) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [animatedProgress, setAnimatedProgress] = useState(0);

  // Mock data for demonstration
  const defaultGroups: ParallelGroup[] = [
    {
      id: 'g1',
      name: 'Data Fetching',
      status: 'completed',
      progress: 100,
      nodeCount: 3,
      activeNodes: 0,
      memoryUsage: 45,
      duration: 12000,
    },
    {
      id: 'g2',
      name: 'Processing',
      status: 'running',
      progress: 65,
      nodeCount: 2,
      activeNodes: 2,
      memoryUsage: 78,
    },
    {
      id: 'g3',
      name: 'Output',
      status: 'pending',
      progress: 0,
      nodeCount: 2,
      activeNodes: 0,
      memoryUsage: 0,
    },
  ];

  const activeGroups = groups.length > 0 ? groups : defaultGroups;
  const calculatedProgress = groups.length > 0 
    ? overallProgress 
    : activeGroups.reduce((sum, g) => sum + g.progress, 0) / activeGroups.length;

  // Animate progress
  useEffect(() => {
    const startProgress = animatedProgress;
    const targetProgress = calculatedProgress;
    const duration = 1000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeOutCubic = 1 - Math.pow(1 - progress, 3);
      const currentProgress = startProgress + (targetProgress - startProgress) * easeOutCubic;
      
      setAnimatedProgress(currentProgress);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [calculatedProgress]);

  const getStatusIcon = (status: string, size = "w-3 h-3") => {
    switch (status) {
      case 'running':
        return <Loader2 className={`${size} animate-spin text-blue-600`} />;
      case 'completed':
        return <CheckCircle className={`${size} text-green-600`} />;
      case 'failed':
        return <XCircle className={`${size} text-red-600`} />;
      case 'pending':
        return <Clock className={`${size} text-gray-600`} />;
      default:
        return <Activity className={`${size} text-gray-600`} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-100 border-blue-300';
      case 'completed': return 'bg-green-100 border-green-300';
      case 'failed': return 'bg-red-100 border-red-300';
      case 'pending': return 'bg-gray-100 border-gray-300';
      default: return 'bg-white border-gray-300';
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '--';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const runningGroups = activeGroups.filter(g => g.status === 'running').length;
  const completedGroups = activeGroups.filter(g => g.status === 'completed').length;
  const totalActiveNodes = activeGroups.reduce((sum, g) => sum + g.activeNodes, 0);
  const totalMemoryUsage = activeGroups.reduce((sum, g) => sum + g.memoryUsage, 0);

  const overallStatus = activeGroups.some(g => g.status === 'failed') ? 'failed' :
                       activeGroups.some(g => g.status === 'running') ? 'running' :
                       activeGroups.every(g => g.status === 'completed') ? 'completed' : 'pending';

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <GitBranch className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium">Parallel Execution</span>
                    <Badge variant={
                      overallStatus === 'running' ? 'default' :
                      overallStatus === 'completed' ? 'secondary' :
                      overallStatus === 'failed' ? 'destructive' : 'outline'
                    } className="text-xs">
                      {Math.round(animatedProgress)}%
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2">
                    {runningGroups > 0 && (
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Activity className="w-4 h-4 text-blue-600" />
                      </motion.div>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
                <Progress value={animatedProgress} className="w-full h-1 mt-2" />
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs">
              <div>{runningGroups} running • {completedGroups} completed</div>
              <div>{totalActiveNodes} active nodes • {totalMemoryUsage}MB memory</div>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <GitBranch className="w-4 h-4" />
              <span className="font-medium">Parallel Execution</span>
              <Badge variant={
                overallStatus === 'running' ? 'default' :
                overallStatus === 'completed' ? 'secondary' :
                overallStatus === 'failed' ? 'destructive' : 'outline'
              }>
                {overallStatus}
              </Badge>
            </div>
            <div className="flex items-center space-x-2">
              {onViewDetails && (
                <Button size="sm" variant="outline" onClick={onViewDetails}>
                  <Eye className="w-3 h-3 mr-1" />
                  Details
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Overall Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Overall Progress</span>
              <span className="font-medium">{Math.round(animatedProgress)}%</span>
            </div>
            <Progress value={animatedProgress} className="w-full" />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-blue-600">{runningGroups}</div>
              <div className="text-xs text-muted-foreground">Running</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-green-600">{completedGroups}</div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-orange-600">{totalActiveNodes}</div>
              <div className="text-xs text-muted-foreground">Active Nodes</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-purple-600">{totalMemoryUsage}MB</div>
              <div className="text-xs text-muted-foreground">Memory</div>
            </div>
          </div>

          {/* Expanded Details */}
          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-3 pt-2 border-t"
              >
                <h4 className="text-sm font-medium">Execution Groups</h4>
                <div className="space-y-2">
                  {activeGroups.map((group) => (
                    <motion.div
                      key={group.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        getStatusColor(group.status)
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(group.status)}
                        <div>
                          <p className="text-sm font-medium">{group.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {group.nodeCount} nodes
                            {group.activeNodes > 0 && ` • ${group.activeNodes} active`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="text-right">
                          <p className="text-sm font-medium">{Math.round(group.progress)}%</p>
                          {group.duration && (
                            <p className="text-xs text-muted-foreground">
                              {formatDuration(group.duration)}
                            </p>
                          )}
                        </div>
                        <div className="w-16">
                          <Progress value={group.progress} className="h-2" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Resource Usage */}
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-4">
                      <span className="flex items-center">
                        <Cpu className="w-3 h-3 mr-1" />
                        CPU Usage
                      </span>
                      <span className="flex items-center">
                        <Database className="w-3 h-3 mr-1" />
                        Memory Usage
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 font-medium">
                      <span>--</span>
                      <span>{totalMemoryUsage}MB</span>
                    </div>
                  </div>
                </div>

                {/* Active Indicators */}
                {isActive && totalActiveNodes > 0 && (
                  <div className="flex items-center justify-center pt-2">
                    <div className="flex items-center space-x-2 text-xs text-blue-600">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <Zap className="w-3 h-3" />
                      </motion.div>
                      <span>Processing {totalActiveNodes} nodes in parallel</span>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </CardContent>
    </Card>
  );
}