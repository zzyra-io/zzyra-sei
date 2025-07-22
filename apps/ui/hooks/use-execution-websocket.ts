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

  useEffect(() => {
    if (!executionId) return;

    const workerUrl = config.workerUrl;

    // Check if worker URL is available - allow localhost for development
    if (!workerUrl) {
      console.warn("Worker URL not configured, skipping WebSocket connection");
      setConnectionError("Worker service not available");
      return;
    }

    // Create socket connection to execution namespace with fallback
    const socketUrl = workerUrl || "ws://localhost:3005";
    const socket = io(`${socketUrl}/execution`, {
      transports: ["websocket", "polling"],
      timeout: 10000, // Increased timeout for better reliability
      retries: 3, // Increased retries
      forceNew: true, // Force new connection for each execution
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on("connect", () => {
      console.log("WebSocket connected for execution monitoring");
      setIsConnected(true);
      setConnectionError(null);

      // Subscribe to execution updates
      socket.emit("subscribe_execution", { executionId });
    });

    socket.on("disconnect", (reason) => {
      console.log("WebSocket disconnected:", reason);
      setIsConnected(false);
      if (reason === "io server disconnect") {
        // Server disconnected, try to reconnect
        socket.connect();
      }
    });

    socket.on("connect_error", (error) => {
      console.error("WebSocket connection error:", error);
      setConnectionError(`Connection failed: ${error.message}`);
      setIsConnected(false);

      // Try to reconnect after a delay
      setTimeout(() => {
        if (socketRef.current && !socketRef.current.connected) {
          console.log("Attempting to reconnect...");
          socketRef.current.connect();
        }
      }, 3000);
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
      socketRef.current.connect();
    }
  };

  return {
    isConnected,
    connectionError,
    reconnect,
  };
}
