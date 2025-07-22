"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  AlertTriangle,
  XCircle,
  Zap,
  BarChart3,
  GitBranch,
  Loader2,
  Play,
  Pause,
  RotateCcw,
  Timer,
  Cpu,
  Database,
  ArrowRight,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ExecutionGroup {
  id: string;
  name: string;
  nodeIds: string[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime?: string;
  endTime?: string;
  duration?: number;
  progress: number;
  dependencies: string[]; // IDs of groups that must complete first
  sharedData: Record<string, any>;
  memoryUsage: number;
  cpuUsage: number;
}

interface NodeExecution {
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  groupId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  progress: number;
  startTime?: string;
  endTime?: string;
  duration?: number;
  output?: any;
  error?: string;
  dependencies: string[];
  memoryUsage: number;
  isBlocking: boolean; // Whether this node blocks the entire group
}

interface DataDependency {
  sourceNodeId: string;
  targetNodeId: string;
  dataKey: string;
  status: 'waiting' | 'available' | 'transferred';
  dataSize?: number;
}

interface ParallelExecutionVisualizerProps {
  executionId?: string;
  workflowId?: string;
  executionGroups?: ExecutionGroup[];
  nodeExecutions?: NodeExecution[];
  dataDependencies?: DataDependency[];
  isActive?: boolean;
  onPause?: () => void;
  onResume?: () => void;
  onStop?: () => void;
  onRetry?: () => void;
}

export function ParallelExecutionVisualizer({
  executionId,
  workflowId,
  executionGroups = [],
  nodeExecutions = [],
  dataDependencies = [],
  isActive = false,
  onPause,
  onResume,
  onStop,
  onRetry,
}: ParallelExecutionVisualizerProps) {
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [showDataFlow, setShowDataFlow] = useState(true);
  const [autoScroll, setAutoScroll] = useState(true);

  // Mock data for demonstration
  const [mockGroups, setMockGroups] = useState<ExecutionGroup[]>([
    {
      id: 'group-1',
      name: 'Data Fetching',
      nodeIds: ['node-1', 'node-2', 'node-3'],
      status: 'completed',
      startTime: new Date(Date.now() - 120000).toISOString(),
      endTime: new Date(Date.now() - 90000).toISOString(),
      duration: 30000,
      progress: 100,
      dependencies: [],
      sharedData: { apiKey: 'xxx', baseUrl: 'https://api.example.com' },
      memoryUsage: 45,
      cpuUsage: 25,
    },
    {
      id: 'group-2',
      name: 'Data Processing',
      nodeIds: ['node-4', 'node-5'],
      status: 'running',
      startTime: new Date(Date.now() - 60000).toISOString(),
      progress: 65,
      dependencies: ['group-1'],
      sharedData: { processingConfig: { batchSize: 100 } },
      memoryUsage: 78,
      cpuUsage: 85,
    },
    {
      id: 'group-3',
      name: 'Notifications',
      nodeIds: ['node-6', 'node-7'],
      status: 'pending',
      progress: 0,
      dependencies: ['group-2'],
      sharedData: {},
      memoryUsage: 12,
      cpuUsage: 5,
    },
  ]);

  const [mockNodes, setMockNodes] = useState<NodeExecution[]>([
    {
      nodeId: 'node-1',
      nodeLabel: 'Fetch User Data',
      nodeType: 'HTTP_REQUEST',
      groupId: 'group-1',
      status: 'completed',
      progress: 100,
      startTime: new Date(Date.now() - 120000).toISOString(),
      endTime: new Date(Date.now() - 100000).toISOString(),
      duration: 20000,
      output: { users: 150 },
      dependencies: [],
      memoryUsage: 15,
      isBlocking: false,
    },
    {
      nodeId: 'node-2',
      nodeLabel: 'Fetch Orders',
      nodeType: 'DATABASE',
      groupId: 'group-1',
      status: 'completed',
      progress: 100,
      startTime: new Date(Date.now() - 115000).toISOString(),
      endTime: new Date(Date.now() - 95000).toISOString(),
      duration: 20000,
      output: { orders: 2500 },
      dependencies: [],
      memoryUsage: 25,
      isBlocking: false,
    },
    {
      nodeId: 'node-4',
      nodeLabel: 'Transform Data',
      nodeType: 'TRANSFORM',
      groupId: 'group-2',
      status: 'running',
      progress: 65,
      startTime: new Date(Date.now() - 60000).toISOString(),
      dependencies: ['node-1', 'node-2'],
      memoryUsage: 45,
      isBlocking: true,
    },
    {
      nodeId: 'node-5',
      nodeLabel: 'Generate Report',
      nodeType: 'TRANSFORM',
      groupId: 'group-2',
      status: 'pending',
      progress: 0,
      dependencies: ['node-4'],
      memoryUsage: 0,
      isBlocking: false,
    },
  ]);

  // Use provided data or mock data
  const groups = executionGroups.length > 0 ? executionGroups : mockGroups;
  const nodes = nodeExecutions.length > 0 ? nodeExecutions : mockNodes;

  // Simulate progress updates
  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setMockGroups(prev => prev.map(group => {
        if (group.status === 'running' && group.progress < 100) {
          return {
            ...group,
            progress: Math.min(group.progress + Math.random() * 5, 100),
            cpuUsage: Math.max(10, group.cpuUsage + (Math.random() - 0.5) * 10),
            memoryUsage: Math.max(10, group.memoryUsage + (Math.random() - 0.5) * 5),
          };
        }
        if (group.status === 'running' && group.progress >= 100) {
          return {
            ...group,
            status: 'completed' as const,
            endTime: new Date().toISOString(),
            duration: Date.now() - new Date(group.startTime!).getTime(),
          };
        }
        return group;
      }));

      setMockNodes(prev => prev.map(node => {
        if (node.status === 'running' && node.progress < 100) {
          return {
            ...node,
            progress: Math.min(node.progress + Math.random() * 8, 100),
            memoryUsage: Math.max(5, node.memoryUsage + (Math.random() - 0.5) * 3),
          };
        }
        if (node.status === 'running' && node.progress >= 100) {
          return {
            ...node,
            status: 'completed' as const,
            endTime: new Date().toISOString(),
            duration: Date.now() - new Date(node.startTime!).getTime(),
            output: { processed: true, timestamp: new Date().toISOString() },
          };
        }
        return node;
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, [isActive]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Loader2 className="w-4 h-4 animate-spin text-blue-600" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-600" />;
      default:
        return <Activity className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'border-blue-500 bg-blue-50';
      case 'completed': return 'border-green-500 bg-green-50';
      case 'failed': return 'border-red-500 bg-red-50';
      case 'pending': return 'border-gray-300 bg-gray-50';
      default: return 'border-gray-300 bg-white';
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '--';
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  const totalProgress = useMemo(() => {
    if (groups.length === 0) return 0;
    return groups.reduce((sum, group) => sum + group.progress, 0) / groups.length;
  }, [groups]);

  const overallStatus = useMemo(() => {
    if (groups.some(g => g.status === 'failed')) return 'failed';
    if (groups.some(g => g.status === 'running')) return 'running';
    if (groups.every(g => g.status === 'completed')) return 'completed';
    return 'pending';
  }, [groups]);

  const runningGroups = groups.filter(g => g.status === 'running').length;
  const completedGroups = groups.filter(g => g.status === 'completed').length;
  const totalMemoryUsage = groups.reduce((sum, g) => sum + g.memoryUsage, 0);
  const avgCpuUsage = groups.reduce((sum, g) => sum + g.cpuUsage, 0) / groups.length;

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <GitBranch className="w-5 h-5" />
            <h2 className="text-xl font-semibold">Parallel Execution</h2>
            <Badge variant={
              overallStatus === 'running' ? 'default' :
              overallStatus === 'completed' ? 'secondary' :
              overallStatus === 'failed' ? 'destructive' : 'outline'
            }>
              {overallStatus}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>{runningGroups} Running</span>
            <span>{completedGroups} Completed</span>
            <span>{groups.length - completedGroups - runningGroups} Pending</span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {isActive ? (
            <>
              <Button size="sm" variant="outline" onClick={onPause}>
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </Button>
              <Button size="sm" variant="outline" onClick={onStop}>
                <XCircle className="w-4 h-4 mr-2" />
                Stop
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={onResume}>
                <Play className="w-4 h-4 mr-2" />
                Resume
              </Button>
              <Button size="sm" variant="outline" onClick={onRetry}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4" />
                <span className="font-medium">Overall Progress</span>
              </div>
              <span className="text-sm font-medium">{Math.round(totalProgress)}%</span>
            </div>
            <Progress value={totalProgress} className="w-full" />
            
            <div className="grid grid-cols-4 gap-4 pt-2">
              <div className="text-center">
                <div className="text-lg font-semibold text-blue-600">{runningGroups}</div>
                <div className="text-xs text-muted-foreground">Active Groups</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600">{totalMemoryUsage}MB</div>
                <div className="text-xs text-muted-foreground">Memory Usage</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-orange-600">{Math.round(avgCpuUsage)}%</div>
                <div className="text-xs text-muted-foreground">Avg CPU</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-purple-600">{nodes.length}</div>
                <div className="text-xs text-muted-foreground">Total Nodes</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Execution Groups */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center space-x-2">
                <GitBranch className="w-4 h-4" />
                <span>Execution Groups</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {groups.map((group, index) => (
                  <motion.div
                    key={group.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedGroup === group.id ? 'ring-2 ring-blue-500' : ''
                    } ${getStatusColor(group.status)}`}
                    onClick={() => setSelectedGroup(selectedGroup === group.id ? null : group.id)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(group.status)}
                        <div>
                          <h3 className="font-medium">{group.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            {group.nodeIds.length} nodes • Group {index + 1}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {Math.round(group.progress)}%
                        </Badge>
                        {group.duration && (
                          <Badge variant="outline" className="text-xs">
                            {formatDuration(group.duration)}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Progress value={group.progress} className="w-full h-2" />
                      
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center space-x-4">
                          <span className="flex items-center">
                            <Cpu className="w-3 h-3 mr-1" />
                            CPU: {group.cpuUsage}%
                          </span>
                          <span className="flex items-center">
                            <Database className="w-3 h-3 mr-1" />
                            RAM: {group.memoryUsage}MB
                          </span>
                        </div>
                        {group.dependencies.length > 0 && (
                          <span>Dependencies: {group.dependencies.length}</span>
                        )}
                      </div>
                    </div>

                    {/* Expanded View */}
                    <AnimatePresence>
                      {selectedGroup === group.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 pt-4 border-t space-y-3"
                        >
                          <h4 className="text-sm font-medium">Nodes in this group:</h4>
                          <div className="grid grid-cols-1 gap-2">
                            {nodes
                              .filter(node => node.groupId === group.id)
                              .map(node => (
                                <div
                                  key={node.nodeId}
                                  className="flex items-center justify-between p-2 bg-white rounded border"
                                >
                                  <div className="flex items-center space-x-2">
                                    {getStatusIcon(node.status)}
                                    <span className="text-sm font-medium">{node.nodeLabel}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {node.nodeType}
                                    </Badge>
                                    {node.isBlocking && (
                                      <Badge variant="destructive" className="text-xs">
                                        Blocking
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs">{Math.round(node.progress)}%</span>
                                    {node.duration && (
                                      <span className="text-xs text-muted-foreground">
                                        {formatDuration(node.duration)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                          </div>

                          {Object.keys(group.sharedData).length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2">Shared Data:</h4>
                              <div className="bg-gray-100 rounded p-2 text-xs">
                                <pre>{JSON.stringify(group.sharedData, null, 2)}</pre>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dependency Graph & Stats */}
        <div className="space-y-4">
          {/* Dependency Flow */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dependency Flow</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {groups.map((group, index) => (
                  <div key={group.id} className="flex items-center space-x-2">
                    <div className="flex-1">
                      <div className={`w-full h-8 rounded flex items-center px-3 text-xs font-medium ${
                        getStatusColor(group.status)
                      }`}>
                        <span className="truncate">{group.name}</span>
                      </div>
                    </div>
                    {index < groups.length - 1 && (
                      <ArrowDown className="w-3 h-3 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Real-time Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Performance Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Memory Usage</span>
                  <span className="text-sm font-medium">{totalMemoryUsage}MB</span>
                </div>
                <Progress value={(totalMemoryUsage / 1000) * 100} className="w-full" />

                <div className="flex items-center justify-between">
                  <span className="text-sm">Average CPU</span>
                  <span className="text-sm font-medium">{Math.round(avgCpuUsage)}%</span>
                </div>
                <Progress value={avgCpuUsage} className="w-full" />

                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Parallel Efficiency</span>
                    <span className="font-medium">
                      {Math.round((runningGroups / groups.length) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Nodes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Active Nodes</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-40">
                <div className="space-y-2">
                  {nodes
                    .filter(node => node.status === 'running')
                    .map(node => (
                      <div key={node.nodeId} className="flex items-center space-x-2 p-2 bg-blue-50 rounded">
                        <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{node.nodeLabel}</p>
                          <p className="text-xs text-muted-foreground">
                            {Math.round(node.progress)}% • {node.memoryUsage}MB
                          </p>
                        </div>
                      </div>
                    ))}
                  
                  {nodes.filter(node => node.status === 'running').length === 0 && (
                    <div className="text-center py-4 text-xs text-muted-foreground">
                      No nodes currently running
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}