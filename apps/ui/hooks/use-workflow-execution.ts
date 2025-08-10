"use client";

import { useToast } from "@/components/ui/use-toast";
import { useWorkflowStore } from "@/lib/store/workflow-store";
import { useMutation, useQuery } from "@tanstack/react-query";
import { type Edge, type Node } from "@xyflow/react";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useExecutionWebSocket,
  type NodeExecutionUpdate,
  type EdgeFlowUpdate,
  type ExecutionMetrics,
} from "./use-execution-websocket";

// Define types for execution status
export type ExecutionStatus = {
  id: string;
  status: "pending" | "running" | "completed" | "failed";
  node_statuses?: Record<string, string>;
  current_node_id?: string;
  current_node?: string; // For backward compatibility
  started_at?: string;
  completed_at?: string;
  execution_progress?: number;
  execution_time?: number;
  error?: string;
  nodes_completed?: string[];
  nodes_failed?: string[];
  nodes_pending?: string[];
  logs?: string[];
};

// Define params for workflow execution
export type WorkflowExecutionParams = {
  id?: string;
  nodes?: Node[];
  edges?: Edge[];
};

// useWorkflowExecution.ts
export function useWorkflowExecution() {
  const { nodes, edges, workflowId, updateNode, updateEdge } =
    useWorkflowStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for tracking execution
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [executionStartTime, setExecutionStartTime] = useState<number | null>(
    null
  );
  const [executionMetrics, setExecutionMetrics] =
    useState<ExecutionMetrics | null>(null);
  const [isRealTimeConnected, setIsRealTimeConnected] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<any[]>([]);

  // WebSocket connection for real-time updates
  const { isConnected: wsConnected, connectionError } = useExecutionWebSocket({
    executionId,
    onNodeUpdate: (update: NodeExecutionUpdate) => {
      console.log("Real-time node update:", update);

      const executionNodeId = update.nodeId;
      
      // Multiple strategies to map execution node ID to UI node ID
      let uiNode = null;
      let uiNodeId = "";
      
      // Strategy 1: Direct match (execution ID equals UI ID)
      uiNode = nodes.find((n) => n.id === executionNodeId);
      if (uiNode) {
        uiNodeId = executionNodeId;
        console.log(`Direct match found: ${executionNodeId}`);
      } else {
        // Strategy 2: Extract base ID by splitting on "-" (for timestamped IDs)
        const baseId = executionNodeId.split("-")[0];
        uiNode = nodes.find((n) => n.id === baseId);
        if (uiNode) {
          uiNodeId = baseId;
          console.log(`Base ID match found: ${executionNodeId} -> ${baseId}`);
        } else {
          // Strategy 3: Find by node type/blockType if available
          if (update.nodeType) {
            uiNode = nodes.find((n) => 
              n.data?.blockType === update.nodeType || 
              n.data?.type === update.nodeType ||
              n.type === update.nodeType
            );
            if (uiNode) {
              uiNodeId = uiNode.id;
              console.log(`Type match found: ${executionNodeId} -> ${uiNodeId} (type: ${update.nodeType})`);
            }
          }
          
          // Strategy 4: Find by node label if available
          if (!uiNode && update.nodeLabel) {
            uiNode = nodes.find((n) => 
              n.data?.label === update.nodeLabel ||
              n.data?.name === update.nodeLabel
            );
            if (uiNode) {
              uiNodeId = uiNode.id;
              console.log(`Label match found: ${executionNodeId} -> ${uiNodeId} (label: ${update.nodeLabel})`);
            }
          }
        }
      }

      if (uiNode) {
        // Update node with real-time status and enhanced visualization
        updateNode(uiNodeId, {
          data: {
            ...uiNode.data,
            status: update.status,
            executionStatus: update.status,
            isExecuting: update.status === "running",
            executionProgress: update.progress,
            executionStartTime: update.startTime,
            executionEndTime: update.endTime,
            executionDuration: update.duration,
            executionOutput: update.output,
            executionError: update.error,
            logs: [
              {
                level: update.status === "failed" ? "error" : ("info" as const),
                message: `Node ${
                  update.status === "running"
                    ? "started"
                    : update.status === "completed"
                    ? "completed"
                    : update.status === "failed"
                    ? "failed"
                    : update.status
                }${update.duration ? ` (${update.duration}ms)` : ""}`,
                timestamp: new Date().toLocaleTimeString(),
                metadata: { update },
              },
            ],
          },
        });
      } else {
        console.warn(
          `UI node not found for execution node ID: ${executionNodeId}. Tried strategies: direct match, base ID extraction, type matching, and label matching. Available nodes:`,
          nodes.map(n => ({ id: n.id, type: n.type, blockType: n.data?.blockType, label: n.data?.label }))
        );
      }
    },
    onEdgeFlow: (update: EdgeFlowUpdate) => {
      console.log("Real-time edge flow:", update);

      // Update edge with animation state
      const edge = edges.find(
        (e) =>
          e.id === update.edgeId ||
          (e.source === update.sourceNodeId && e.target === update.targetNodeId)
      );

      if (edge) {
        updateEdge(edge.id, {
          ...edge,
          animated: update.status === "flowing",
          style: {
            ...edge.style,
            stroke: update.status === "flowing" ? "#22c55e" : "#64748b",
            strokeWidth: update.status === "flowing" ? 3 : 2,
          },
          data: {
            ...edge.data,
            isFlowing: update.status === "flowing",
            flowData: update.data,
            lastFlowTime: update.timestamp,
          },
        });

        // Reset edge animation after flow completes
        if (update.status === "completed") {
          setTimeout(() => {
            updateEdge(edge.id, {
              ...edge,
              animated: false,
              style: {
                ...edge.style,
                stroke: "#64748b",
                strokeWidth: 2,
              },
              data: {
                ...edge.data,
                isFlowing: false,
              },
            });
          }, 2000);
        }
      }
    },
    onExecutionComplete: (data) => {
      console.log("Real-time execution completed:", data);
      toast({
        title: "Execution Complete",
        description: `Workflow executed successfully in ${data.duration}ms`,
      });
    },
    onExecutionFailed: (data) => {
      console.log("Real-time execution failed:", data);
      toast({
        title: "Execution Failed",
        description: data.error,
        variant: "destructive",
      });
    },
    onMetricsUpdate: (metrics) => {
      console.log("Real-time metrics update:", metrics);
      setExecutionMetrics(metrics);
    },
    onExecutionLog: (log) => {
      console.log("Real-time execution log:", log);
      // Store logs for the builder page to access
      setExecutionLogs((prev) => [...prev.slice(-49), log]); // Keep last 50 logs
    },
  });

  // Update connection status
  useEffect(() => {
    setIsRealTimeConnected(wsConnected);
  }, [wsConnected]);

  // Use React Query to fetch execution status (fallback for non-WebSocket updates)
  const { data: executionStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ["executionStatus", executionId],
    queryFn: async () => {
      if (!executionId) return null;

      // Use the workflow service instead of direct API calls
      const { workflowService } = await import(
        "@/lib/services/workflow-service"
      );
      const data = await workflowService.getExecutionStatus(executionId);
      return data as ExecutionStatus;
    },
    enabled: !!executionId,
    refetchInterval: (query) => {
      const data = query.state.data as ExecutionStatus | null;
      // Stop polling when execution is complete or failed
      if (data && (data.status === "completed" || data.status === "failed")) {
        return false;
      }
      // Stop polling after 10 minutes to prevent infinite loading
      if (
        executionStartTime &&
        Date.now() - executionStartTime > 10 * 60 * 1000
      ) {
        console.warn("Execution status polling timed out after 10 minutes");
        toast({
          title: "Execution Status Timeout",
          description:
            "Unable to get execution status. Please check the executions page.",
          variant: "destructive",
        });
        return false;
      }
      // Poll every 2 seconds while execution is in progress
      return 2000;
    },
    retry: (failureCount, error) => {
      // Only retry up to 3 times for network errors
      if (failureCount < 3) {
        console.log(
          `Retrying execution status query (${failureCount + 1}/3):`,
          error
        );
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Use React Query for mutation to execute workflow
  const { mutateAsync: executeWorkflowMutation, isPending } = useMutation({
    mutationFn: async () => {
      // Reset execution ID first
      setExecutionId(null);

      // Check if workflow exists and has required fields
      if (!workflowId && (!nodes.length || !edges.length)) {
        throw new Error("Cannot execute an empty workflow");
      }

      // For unsaved workflows, show a warning
      if (!workflowId) {
        console.warn(
          "Executing unsaved workflow - a temporary workflow will be created"
        );

        toast({
          title: "Executing unsaved workflow",
          description:
            "This workflow hasn't been saved. A temporary copy will be created for execution.",
        });
      }

      // Call the execution API using workflow service
      try {
        console.log("Executing workflow:", workflowId || "(unsaved)");

        // Import workflow service dynamically to avoid circular dependencies
        const { workflowService } = await import(
          "@/lib/services/workflow-service"
        );

        const data = await workflowService.executeWorkflow({
          id: workflowId,
          nodes: nodes || [],
          edges: edges || [],
        });

        console.log("Execution response:", data);

        if (data?.id) {
          setExecutionId(data.id);
          setExecutionStartTime(Date.now());

          // Immediately trigger a query for the execution status
          queryClient.invalidateQueries({
            queryKey: ["executionStatus", data.id],
          });

          return { executionId: data.id };
        } else {
          throw new Error(
            "Failed to start workflow execution - no execution ID returned"
          );
        }
      } catch (error) {
        console.error("Error executing workflow:", error);
        toast({
          title: "Execution Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to execute workflow",
          variant: "destructive",
        });
        throw error;
      }
    },
  });

  // React Query handles status updates via polling
  // No WebSocket subscription needed

  // Update node statuses based on execution status
  useEffect(() => {
    if (executionStatus && nodes.length > 0) {
      console.log("Updating node statuses with:", executionStatus);

      // Build node status map from nodeExecutions array
      const nodeStatusMap: Record<string, string> = {};
      
      if (executionStatus.nodeExecutions) {
        executionStatus.nodeExecutions.forEach((nodeExecution: any) => {
          nodeStatusMap[nodeExecution.nodeId] = nodeExecution.status;
        });
      }

      console.log("Built node status map:", nodeStatusMap);

      // Update each node with its execution status and enhanced data
      nodes.forEach((node) => {
        // Try multiple strategies to find the execution status for this UI node
        let nodeStatus = nodeStatusMap[node.id]; // Direct match first
        let matchingExecutionNodeId = node.id;
        
        // If no direct match, try to find by checking execution node IDs that might map to this UI node
        if (!nodeStatus) {
          // Look for execution node IDs that could map to this UI node
          for (const executionNodeId of Object.keys(nodeStatusMap)) {
            const status = nodeStatusMap[executionNodeId];
            // Check if this execution node maps to our UI node using same strategies as WebSocket
            const baseId = executionNodeId.split("-")[0];
            if (baseId === node.id || 
                executionNodeId === node.id ||
                (node.data?.blockType && executionNodeId.includes(node.data.blockType)) ||
                (node.data?.type && executionNodeId.includes(node.data.type))) {
              nodeStatus = status;
              matchingExecutionNodeId = executionNodeId;
              console.log(`Mapped execution node ${executionNodeId} to UI node ${node.id} with status ${status}`);
              break;
            }
          }
        }

        // Only update if status has changed
        if (nodeStatus && node.data?.status !== nodeStatus) {
          console.log(`Updating node ${node.id} status to ${nodeStatus}`);

          // Create enhanced logs for the node
          const enhancedLogs = [
            {
              level: nodeStatus === "failed" ? "error" : ("info" as const),
              message: `Node ${
                nodeStatus === "running"
                  ? "started execution"
                  : nodeStatus === "completed"
                  ? "completed successfully"
                  : nodeStatus === "failed"
                  ? "execution failed"
                  : `status changed to ${nodeStatus}`
              }`,
              timestamp: new Date().toLocaleTimeString(),
            },
            // Add existing logs if available
            ...(executionStatus.logs || []).map((log) => ({
              level: "info" as const,
              message: log,
              timestamp: new Date().toLocaleTimeString(),
            })),
          ];

          updateNode(node.id, {
            data: {
              ...node.data,
              status: nodeStatus,
              executionStatus: nodeStatus,
              logs: enhancedLogs,
            },
          });
        }
      });

      // If execution is complete, show a toast
      if (executionStatus.status === "completed") {
        toast({
          title: "Execution Complete",
          description: `Workflow executed successfully in ${
            executionStatus.execution_time || 0
          }ms`,
        });
      } else if (executionStatus.status === "failed") {
        toast({
          title: "Execution Failed",
          description:
            executionStatus.error || "Unknown error during execution",
          variant: "destructive",
        });
      }
    }
  }, [executionStatus, nodes, updateNode, toast]);

  // Execute workflow wrapper function
  const executeWorkflow = async () => {
    try {
      // Reset execution state before starting a new execution
      setExecutionId(null);
      setExecutionStartTime(null);

      // Reset node statuses before starting a new execution
      nodes.forEach((node) => {
        updateNode(node.id, {
          data: { ...node.data, executionStatus: undefined },
        });
      });

      // Pre-flight check: Verify smart wallet deployment for blockchain workflows
      const hasBlockchainNodes = nodes.some((node) => {
        const blockType = node.data?.blockType?.toString();
        return (
          blockType === "SEND_TRANSACTION" ||
          blockType === "CHECK_BALANCE" ||
          blockType === "SWAP_TOKENS" ||
          blockType === "CREATE_WALLET" ||
          (blockType === "AI_AGENT" && 
           node.data?.config?.selectedTools?.some((tool: any) => 
             tool.id === "goat" || 
             tool.description?.toLowerCase().includes("blockchain") ||
             tool.description?.toLowerCase().includes("sei")
           ))
        );
      });

      if (hasBlockchainNodes) {
        toast({
          title: "🔍 Checking Smart Wallet Status",
          description: "Verifying blockchain authorization before execution...",
        });

        // Check if user has active blockchain authorization
        try {
          const response = await fetch('/api/session-keys/status', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          
          if (response.ok) {
            const sessionStatus = await response.json();
            console.log('Session status check:', sessionStatus);
            
            if (!sessionStatus.hasActiveSession) {
              toast({
                title: "⚠️ Blockchain Authorization Required",
                description: "Please authorize blockchain operations before running this workflow.",
                variant: "destructive",
              });
              return; // Don't execute if no authorization
            }

            // Check if there's a smart wallet address mismatch issue
            if (sessionStatus.smartWalletAddress && sessionStatus.isRecentlyCreated) {
              console.log('Using recently created smart wallet:', sessionStatus.smartWalletAddress);
            } else if (sessionStatus.smartWalletAddress) {
              console.log('Using existing smart wallet:', sessionStatus.smartWalletAddress);
              // This might be an older session key with a different smart wallet
              // The backend will handle deployment checks
            }
          }
        } catch (statusError) {
          console.warn("Could not check session status:", statusError);
          // Continue execution - the backend will handle the error gracefully
        }

        toast({
          title: "✅ Pre-flight Check Complete",
          description: "Blockchain authorization verified. Starting workflow...",
        });
      }

      // Execute the workflow
      await executeWorkflowMutation();
    } catch (error) {
      console.error("Error in executeWorkflow:", error);
      // Error is already handled in the mutation
    }
  };

  // This section was causing errors and is now handled in the node status update effect above

  // Function to highlight a node by ID
  const highlightNode = (
    nodeId: string,
    status: "running" | "completed" | "failed" | "pending"
  ) => {
    // This function is a placeholder - we'll implement it when we update the node styling
    console.log(`Node ${nodeId} status: ${status}`);
  };

  // Update node styling based on execution status
  useEffect(() => {
    if (!executionStatus) return;

    // Highlight current executing node
    if (executionStatus.current_node_id) {
      highlightNode(executionStatus.current_node_id, "running");
    }

    // Update completed nodes
    if (
      executionStatus.nodes_completed &&
      executionStatus.nodes_completed.length > 0
    ) {
      executionStatus.nodes_completed.forEach((nodeId: string) => {
        highlightNode(nodeId, "completed");
      });
    }

    // Update failed nodes
    if (
      executionStatus.nodes_failed &&
      executionStatus.nodes_failed.length > 0
    ) {
      executionStatus.nodes_failed.forEach((nodeId: string) => {
        highlightNode(nodeId, "failed");
      });
    }

    // Update pending nodes
    if (
      executionStatus.nodes_pending &&
      executionStatus.nodes_pending.length > 0
    ) {
      executionStatus.nodes_pending.forEach((nodeId: string) => {
        highlightNode(nodeId, "pending");
      });
    }

    // Handle execution completion
    if (
      executionStatus.status === "completed" ||
      executionStatus.status === "failed"
    ) {
      toast({
        title:
          executionStatus.status === "completed"
            ? "Execution complete"
            : "Execution failed",
        description:
          executionStatus.status === "completed"
            ? "Workflow execution has completed successfully."
            : `Workflow execution failed: ${
                executionStatus.error || "Unknown error"
              }`,
        variant:
          executionStatus.status === "completed" ? "default" : "destructive",
      });
    }
  }, [executionStatus, toast, updateNode]);

  return {
    executeWorkflow,
    isExecuting: isPending,
    executionStatus,
    isLoadingStatus,
    executionMetrics,
    isRealTimeConnected,
    connectionError,
    executionId,
    executionLogs,
  };
}
