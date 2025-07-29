"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { config } from "@/lib/config";

export interface NodeExecutionUpdate {
  executionId: string;
  nodeId: string;
  status: "pending" | "running" | "completed" | "failed";
  output?: any;
  error?: string;
  duration?: number;
  nodeType?: string;
  nodeLabel?: string;
  startTime?: Date;
  endTime?: Date;
  progress?: number;
}

export interface EdgeFlowUpdate {
  executionId: string;
  edgeId: string;
  sourceNodeId: string;
  targetNodeId: string;
  status: "flowing" | "completed";
  data?: any;
  timestamp: Date;
}

export interface ExecutionMetrics {
  executionId: string;
  memoryUsage: number;
  cpuUsage: number;
  networkRequests: number;
  totalDuration: number;
  nodeMetrics: Record<
    string,
    {
      duration: number;
      memoryDelta: number;
      outputSize: number;
    }
  >;
}

export interface ExecutionLog {
  id: string;
  timestamp: Date;
  level: "info" | "warn" | "error" | "debug";
  message: string;
  nodeId?: string;
  metadata?: Record<string, any>;
}

interface UseExecutionWebSocketProps {
  executionId?: string;
  onNodeUpdate?: (update: NodeExecutionUpdate) => void;
  onEdgeFlow?: (update: EdgeFlowUpdate) => void;
  onExecutionComplete?: (data: {
    executionId: string;
    results?: any;
    duration: number;
  }) => void;
  onExecutionFailed?: (data: {
    executionId: string;
    error: string;
    duration: number;
  }) => void;
  onExecutionLog?: (log: ExecutionLog) => void;
  onMetricsUpdate?: (metrics: ExecutionMetrics) => void;
}

export function useExecutionWebSocket({
  executionId,
  onNodeUpdate,
  onEdgeFlow,
  onExecutionComplete,
  onExecutionFailed,
  onExecutionLog,
  onMetricsUpdate,
}: UseExecutionWebSocketProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;

  useEffect(() => {
    if (!executionId) {
      return;
    }

    // Clear any existing reconnection attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Reset reconnection attempts for new execution
    reconnectAttemptsRef.current = 0;

    const socket = io(process.env.NEXT_PUBLIC_WORKER_WS_URL || "ws://localhost:3001", {
      transports: ["websocket"],
      timeout: 5000,
      forceNew: true,
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on("connect", () => {
      console.log("WebSocket connected for execution monitoring");
      setIsConnected(true);
      setConnectionError(null);
      reconnectAttemptsRef.current = 0; // Reset attempts on successful connection

      // Subscribe to execution updates
      socket.emit("subscribe_execution", { executionId });
    });

    socket.on("disconnect", (reason) => {
      console.log("WebSocket disconnected:", reason);
      setIsConnected(false);
      
      // Only attempt reconnection if we haven't exceeded max attempts
      if (reason === "io server disconnect" && reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++;
        console.log(`Attempting reconnection ${reconnectAttemptsRef.current}/${maxReconnectAttempts}`);
        
        // Add delay before reconnecting to prevent rapid reconnection loops
        reconnectTimeoutRef.current = setTimeout(() => {
          if (socketRef.current) {
            socketRef.current.connect();
          }
        }, 1000 * reconnectAttemptsRef.current); // Exponential backoff
      } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
        console.log("Max reconnection attempts reached");
        setConnectionError("Connection lost after multiple reconnection attempts");
      }
    });

    socket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);

      // In development, don't show error if worker isn't running
      if (
        process.env.NODE_ENV === "development" &&
        error.message.includes("ECONNREFUSED")
      ) {
        console.warn("Worker service not running in development mode");
        setConnectionError("Worker service not running in development mode");
      } else {
        setConnectionError(`Connection failed: ${error.message}`);
      }

      setIsConnected(false);
    });

    socket.on("connect_timeout", () => {
      console.error("WebSocket connection timeout");
      setConnectionError("Connection timeout");
      setIsConnected(false);
    });

    // Execution event handlers
    socket.on("execution_started", (data) => {
      console.log("Execution started:", data);
    });

    socket.on("node_execution_update", (update: NodeExecutionUpdate) => {
      console.log("Node execution update:", update);
      onNodeUpdate?.(update);
    });

    socket.on("edge_flow_update", (update: EdgeFlowUpdate) => {
      console.log("Edge flow update:", update);
      onEdgeFlow?.(update);
    });

    socket.on("execution_completed", (data) => {
      console.log("Execution completed:", data);
      onExecutionComplete?.(data);
    });

    socket.on("execution_failed", (data) => {
      console.log("Execution failed:", data);
      onExecutionFailed?.(data);
    });

    socket.on("execution_log", (log: ExecutionLog) => {
      console.log("Execution log:", log);
      onExecutionLog?.(log);
    });

    socket.on("execution_metrics_update", (metrics: ExecutionMetrics) => {
      console.log("Execution metrics update:", metrics);
      onMetricsUpdate?.(metrics);
    });

    socket.on("execution_metrics", (metrics: ExecutionMetrics) => {
      console.log("Final execution metrics:", metrics);
      onMetricsUpdate?.(metrics);
    });

    socket.on("error", (error) => {
      console.error("WebSocket error:", error);
      setConnectionError(error.message);
    });

    // Cleanup on unmount or executionId change
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (socket) {
        socket.emit("unsubscribe_execution", { executionId });
        socket.disconnect();
      }
      socketRef.current = null;
    };
  }, [
    executionId,
    onNodeUpdate,
    onEdgeFlow,
    onExecutionComplete,
    onExecutionFailed,
    onExecutionLog,
    onMetricsUpdate,
  ]);

  // Method to manually reconnect
  const reconnect = () => {
    if (socketRef.current) {
      reconnectAttemptsRef.current = 0; // Reset attempts for manual reconnection
      socketRef.current.connect();
    }
  };

  return {
    isConnected,
    connectionError,
    reconnect,
  };
}
