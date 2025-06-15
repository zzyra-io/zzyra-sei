"use client";

import { useToast } from "@/components/ui/use-toast";
import { useWorkflowStore } from "@/lib/store/workflow-store";
import { useMutation, useQuery } from "@tanstack/react-query";
import { type Edge, type Node } from "@xyflow/react";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

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
  const queryClient = useQueryClient();

  // State for tracking execution
  const [executionId, setExecutionId] = useState<string | null>(null);

  // Use React Query to fetch execution status
  const { data: executionStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: ["executionStatus", executionId],
    queryFn: async () => {
      if (!executionId) return null;

      const response = await fetch(`/api/execute-workflow/${executionId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch execution status");
      }

      const data = await response.json();
      return data as ExecutionStatus;
    },
    enabled: !!executionId,
    refetchInterval: (query) => {
      const data = query.state.data as ExecutionStatus | null;
      // Stop polling when execution is complete or failed
      if (data && (data.status === "completed" || data.status === "failed")) {
        return false;
      }
      // Poll every 2 seconds while execution is in progress
      return 2000;
    },
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
        const { workflowService } = await import("@/lib/services/workflow-service");
        
        const data = await workflowService.executeWorkflow({
          id: workflowId,
          nodes: nodes || [],
          edges: edges || [],
        });
        
        console.log("Execution response:", data);

        if (data?.id) {
          setExecutionId(data.id);

          // Immediately trigger a query for the execution status
          queryClient.invalidateQueries({
            queryKey: ["executionStatus", data.id],
          });

          return { executionId: data.id };
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

  // React Query handles status updates via polling
  // No WebSocket subscription needed

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
    isLoadingStatus,
  };
}
