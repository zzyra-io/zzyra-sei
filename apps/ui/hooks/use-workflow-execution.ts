"use client";

import { useSupabase } from "@/components/auth-provider";
import { useToast } from "@/components/ui/use-toast";
import { workflowService } from "@/lib/services/workflow-service";
import { useWorkflowStore } from "@/lib/store/workflow-store";
import { useMutation } from "@tanstack/react-query";
import { type Edge, type Node } from "@xyflow/react";
import { useEffect, useState } from "react";

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
  const { nodes, edges, workflowId, updateNode } = useWorkflowStore();
  const { toast } = useToast();

  // Supabase client for realtime
  const { supabase } = useSupabase();

  // State for tracking execution
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [executionStatus, setExecutionStatus] =
    useState<ExecutionStatus | null>(null);

  // Use React Query for mutation to execute workflow
  const { mutateAsync: executeWorkflowMutation, isPending } = useMutation({
    mutationFn: async () => {
      // Reset execution status first
      setExecutionId(null);
      setExecutionStatus(null);

      // Check if workflow exists and has required fields
      if (!workflowId) {
        // For unsaved workflows, we can still execute them but with a warning
        console.warn(
          "Executing unsaved workflow - a temporary workflow will be created"
        );

        toast({
          title: "Executing unsaved workflow",
          description:
            "This workflow hasn't been saved. A temporary copy will be created for execution.",
          variant: "warning",
        });
      }

      // For saved workflows, extract necessary workflow structure for execution
      const workflowExecutionData = {
        workflowId: workflowId,
        nodes: nodes.map((node) => ({
          id: node.id,
          type: node.type,
          data: node.data,
          position: node.position,
        })),
        edges: edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          sourceHandle: edge.sourceHandle,
          target: edge.target,
          targetHandle: edge.targetHandle,
        })),
      };

      // Call the execution API
      try {
        console.log("Executing workflow with data:", workflowExecutionData);
        const executionResponse = await workflowService.executeWorkflow(
          workflowExecutionData
        );
        console.log("Execution response:", executionResponse);

        if (executionResponse?.id) {
          setExecutionId(executionResponse.id);

          // Get initial status to display while WebSocket connects
          const initialStatus = await workflowService.getExecutionStatus(
            executionResponse.id
          );

          // Ensure we have a valid status type
          if (initialStatus) {
            const validStatus = [
              "pending",
              "running",
              "completed",
              "failed",
            ].includes(initialStatus.status)
              ? (initialStatus.status as
                  | "pending"
                  | "running"
                  | "completed"
                  | "failed")
              : "running";

            const typedStatus: ExecutionStatus = {
              ...initialStatus,
              status: validStatus,
            };

            setExecutionStatus(typedStatus);
          } else {
            setExecutionStatus(null);
          }

          return executionResponse;
        } else {
          throw new Error("Failed to start workflow execution");
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

  // Subscribe to WebSocket updates when executionId changes
  useEffect(() => {
    if (!executionId || !supabase) return;

    console.log(
      `Setting up WebSocket subscription for execution: ${executionId}`
    );

    // Create a channel for this execution
    const channelName = `execution-${executionId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "workflow_executions",
          filter: `id=eq.${executionId}`,
        },
        (payload) => {
          console.log("Received execution update:", payload);
          if (payload.new) {
            // Define a type for the raw payload data
            interface RawExecutionStatus {
              id: string;
              status: string;
              node_statuses?: Record<string, string>;
              current_node_id?: string;
              current_node?: string;
              started_at?: string;
              completed_at?: string;
              execution_progress?: number;
              execution_time?: number;
              error?: string;
              nodes_completed?: string[];
              nodes_failed?: string[];
              nodes_pending?: string[];
              logs?: string[];
              [key: string]: any; // For any other properties
            }

            // Ensure we have a valid status type
            const newStatus = payload.new as RawExecutionStatus;
            const validStatus = [
              "pending",
              "running",
              "completed",
              "failed",
            ].includes(newStatus.status)
              ? (newStatus.status as
                  | "pending"
                  | "running"
                  | "completed"
                  | "failed")
              : "running";

            const status: ExecutionStatus = {
              id: newStatus.id,
              status: validStatus,
              node_statuses: newStatus.node_statuses || {},
              current_node_id: newStatus.current_node_id,
              current_node: newStatus.current_node,
              started_at: newStatus.started_at,
              completed_at: newStatus.completed_at,
              execution_progress: newStatus.execution_progress,
              execution_time: newStatus.execution_time,
              error: newStatus.error,
              nodes_completed: newStatus.nodes_completed || [],
              nodes_failed: newStatus.nodes_failed || [],
              nodes_pending: newStatus.nodes_pending || [],
              logs: newStatus.logs || [],
            };

            console.log("Setting execution status:", status);
            setExecutionStatus(status);
          }
        }
      );
    
    // Subscribe to the channel
    channel.subscribe((status) => {
      console.log(`Subscription status for ${channelName}:`, status);
    });

    // Cleanup function to unsubscribe
    return () => {
      console.log(`Cleaning up WebSocket subscription for: ${executionId}`);
      supabase.removeChannel(channel);
    };
  }, [executionId, supabase]);

  // No longer needed - direct updates via WebSocket subscription

  // Update node statuses based on execution status
  useEffect(() => {
    if (executionStatus && nodes.length > 0) {
      console.log("Updating node statuses with:", executionStatus);

      // Get node status map from execution status
      const nodeStatusMap = executionStatus.node_statuses || {};

      // Update each node with its execution status
      nodes.forEach((node) => {
        const nodeStatus = nodeStatusMap[node.id];

        // Only update if status has changed
        if (nodeStatus && node.data?.executionStatus !== nodeStatus) {
          console.log(`Updating node ${node.id} status to ${nodeStatus}`);
          updateNode(node.id, {
            data: { ...node.data, executionStatus: nodeStatus },
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
      // Reset node statuses before starting a new execution
      nodes.forEach((node) => {
        updateNode(node.id, {
          data: { ...node.data, executionStatus: undefined },
        });
      });

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
    isLoadingStatus: isPending,
  };
}
