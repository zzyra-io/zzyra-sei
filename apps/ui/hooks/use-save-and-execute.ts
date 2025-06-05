import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/components/ui/use-toast";
import { workflowService } from "@/lib/services/workflow-service";
import type { Node, Edge } from "@xyflow/react";

interface SaveAndExecuteParams {
  workflowId?: string;
  nodes: Node[];
  edges: Edge[];
  workflowName?: string;
  workflowDescription?: string;
  onExecutionStart?: (executionId: string) => void;
}

interface SaveWorkflowResult {
  id: string;
  name: string;
  description: string;
}

/**
 * Custom hook that properly chains save and execute operations
 * Ensures execution only happens after save is complete and database is consistent
 */
export function useSaveAndExecute() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      params: SaveAndExecuteParams
    ): Promise<{ executionId: string }> => {
      const {
        workflowId,
        nodes,
        edges,
        workflowName = "Untitled Workflow",
        workflowDescription = "",
        onExecutionStart,
      } = params;

      let finalWorkflowId = workflowId;

      // Step 1: Save or update the workflow
      if (workflowId) {
        // Update existing workflow
        toast({
          title: "Updating workflow...",
          description: "Please wait while we save your changes.",
        });

        await workflowService.updateWorkflow(workflowId, {
          name: workflowName,
          description: workflowDescription,
          nodes,
          edges,
          is_public: false,
          tags: [],
        });

        // Invalidate cache to ensure fresh data
        await queryClient.invalidateQueries({
          queryKey: ["workflow", workflowId],
        });

        toast({
          title: "Workflow updated",
          description: "Your workflow has been updated successfully.",
        });
      } else {
        // Create new workflow
        toast({
          title: "Saving workflow...",
          description: "Please wait while we save your workflow.",
        });

        const savedWorkflow: SaveWorkflowResult =
          await workflowService.createWorkflow({
            name: workflowName,
            description: workflowDescription,
            nodes,
            edges,
            is_public: false,
            tags: [],
          });

        finalWorkflowId = savedWorkflow.id;

        // Invalidate workflows cache
        await queryClient.invalidateQueries({
          queryKey: ["workflows"],
        });

        toast({
          title: "Workflow saved",
          description: "Your workflow has been saved successfully.",
        });
      }

      if (!finalWorkflowId) {
        throw new Error("Failed to save workflow - no workflow ID received");
      }

      // Step 2: Wait for cache invalidation to complete
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Step 3: Execute the workflow
      toast({
        title: "Starting execution...",
        description: "Your workflow is now being executed.",
      });

      const response = await fetch("/api/execute-workflow", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ workflowId: finalWorkflowId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to execute workflow");
      }

      const executionData = await response.json();

      if (!executionData.executionId) {
        throw new Error(
          "Failed to start workflow execution - no execution ID received"
        );
      }

      // Step 4: Notify about execution start
      if (onExecutionStart) {
        onExecutionStart(executionData.executionId);
      }

      toast({
        title: "Execution started",
        description:
          "Your workflow is now running. You can monitor progress in the execution panel.",
      });

      return { executionId: executionData.executionId };
    },
    onError: (error: Error) => {
      console.error("Error in save and execute:", error);
      toast({
        title: "Save and Execute Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    },
  });
}
