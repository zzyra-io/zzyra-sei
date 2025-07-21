"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useRealTimeExecution, RealTimeExecutionState, RealTimeExecutionNode } from '@/hooks/useRealTimeExecution';
import RealTimeExecutionMonitor from './RealTimeExecutionMonitor';

interface LiveWorkflowContextType {
  executionState: RealTimeExecutionState;
  startExecution: (executionId: string, workflowId?: string) => void;
  stopExecution: () => void;
  resetExecution: () => void;
  getNodeState: (nodeId: string) => RealTimeExecutionNode | undefined;
  updateNodeState: (nodeId: string, update: Partial<RealTimeExecutionNode>) => void;
  isConnected: boolean;
  connectionError: string | null;
  showMonitor: boolean;
  setShowMonitor: (show: boolean) => void;
}

const LiveWorkflowContext = createContext<LiveWorkflowContextType | null>(null);

export function useLiveWorkflow() {
  const context = useContext(LiveWorkflowContext);
  if (!context) {
    throw new Error('useLiveWorkflow must be used within a LiveWorkflowProvider');
  }
  return context;
}

// Optional hook that doesn't throw error if provider is missing
export function useLiveWorkflowOptional() {
  const context = useContext(LiveWorkflowContext);
  return context;
}

interface LiveWorkflowProviderProps {
  children: React.ReactNode;
  workflowId?: string;
  autoShowMonitor?: boolean;
}

export default function LiveWorkflowProvider({ 
  children, 
  workflowId,
  autoShowMonitor = true 
}: LiveWorkflowProviderProps) {
  const [showMonitor, setShowMonitor] = useState(false);
  const [nodeUpdateCallbacks, setNodeUpdateCallbacks] = useState<Map<string, (node: RealTimeExecutionNode) => void>>(new Map());

  const {
    executionState,
    getNodeState,
    updateNodeState: baseUpdateNodeState,
    startExecution: baseStartExecution,
    stopExecution,
    resetExecution,
    isConnected,
    connectionError,
    isExecuting
  } = useRealTimeExecution({
    workflowId,
    autoConnect: false
  });

  // Enhanced node state update that triggers callbacks
  const updateNodeState = useCallback((nodeId: string, update: Partial<RealTimeExecutionNode>) => {
    baseUpdateNodeState(nodeId, update);
    
    // Get the updated node state and trigger callbacks
    const updatedNode = executionState.nodes.get(nodeId);
    if (updatedNode) {
      const callback = nodeUpdateCallbacks.get(nodeId);
      callback?.(updatedNode);
    }
  }, [baseUpdateNodeState, executionState.nodes, nodeUpdateCallbacks]);

  // Start execution with auto-show monitor
  const startExecution = useCallback((executionId: string, newWorkflowId?: string) => {
    baseStartExecution(executionId, newWorkflowId);
    if (autoShowMonitor) {
      setShowMonitor(true);
    }
  }, [baseStartExecution, autoShowMonitor]);

  // Auto-hide monitor when execution completes
  useEffect(() => {
    if ((executionState.status === 'completed' || executionState.status === 'failed') && showMonitor && autoShowMonitor) {
      // Auto-hide after 5 seconds
      const timer = setTimeout(() => {
        setShowMonitor(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [executionState.status, showMonitor, autoShowMonitor]);

  // Register node update callback
  const registerNodeCallback = useCallback((nodeId: string, callback: (node: RealTimeExecutionNode) => void) => {
    setNodeUpdateCallbacks(prev => {
      const newCallbacks = new Map(prev);
      newCallbacks.set(nodeId, callback);
      return newCallbacks;
    });

    // Return cleanup function
    return () => {
      setNodeUpdateCallbacks(prev => {
        const newCallbacks = new Map(prev);
        newCallbacks.delete(nodeId);
        return newCallbacks;
      });
    };
  }, []);

  // Handle node updates from real-time execution monitor
  const handleNodeUpdate = useCallback((nodeId: string, update: any) => {
    const callback = nodeUpdateCallbacks.get(nodeId);
    const nodeState = executionState.nodes.get(nodeId);
    if (callback && nodeState) {
      callback(nodeState);
    }
  }, [nodeUpdateCallbacks, executionState.nodes]);

  // Handle edge updates for visual flow animations
  const handleEdgeUpdate = useCallback((edgeId: string, update: any) => {
    // This can be used to trigger edge animations in the React Flow component
    // For now, we'll just log it
    console.log('Edge update:', edgeId, update);
  }, []);

  const contextValue: LiveWorkflowContextType = {
    executionState,
    startExecution,
    stopExecution,
    resetExecution,
    getNodeState,
    updateNodeState,
    isConnected,
    connectionError,
    showMonitor,
    setShowMonitor
  };

  return (
    <LiveWorkflowContext.Provider value={contextValue}>
      {children}
      
      {/* Real-time execution monitor */}
      {showMonitor && executionState.executionId && (
        <RealTimeExecutionMonitor
          executionId={executionState.executionId}
          workflowId={executionState.workflowId}
          onNodeUpdate={handleNodeUpdate}
          onEdgeUpdate={handleEdgeUpdate}
        />
      )}
    </LiveWorkflowContext.Provider>
  );
}

// Hook for individual nodes to register for real-time updates
export function useLiveNode(nodeId: string) {
  const context = useLiveWorkflowOptional();
  
  // Return null values if provider is not available
  if (!context) {
    return {
      nodeState: undefined,
      isLive: false,
      isConnected: false,
      
      // No-op actions
      updateStatus: () => {},
      addLog: () => {},
      updateProgress: () => {},
      setOutput: () => {},
      setError: () => {},
      
      // Computed values
      isRunning: false,
      isCompleted: false,
      isFailed: false,
      isPending: true,
    };
  }

  const { getNodeState, updateNodeState, executionState } = context;
  const [nodeState, setNodeState] = useState<RealTimeExecutionNode | undefined>();

  // Update local state when execution state changes
  useEffect(() => {
    const currentNodeState = getNodeState(nodeId);
    setNodeState(currentNodeState);
  }, [nodeId, getNodeState, executionState.nodes]);

  // Helper functions for common node operations
  const updateStatus = useCallback((status: RealTimeExecutionNode['status'], extra?: Partial<RealTimeExecutionNode>) => {
    const update: Partial<RealTimeExecutionNode> = {
      status,
      ...extra
    };

    if (status === 'running') {
      update.startTime = new Date();
    } else if (status === 'completed' || status === 'failed') {
      update.endTime = new Date();
      if (nodeState?.startTime) {
        update.duration = new Date().getTime() - nodeState.startTime.getTime();
      }
    }

    updateNodeState(nodeId, update);
  }, [nodeId, updateNodeState, nodeState]);

  const addLog = useCallback((level: 'info' | 'warn' | 'error', message: string) => {
    const currentNode = getNodeState(nodeId);
    const newLog = {
      level,
      message,
      timestamp: new Date().toISOString()
    };

    updateNodeState(nodeId, {
      logs: [...(currentNode?.logs || []), newLog]
    });
  }, [nodeId, getNodeState, updateNodeState]);

  const updateProgress = useCallback((progress: number) => {
    updateNodeState(nodeId, { progress });
  }, [nodeId, updateNodeState]);

  return {
    nodeState,
    isLive: executionState.isLive && executionState.executionId !== '',
    isConnected: executionState.connectionStatus === 'connected',
    
    // Actions
    updateStatus,
    addLog,
    updateProgress,
    setOutput: (output: any) => updateNodeState(nodeId, { output }),
    setError: (error: string) => updateNodeState(nodeId, { error }),
    
    // Computed values
    isRunning: nodeState?.status === 'running',
    isCompleted: nodeState?.status === 'completed',
    isFailed: nodeState?.status === 'failed',
    isPending: nodeState?.status === 'pending' || !nodeState,
  };
}