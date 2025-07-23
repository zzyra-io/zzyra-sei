"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  useExecutionWebSocket,
  NodeExecutionUpdate,
} from "./use-execution-websocket";

export interface RealTimeExecutionNode {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  progress?: number;
  duration?: number;
  error?: string;
  output?: any;
  logs: Array<{
    level: "info" | "warn" | "error";
    message: string;
    timestamp: string;
  }>;
  startTime?: Date;
  endTime?: Date;
}

export interface RealTimeExecutionState {
  executionId: string;
  workflowId: string;
  status:
    | "idle"
    | "starting"
    | "running"
    | "completed"
    | "failed"
    | "cancelled";
  nodes: Map<string, RealTimeExecutionNode>;
  currentNode?: string;
  totalProgress: number;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  isLive: boolean;
  connectionStatus: "connected" | "disconnected" | "connecting" | "error";
}

export interface UseRealTimeExecutionProps {
  executionId?: string;
  workflowId?: string;
  autoConnect?: boolean;
}

export function useRealTimeExecution({
  executionId,
  workflowId,
  autoConnect = true,
}: UseRealTimeExecutionProps = {}) {
  const [executionState, setExecutionState] = useState<RealTimeExecutionState>({
    executionId: executionId || "",
    workflowId: workflowId || "",
    status: "idle",
    nodes: new Map(),
    totalProgress: 0,
    isLive: false,
    connectionStatus: "disconnected",
  });

  const executionRef = useRef(executionState);
  executionRef.current = executionState;

  // Handle node updates from WebSocket
  const handleNodeUpdate = useCallback((update: NodeExecutionUpdate) => {
    setExecutionState((prev) => {
      const newNodes = new Map(prev.nodes);

      // Get or create node state
      const existingNode = newNodes.get(update.nodeId) || {
        id: update.nodeId,
        status: "pending",
        logs: [],
      };

      // Update node state
      const updatedNode: RealTimeExecutionNode = {
        ...existingNode,
        status: update.status,
        progress: update.progress,
        duration: update.duration,
        error: update.error,
        output: update.output,
        startTime: update.startTime,
        endTime: update.endTime,
        logs: [
          ...existingNode.logs,
          {
            level: update.status === "failed" ? "error" : "info",
            message: `Node ${update.status}${update.error ? `: ${update.error}` : ""}`,
            timestamp: new Date().toISOString(),
          },
        ],
      };

      newNodes.set(update.nodeId, updatedNode);

      // Calculate overall progress
      const nodeArray = Array.from(newNodes.values());
      const completedNodes = nodeArray.filter(
        (node) => node.status === "completed" || node.status === "failed"
      ).length;
      const totalProgress =
        nodeArray.length > 0 ? (completedNodes / nodeArray.length) * 100 : 0;

      // Update execution status
      let newStatus = prev.status;
      let currentNode = prev.currentNode;
      let endTime = prev.endTime;

      if (update.status === "running") {
        newStatus = "running";
        currentNode = update.nodeId;
      } else if (update.status === "failed") {
        newStatus = "failed";
        endTime = new Date();
      } else if (
        update.status === "completed" &&
        completedNodes === nodeArray.length
      ) {
        newStatus = "completed";
        endTime = new Date();
      }

      return {
        ...prev,
        nodes: newNodes,
        status: newStatus,
        currentNode,
        totalProgress,
        endTime,
        duration:
          prev.startTime && endTime
            ? endTime.getTime() - prev.startTime.getTime()
            : prev.duration,
        isLive: true,
      };
    });
  }, []);

  // Handle execution events
  const handleExecutionComplete = useCallback((data: any) => {
    setExecutionState((prev) => ({
      ...prev,
      status: "completed",
      endTime: new Date(),
      duration: data.duration,
      totalProgress: 100,
    }));
  }, []);

  const handleExecutionFailed = useCallback((data: any) => {
    setExecutionState((prev) => ({
      ...prev,
      status: "failed",
      endTime: new Date(),
      duration: data.duration,
    }));
  }, []);

  const handleExecutionLog = useCallback((log: any) => {
    if (log.nodeId) {
      setExecutionState((prev) => {
        const newNodes = new Map(prev.nodes);
        const node = newNodes.get(log.nodeId);

        if (node) {
          const updatedNode = {
            ...node,
            logs: [
              ...node.logs,
              {
                level: log.level,
                message: log.message,
                timestamp: log.timestamp.toISOString(),
              },
            ],
          };
          newNodes.set(log.nodeId, updatedNode);

          return {
            ...prev,
            nodes: newNodes,
          };
        }

        return prev;
      });
    }
  }, []);

  // WebSocket connection
  const { isConnected, connectionError, reconnect } = useExecutionWebSocket({
    executionId: autoConnect ? executionId : undefined,
    onNodeUpdate: handleNodeUpdate,
    onExecutionComplete: handleExecutionComplete,
    onExecutionFailed: handleExecutionFailed,
    onExecutionLog: handleExecutionLog,
  });

  // Update connection status
  useEffect(() => {
    setExecutionState((prev) => ({
      ...prev,
      connectionStatus: connectionError
        ? "error"
        : isConnected
          ? "connected"
          : "disconnected",
    }));
  }, [isConnected, connectionError]);

  // Start execution tracking
  const startExecution = useCallback(
    (newExecutionId: string, newWorkflowId?: string) => {
      setExecutionState((prev) => ({
        ...prev,
        executionId: newExecutionId,
        workflowId: newWorkflowId || prev.workflowId,
        status: "starting",
        nodes: new Map(),
        currentNode: undefined,
        totalProgress: 0,
        startTime: new Date(),
        endTime: undefined,
        duration: undefined,
        isLive: true,
      }));
    },
    []
  );

  // Stop execution tracking
  const stopExecution = useCallback(() => {
    setExecutionState((prev) => ({
      ...prev,
      status: "failed",
      endTime: new Date(),
      isLive: false,
      duration: prev.startTime
        ? new Date().getTime() - prev.startTime.getTime()
        : prev.duration,
    }));
  }, []);

  // Reset execution state
  const resetExecution = useCallback(() => {
    setExecutionState((prev) => ({
      ...prev,
      status: "idle",
      nodes: new Map(),
      currentNode: undefined,
      totalProgress: 0,
      startTime: undefined,
      endTime: undefined,
      duration: undefined,
      isLive: false,
    }));
  }, []);

  // Get node state
  const getNodeState = useCallback(
    (nodeId: string): RealTimeExecutionNode | undefined => {
      return executionRef.current.nodes.get(nodeId);
    },
    []
  );

  // Update node data (for manual updates when not using WebSocket)
  const updateNodeState = useCallback(
    (nodeId: string, update: Partial<RealTimeExecutionNode>) => {
      setExecutionState((prev) => {
        const newNodes = new Map(prev.nodes);
        const existingNode = newNodes.get(nodeId) || {
          id: nodeId,
          status: "pending" as const,
          logs: [],
        };

        const updatedNode = {
          ...existingNode,
          ...update,
        };

        newNodes.set(nodeId, updatedNode);

        return {
          ...prev,
          nodes: newNodes,
        };
      });
    },
    []
  );

  return {
    // State
    executionState,

    // Node operations
    getNodeState,
    updateNodeState,

    // Execution operations
    startExecution,
    stopExecution,
    resetExecution,

    // Connection
    isConnected,
    connectionError,
    reconnect,

    // Computed values
    isExecuting:
      executionState.status === "running" ||
      executionState.status === "starting",
    isCompleted: executionState.status === "completed",
    isFailed: executionState.status === "failed",
    progress: executionState.totalProgress,

    // Helper functions
    getExecutionDuration: () => {
      if (executionState.duration) return executionState.duration;
      if (executionState.startTime) {
        const endTime = executionState.endTime || new Date();
        return endTime.getTime() - executionState.startTime.getTime();
      }
      return 0;
    },

    getCompletedNodes: () => {
      return Array.from(executionState.nodes.values()).filter(
        (node) => node.status === "completed"
      ).length;
    },

    getFailedNodes: () => {
      return Array.from(executionState.nodes.values()).filter(
        (node) => node.status === "failed"
      ).length;
    },

    getTotalNodes: () => {
      return executionState.nodes.size;
    },
  };
}
