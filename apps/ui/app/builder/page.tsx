"use client";

import { BuilderSidebar } from "@/components/builder-sidebar";
import { ExecutionStatusPanel } from "@/components/execution-status-panel";
import { FlowCanvas } from "@/components/flow-canvas";
import { SaveNewWorkflowDialog } from "@/components/save-workflow-dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useToast } from "@/components/ui/use-toast";
import { UpdateWorkflowDialog } from "@/components/update-workflow-dialog";
import { WorkflowRefinement } from "@/components/workflow-refinement";
import { WorkflowToolbar } from "@/components/workflow-toolbar";
import NlWorkflowGenerator from "@/components/workflow/enhanced-nl-workflow-generator";
import { useSaveAndExecute } from "@/hooks/use-save-and-execute";
import { useCreateCustomBlock } from "@/hooks/use-custom-blocks";
import { useWorkflowExecution } from "@/hooks/use-workflow-execution";
import { useExecutionWebSocket } from "@/hooks/use-execution-websocket";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, XCircle, AlertCircle, Zap } from "lucide-react";
import { generateFlow } from "@/lib/api";
import { refineWorkflow } from "@/lib/api/workflow-generation";
import { useWorkflowValidation } from "@/lib/hooks/use-workflow-validation";
import { useWorkflowExecutionValidation } from "@/lib/hooks/use-workflow-execution-validation";
import { WorkflowValidationProvider } from "@/lib/contexts/workflow-validation-context";
import { workflowService } from "@/lib/services/workflow-service";
import { useFlowToolbar, useWorkflowStore } from "@/lib/store/workflow-store";
import { BlockType, CustomBlockDefinition } from "@zyra/types";
import type { UnifiedWorkflowNode, UnifiedWorkflowEdge } from "@zyra/types";
import {
  ensureValidWorkflowNode,
  prepareNodesForApi,
  prepareEdgesForApi,
} from "@zyra/types";
import { ArrowLeft, Loader2, Play, RefreshCw, Save } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useRef } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import type { Node, Edge } from "@xyflow/react";
import { logsService } from "@/lib/services/logs-service";
import { DraftManager } from "@/lib/utils/draft-manager";
import { ExecutionTimeline } from "@/components/execution/execution-timeline";

// Simplified save state interface
interface SaveState {
  isOpen: boolean;
  mode: "new" | "update" | "save-as";
}

export default function BuilderPage() {
  // Store hooks replacing local useState
  const {
    nodes,
    edges,
    addNode,
    setNodes,
    setEdges,
    updateNode,
    workflowId,
    workflowName,
    workflowDescription,
    hasUnsavedChanges,
    setWorkflowId,
    setWorkflowName,
    setWorkflowDescription,
    setHasUnsavedChanges,
    isGenerating,
    isRefining,
    setGenerating,
    setRefining,
    setLoading,
    isLoading,
    nlPrompt,
    isRefinementOpen,
    setNlPrompt,
    setIsRefinementOpen,
    addToHistory,
    setRecentPrompts,
    setGenerationStatus,
    setPartialNodes,
    resetFlow,
  } = useWorkflowStore();

  const toolbar = useFlowToolbar();
  const { validateWorkflow } = useWorkflowValidation();
  const { validateWorkflow: validateWorkflowExecution, canExecuteWorkflow } =
    useWorkflowExecutionValidation();
  useSaveAndExecute();
  const { mutateAsync: createCustomBlock } = useCreateCustomBlock();
  // Other hooks
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id") || undefined;

  // Debug search params (simplified)
  useEffect(() => {
    const currentId = searchParams.get("id");
    if (currentId !== (window as any).__prevSearchId) {
      console.log("BuilderPage: Search params changed - ID:", currentId);
      (window as any).__prevSearchId = currentId;
    }
  }, [searchParams]);

  const [isClient, setIsClient] = useState(false);

  // Replace isSaveDialogOpen and isUpdateDialogOpen with saveState
  const [saveState, setSaveState] = useState<SaveState>({
    isOpen: false,
    mode: "new",
  });

  // Track if we have loaded nodes to prevent unwanted resets
  const hasLoadedNodes = useRef(false);
  const nodesLengthRef = useRef(0);
  const justLoadedWorkflow = useRef(false);
  const hasLoadedWorkflow = useRef(false);

  // Add back exit dialog state
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);

  // Set isClient to true only after the component mounts on the client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Reset workflow loaded flag when component unmounts
  useEffect(() => {
    return () => {
      hasLoadedWorkflow.current = false;
      hasLoadedNodes.current = false;
      justLoadedWorkflow.current = false;
    };
  }, []);

  // Render a fallback during SSR or before client-side mount

  // Load workflow on mount if ID is provided
  useEffect(() => {
    // Prevent repeated loading of the same workflow
    if (hasLoadedWorkflow.current && workflowId === initialId) {
      console.log("BuilderPage: Workflow already loaded, skipping:", initialId);
      return;
    }

    console.log("BuilderPage: initialId changed to:", initialId);

    if (initialId) {
      (async () => {
        setLoading(true);
        try {
          console.log("BuilderPage: Loading workflow with ID:", initialId);
          const workflow = await workflowService.getWorkflow(initialId);
          if (workflow) {
            console.log(
              "BuilderPage: Workflow loaded successfully:",
              workflow.id
            );
            setWorkflowId(workflow.id);
            setWorkflowName(workflow.name);
            setWorkflowDescription(workflow.description || "");
            setNodes((workflow.nodes || []) as Node[]);
            setEdges((workflow.edges || []) as Edge[]);
            setHasUnsavedChanges(false);
            hasLoadedNodes.current = true; // Mark that we have loaded nodes
            hasLoadedWorkflow.current = true; // Mark that we have loaded this workflow
            justLoadedWorkflow.current = true; // Mark that we just loaded a workflow

            // Clear any existing draft for this workflow since we loaded from server
            DraftManager.clearDraft(workflow.id);

            toast({
              title: "Workflow loaded",
              description: "Your workflow has been loaded successfully.",
            });

            // Clear the just loaded flag after a delay to allow for URL changes
            setTimeout(() => {
              justLoadedWorkflow.current = false;
            }, 2000);
          } else {
            console.log("BuilderPage: Workflow not found for ID:", initialId);
            toast({
              title: "Workflow not found",
              description: "The requested workflow could not be found.",
              variant: "destructive",
            });
          }
        } catch (error: unknown) {
          const err = error as Error;
          console.error("BuilderPage: Error loading workflow:", error);
          toast({
            title: "Error",
            description: err.message || "Failed to load workflow.",
            variant: "destructive",
          });
          // Don't reset flow on error - keep the URL intact
        } finally {
          setLoading(false);
        }
      })();
    } else {
      console.log(
        "BuilderPage: No initialId provided, checking if we should reset flow"
      );
      // Only reset if we're not in the middle of loading a workflow AND we don't have a workflowId
      // AND we don't have loaded nodes (which would indicate a loaded workflow)
      if (
        !isLoading &&
        !workflowId &&
        !hasLoadedNodes.current &&
        nodesLengthRef.current === 0 &&
        !justLoadedWorkflow.current
      ) {
        console.log(
          "BuilderPage: Resetting flow - no loading, no workflowId, no loaded nodes"
        );
        hasLoadedNodes.current = false; // Reset the flag
        hasLoadedWorkflow.current = false; // Reset the workflow loaded flag
        resetFlow();
      } else {
        console.log(
          "BuilderPage: Not resetting flow - isLoading:",
          isLoading,
          "workflowId:",
          workflowId,
          "hasLoadedNodes:",
          hasLoadedNodes.current,
          "nodesLength:",
          nodesLengthRef.current,
          "justLoadedWorkflow:",
          justLoadedWorkflow.current
        );
      }
    }
  }, [initialId, isLoading, workflowId]);

  // Update nodes length ref when nodes change
  useEffect(() => {
    nodesLengthRef.current = nodes.length;
  }, [nodes]);

  // Restore URL if it gets cleared while we have a loaded workflow
  useEffect(() => {
    const currentId = searchParams.get("id");

    // If we have a workflow loaded but the URL doesn't have the ID, restore it
    if (workflowId && !currentId && hasLoadedNodes.current) {
      console.log(
        "BuilderPage: URL was cleared but workflow is loaded, restoring URL"
      );
      router.replace(`/builder?id=${workflowId}`, { scroll: false });
    }
  }, [searchParams, workflowId, router]);

  // Draft persistence effect
  useEffect(() => {
    if (hasUnsavedChanges) {
      DraftManager.saveDraft(workflowId, {
        nodes,
        edges,
        workflowName,
        workflowDescription,
      });
    }
  }, [
    nodes,
    edges,
    workflowName,
    workflowDescription,
    hasUnsavedChanges,
    workflowId,
  ]);

  // Load draft on mount
  useEffect(() => {
    // Don't load draft if we're currently loading a workflow
    if (isLoading) {
      return;
    }

    // Don't load draft if we have a workflow loaded from server
    if (hasLoadedNodes.current && workflowId) {
      console.log(
        "BuilderPage: Skipping draft load - workflow already loaded from server"
      );
      return;
    }

    // Only load draft for new workflows (no workflowId) or if we don't have loaded nodes
    if (!workflowId || !hasLoadedNodes.current) {
      const draft = DraftManager.loadDraft(workflowId);
      if (draft) {
        console.log("BuilderPage: Loading draft for workflowId:", workflowId);
        const {
          nodes: draftNodes,
          edges: draftEdges,
          workflowName: draftName,
          workflowDescription: draftDesc,
        } = draft;

        setNodes((draftNodes || []) as Node[]);
        setEdges((draftEdges || []) as Edge[]);
        setWorkflowName(draftName || "Untitled Workflow");
        setWorkflowDescription(draftDesc || "");
        setHasUnsavedChanges(true);
        hasLoadedNodes.current = true; // Mark that we have loaded nodes from draft
      }
    }
  }, [
    workflowId,
    initialId,
    isLoading,
    setNodes,
    setEdges,
    setWorkflowName,
    setWorkflowDescription,
    setHasUnsavedChanges,
  ]);

  // Prepare nodes for API calls - ensures all required fields are present
  const prepareWorkflowNodesForApi = useCallback(
    (nodes: Node[]): UnifiedWorkflowNode[] => {
      console.log("Original nodes:", nodes);
      console.log("Original nodes length:", nodes.length);

      const processedNodes = prepareNodesForApi(
        nodes.map((node) =>
          ensureValidWorkflowNode(node as UnifiedWorkflowNode)
        )
      );
      console.log("Processed nodes:", processedNodes);
      console.log("Processed nodes length:", processedNodes.length);

      if (nodes.length !== processedNodes.length) {
        console.error(
          "Node filtering occurred! Original:",
          nodes.length,
          "Processed:",
          processedNodes.length
        );
      }

      return processedNodes;
    },
    []
  );

  // Background auto-save for existing workflows only
  useEffect(() => {
    if (workflowId && initialId && hasUnsavedChanges && workflowName) {
      const autoSaveTimeoutId = setTimeout(async () => {
        try {
          // Get the current nodes directly from the store to ensure we have the latest state
          const currentNodes = useWorkflowStore.getState().nodes;
          console.log("Auto-saving workflow with nodes:", currentNodes);
          const apiNodes = prepareWorkflowNodesForApi(currentNodes);
          console.log("Prepared nodes for API:", apiNodes);
          await workflowService.updateWorkflow(workflowId, {
            name: workflowName,
            description: workflowDescription,
            nodes: apiNodes,
            edges: edges, // Use edges directly as they are already prepared
            is_public: false,
          });
          setHasUnsavedChanges(false);
          toast({
            title: "Auto-saved",
            description: "Your workflow has been automatically saved.",
            duration: 2000,
          });
        } catch (error) {
          // Only log, don't toast to avoid spam
          console.error("Auto-save failed:", error);
        }
      }, 30000);
      return () => clearTimeout(autoSaveTimeoutId);
    }
  }, [
    workflowId,
    initialId,
    hasUnsavedChanges,
    workflowName,
    workflowDescription,
    edges,
    prepareWorkflowNodesForApi,
    toast,
  ]);

  // Handlers using store actions
  const handleAddBlock = useCallback(
    (blockType: BlockType, position?: { x: number; y: number }) => {
      const newNode: UnifiedWorkflowNode = ensureValidWorkflowNode({
        id: `${Date.now()}`,
        position: position || { x: 100, y: 100 },
        data: {
          blockType: blockType,
          label: `${blockType} Node`,
          // The ensureValidWorkflowNode function will add the missing required fields
        },
      });
      addNode(newNode as Node);
      setHasUnsavedChanges(true);
    },
    [addNode, setHasUnsavedChanges]
  );

  const handleAddCustomBlock = useCallback(
    (
      customBlock: CustomBlockDefinition,
      method: "manual" | "ai",
      position?: { x: number; y: number }
    ) => {
      const newNode: UnifiedWorkflowNode = ensureValidWorkflowNode({
        id: `${Date.now()}`,
        type: "CUSTOM",
        position: position || { x: 100, y: 100 },
        data: {
          ...customBlock,
          blockType: customBlock.blockType || BlockType.CUSTOM,
          label: customBlock.name || "Custom Block",
        },
        dragHandle: ".custom-drag-handle",
        connectable: true,
      });
      createCustomBlock({ customBlock, method });
      addNode(newNode as Node);
      setHasUnsavedChanges(true);
    },
    [addNode, setHasUnsavedChanges, createCustomBlock]
  );

  // Use our custom hook for workflow execution with WebSocket-based real-time updates
  const {
    executeWorkflow,
    isExecuting: isExecutionPending,
    executionStatus,
    isLoadingStatus,
    executionMetrics,
    isRealTimeConnected,
    connectionError,
    executionId,
    executionLogs,
  } = useWorkflowExecution();

  // State to control execution panel visibility
  const [showExecutionPanel, setShowExecutionPanel] = useState(false);
  const [workerConnectionStatus, setWorkerConnectionStatus] = useState<
    "connected" | "disconnected" | "connecting"
  >("disconnected");

  // WebSocket connection handled by useWorkflowExecution hook
  // Logs are collected via API fallback

  // Fallback: Fetch logs from API when WebSocket fails or execution is completed
  const fetchLogsFromAPI = useCallback(async () => {
    if (!executionId) return;

    try {
      // Use the unified logs service
      const executionLogs = await logsService.getExecutionLevelLogs(
        executionId
      );

      // Transform execution logs to ExecutionLog format
      const logs = executionLogs.map((log) => ({
        id: log.id,
        timestamp: new Date(log.timestamp),
        level: log.level as "info" | "warn" | "error" | "debug",
        message: log.message,
        nodeId: log.node_id,
        metadata: log.data,
      }));

      // Update logs if we have any, or if current logs are empty
      if (logs.length > 0 || executionLogs.length === 0) {
        // Logs are now managed by useWorkflowExecution hook
        console.log("API logs fetched:", logs.length);
      }
    } catch (error) {
      console.error("Failed to fetch logs from API:", error);
      // Don't show error toast for 404s as they're expected for new executions
      if (error instanceof Error && !error.message.includes("Not Found")) {
        toast({
          title: "Failed to fetch logs",
          description: "Could not load execution logs. Please try again.",
          variant: "destructive",
        });
      }
    }
  }, [executionId, toast]);

  // Add a fallback to create mock logs for testing when no real logs are available
  const createMockLogs = useCallback(() => {
    if (executionLogs.length === 0 && executionId) {
      console.log("Creating mock logs for testing");
      // Mock logs are now handled by useWorkflowExecution hook
    }
  }, [executionLogs.length, executionId]);

  useEffect(() => {
    // Fetch logs after a delay to allow WebSocket to connect first
    const timer = setTimeout(fetchLogsFromAPI, 2000);
    return () => clearTimeout(timer);
  }, [fetchLogsFromAPI]);

  // Reset logs when starting a new execution
  useEffect(() => {
    if (executionId) {
      console.log("New execution started, logs will be reset by hook");
    }
  }, [executionId]);

  // Show execution panel when execution is pending or we have a status
  useEffect(() => {
    if (isExecutionPending || executionStatus || executionId) {
      setShowExecutionPanel(true);
    }
  }, [isExecutionPending, executionStatus, executionId]);

  // Auto-hide execution panel when execution is completed and no logs
  useEffect(() => {
    if (executionStatus?.status === "completed" && executionLogs.length === 0) {
      // Keep panel open for a bit to show completion status
      const timer = setTimeout(() => {
        setShowExecutionPanel(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [executionStatus?.status, executionLogs.length]);

  const handleWorkflowDetailsChange = useCallback(
    (details: { name?: string; description?: string }) => {
      if (details.name !== undefined) setWorkflowName(details.name);
      if (details.description !== undefined)
        setWorkflowDescription(details.description);
      setHasUnsavedChanges(true);
    },
    [setWorkflowName, setWorkflowDescription, setHasUnsavedChanges]
  );

  // Save logic
  const handleSmartSave = useCallback(async () => {
    if (workflowId && initialId) {
      await handleUpdateWorkflow(workflowName, workflowDescription);
    } else {
      setSaveState({
        isOpen: true,
        mode: "new",
      });
    }
  }, [workflowId, initialId, workflowName, workflowDescription]);

  const handleSaveNewWorkflow = useCallback(
    async (name: string, description: string, tags: string[] = []) => {
      try {
        setLoading(true);
        // Get the current nodes directly from the store to ensure we have the latest state
        const currentNodes = useWorkflowStore.getState().nodes;
        const apiNodes = prepareWorkflowNodesForApi(currentNodes);
        const savedWorkflow = await workflowService.createWorkflow({
          name,
          description,
          nodes: apiNodes,
          edges,
          is_public: false,
          tags,
        });

        if (savedWorkflow && savedWorkflow.id) {
          // Update state first
          setWorkflowId(savedWorkflow.id);
          setHasUnsavedChanges(false);
          setSaveState((prev) => ({ ...prev, isOpen: false }));

          // Clear draft from localStorage
          DraftManager.clearDraft(savedWorkflow.id);

          // Show success message
          toast({
            title: "Workflow saved",
            description: "Your workflow has been saved successfully.",
          });

          // Navigate to the saved workflow URL after a brief delay to ensure state is updated
          setTimeout(() => {
            router.replace(`/builder?id=${savedWorkflow.id}`, {
              scroll: false,
            });
          }, 100);
        } else {
          throw new Error(
            "Failed to save workflow: No ID returned from server"
          );
        }
      } catch (error: unknown) {
        const err = error as Error;
        console.error("Error saving workflow:", error);
        toast({
          title: "Error",
          description: err.message || "Failed to save workflow.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [
      edges,
      router,
      toast,
      setWorkflowId,
      setHasUnsavedChanges,
      setLoading,
      prepareWorkflowNodesForApi,
    ]
  );

  const handleUpdateWorkflow = useCallback(
    async (name: string, description: string, tags: string[] = []) => {
      try {
        setLoading(true);
        // Get the current nodes directly from the store to ensure we have the latest state
        const currentNodes = useWorkflowStore.getState().nodes;
        const apiNodes = prepareWorkflowNodesForApi(currentNodes);
        if (workflowId && initialId) {
          await workflowService.updateWorkflow(workflowId, {
            name,
            description,
            nodes: apiNodes,
            edges: edges, // Use edges directly as they are already prepared
            is_public: false,
            tags,
          });
          setHasUnsavedChanges(false);
          setSaveState((prev) => ({ ...prev, isOpen: false }));

          // Clear draft since we've successfully updated the workflow
          DraftManager.clearDraft(workflowId);

          toast({
            title: "Workflow updated",
            description: "Your workflow has been updated successfully.",
          });
        } else {
          throw new Error("Cannot update workflow: No valid workflow ID");
        }
      } catch (error: unknown) {
        const err = error as Error;
        toast({
          title: "Error",
          description: err.message || "Failed to update workflow.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [
      workflowId,
      initialId,
      edges,
      toast,
      setHasUnsavedChanges,
      setLoading,
      prepareWorkflowNodesForApi,
    ]
  );

  const handleSaveAsNew = useCallback(
    async (name: string, description: string, tags: string[] = []) => {
      try {
        setLoading(true);
        const apiNodes = prepareWorkflowNodesForApi(nodes);
        const savedWorkflow = await workflowService.createWorkflow({
          name,
          description,
          nodes: apiNodes,
          edges,
          is_public: false,
          tags,
        });

        if (savedWorkflow && savedWorkflow.id) {
          // Reset flow first to clear current state
          resetFlow();

          // Update state with new workflow ID
          setWorkflowId(savedWorkflow.id);
          setHasUnsavedChanges(false);
          setSaveState((prev) => ({ ...prev, isOpen: false }));

          // Clear draft from localStorage
          DraftManager.clearDraft(savedWorkflow.id);

          // Show success message
          toast({
            title: "New workflow created",
            description: "Your workflow has been saved as a new workflow.",
          });

          // Navigate to the new workflow URL after a brief delay to ensure state is updated
          setTimeout(() => {
            router.replace(`/builder?id=${savedWorkflow.id}`, {
              scroll: false,
            });
          }, 100);
        } else {
          throw new Error(
            "Failed to save as new workflow: No ID returned from server"
          );
        }
      } catch (error: unknown) {
        const err = error as Error;
        console.error("Error saving as new workflow:", error);
        toast({
          title: "Error",
          description: err.message || "Failed to save as new workflow.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [
      nodes,
      edges,
      router,
      toast,
      setWorkflowId,
      setHasUnsavedChanges,
      setLoading,
      prepareWorkflowNodesForApi,
      resetFlow,
    ]
  );

  // Update handleExecuteWorkflow - non-blocking execution with schema validation
  const handleExecuteWorkflow = useCallback(async () => {
    try {
      // 1. Validate workflow structure
      const structureValidation = validateWorkflow(nodes, edges);
      if (!structureValidation.valid) {
        toast({
          title: "Workflow Structure Validation Failed",
          description:
            structureValidation.message ||
            "Please fix the workflow structure issues before executing.",
          variant: "destructive",
        });
        return;
      }

      // 2. Validate workflow execution (schema-based validation)
      const executionValidation = validateWorkflowExecution(nodes, edges);
      if (!executionValidation.isValid) {
        const errorMessages = executionValidation.errors
          .map((error) => `${error.nodeId}: ${error.message}`)
          .join(", ");

        toast({
          title: "Workflow Configuration Validation Failed",
          description: `Please fix the following issues: ${errorMessages}`,
          variant: "destructive",
        });
        return;
      }

      // 3. Check if workflow is saved
      if (!workflowId || !initialId) {
        toast({
          title: "Unsaved Workflow",
          description:
            "Please save your workflow before executing. Use Cmd+S to save quickly.",
          variant: "destructive",
        });
        return;
      }

      // 4. Execute workflow
      setShowExecutionPanel(true);
      await executeWorkflow();
    } catch (error: unknown) {
      const err = error as Error;
      console.error("Error in execution flow:", err);
      toast({
        title: "Execution Error",
        description: err.message || "Failed to execute workflow",
        variant: "destructive",
      });
    }
  }, [
    validateWorkflow,
    validateWorkflowExecution,
    nodes,
    edges,
    workflowId,
    initialId,
    executeWorkflow,
    toast,
  ]);

  const handleNlGenerate = useCallback(
    async (e: { preventDefault: () => void }) => {
      e.preventDefault();
      if (!nlPrompt.trim()) return;
      setGenerating(true);
      try {
        const result = await generateFlow(nlPrompt, nodes, edges);
        if (result.nodes && result.edges) {
          const newNodes = [...nodes, ...result.nodes];
          const newEdges = [...edges, ...result.edges];
          setNodes(newNodes);
          setEdges(newEdges);
          addToHistory(newNodes, newEdges);
          const recentPrompts = [nlPrompt];
          setRecentPrompts(recentPrompts);
          setHasUnsavedChanges(true);
          toast({
            title: "Workflow updated",
            description: `Added ${result.nodes.length} new blocks based on your instructions.`,
          });
        }
      } catch (error: unknown) {
        const err = error as Error;
        toast({
          title: "Error",
          description: err.message || "Failed to generate workflow.",
          variant: "destructive",
        });
      } finally {
        setGenerating(false);
      }
    },
    [
      nlPrompt,
      nodes,
      edges,
      setNodes,
      setEdges,
      addToHistory,
      setRecentPrompts,
      setHasUnsavedChanges,
      setGenerating,
      toast,
    ]
  );

  const handleExit = () => {
    if (hasUnsavedChanges) {
      setIsExitDialogOpen(true);
    } else {
      router.push("/dashboard");
    }
  };

  // Hotkeys using toolbar actions from store
  useHotkeys(
    "mod+s",
    (e) => {
      e.preventDefault();
      handleSmartSave();
    },
    { enableOnFormTags: true }
  );

  useHotkeys(
    "mod+e",
    (e) => {
      e.preventDefault();
      handleExecuteWorkflow();
    },
    { enableOnFormTags: true }
  );

  useHotkeys(
    "mod+z",
    (e) => {
      e.preventDefault();
      toolbar.undo();
    },
    { enableOnFormTags: true }
  );

  useHotkeys(
    "mod+shift+z",
    (e) => {
      e.preventDefault();
      toolbar.redo();
    },
    { enableOnFormTags: true }
  );

  // Additional keyboard shortcuts for toolbar functions
  useHotkeys(
    "Delete",
    (e) => {
      e.preventDefault();
      toolbar.delete();
    },
    { enableOnFormTags: true }
  );

  useHotkeys(
    "mod+d",
    (e) => {
      e.preventDefault();
      toolbar.copy();
    },
    { enableOnFormTags: true }
  );

  useHotkeys(
    "mod+shift+r",
    (e) => {
      e.preventDefault();
      toolbar.reset();
    },
    { enableOnFormTags: true }
  );

  useHotkeys(
    "mod+0",
    (e) => {
      e.preventDefault();
      toolbar.fitView();
    },
    { enableOnFormTags: true }
  );

  // useHotkeys(
  //   "mod+plus",
  //   (e) => {
  //     e.preventDefault();
  //     toolbar.zoomIn();
  //   },
  //   { enableOnFormTags: true }
  // );

  // useHotkeys(
  //   "mod+minus",
  //   (e) => {
  //     e.preventDefault();
  //     toolbar.zoomOut();
  //   },
  //   { enableOnFormTags: true }
  // );

  useHotkeys(
    "mod+g",
    (e) => {
      e.preventDefault();
      toolbar.toggleGrid();
    },
    { enableOnFormTags: true }
  );

  // Validation (example) - with null check to prevent errors during drag operations
  const hasInvalidConfig = Array.isArray(nodes)
    ? nodes.some((node) => !node.data?.isValid)
    : false;

  if (!isClient) {
    return <div>Loading...</div>; // Or a server-side fallback UI
  }

  return (
    <>
      <div className='flex flex-col h-screen'>
        {/* Header */}
        <div className='flex justify-between items-center p-4 border-b flex-shrink-0 bg-background/95 backdrop-blur-sm'>
          <div className='flex items-center gap-3'>
            <Button
              variant='ghost'
              size='sm'
              onClick={handleExit}
              className='hover:bg-muted/80'>
              <ArrowLeft className='h-4 w-4 mr-2' />
              <span className='font-medium'>Back</span>
            </Button>
            <div className='h-6 w-px bg-border' />
            <div className='flex items-center gap-2'>
              <span className='text-lg font-semibold text-foreground'>
                {workflowName || "Untitled Workflow"}
              </span>
              {hasUnsavedChanges && (
                <span className='text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200 px-2 py-1 rounded-full font-medium border border-amber-200 dark:border-amber-800'>
                  Unsaved Changes
                </span>
              )}
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              onClick={handleSmartSave}
              className='font-medium hover:bg-muted/80 border-border/60'>
              <Save className='h-4 w-4 mr-2' />
              <span>{workflowId && initialId ? "Save" : "Save As..."}</span>
            </Button>
            <Button
              onClick={handleExecuteWorkflow}
              disabled={isExecutionPending || hasInvalidConfig}
              className='bg-primary hover:bg-primary/90 text-primary-foreground font-medium shadow-sm hover:shadow-md transition-all'>
              {isExecutionPending ? (
                <>
                  <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                  <span>Executing...</span>
                </>
              ) : (
                <>
                  <Play className='h-4 w-4 mr-2' />
                  <span>Execute</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className='flex flex-1 bg-background relative overflow-hidden'>
          {/* Workflow Toolbar - positioned relative to main content */}
          <div className='absolute top-6 left-1/2 transform -translate-x-1/2 z-20 pointer-events-none'>
            <div className='pointer-events-auto animate-in fade-in-0 slide-in-from-top-2 duration-300'>
              <WorkflowToolbar
                onUndo={toolbar.undo}
                onRedo={toolbar.redo}
                onZoomIn={toolbar.zoomIn}
                onZoomOut={toolbar.zoomOut}
                onFitView={toolbar.fitView}
                onToggleGrid={toolbar.toggleGrid}
                onSave={handleSmartSave}
                onExecute={handleExecuteWorkflow}
                onDelete={toolbar.delete}
                onCopy={toolbar.copy}
                onAlignHorizontal={toolbar.alignHorizontal}
                onAlignVertical={toolbar.alignVertical}
                onReset={toolbar.reset}
                onHelp={() => {
                  toast({
                    title: "Workflow Builder Help",
                    description:
                      "Use the toolbar to manage your workflow. You can undo/redo changes, zoom in/out, fit the view, toggle grid, save, execute, delete, copy, align, and reset your workflow.",
                  });
                }}
                canUndo={toolbar.canUndo}
                canRedo={toolbar.canRedo}
                isGridVisible={toolbar.isGridVisible}
                isExecuting={isExecutionPending || false}
              />
            </div>
          </div>

          <ResizablePanelGroup direction='horizontal' className='h-full w-full'>
            <ResizablePanel
              defaultSize={25}
              minSize={20}
              maxSize={35}
              className='h-full'>
              <BuilderSidebar
                onAddNode={handleAddBlock}
                onAddCustomBlock={(customBlock, position, method) =>
                  handleAddCustomBlock(customBlock, method, position)
                }
                workflowName={workflowName}
                workflowDescription={workflowDescription}
                onWorkflowDetailsChange={handleWorkflowDetailsChange}
                nodes={nodes}
                onGenerateCustomBlock={async (prompt) => {
                  setNlPrompt(prompt);
                  const syntheticEvent = { preventDefault: () => {} };
                  await handleNlGenerate(syntheticEvent);
                }}
              />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={75} className='h-full relative'>
              <WorkflowValidationProvider>
                <FlowCanvas />
              </WorkflowValidationProvider>

              {/* Empty State Overlay */}
              {nodes.length === 0 && (
                <div className='absolute inset-0 flex items-center justify-center pointer-events-none z-10 bg-background/50 backdrop-blur-sm'>
                  <div className='text-center max-w-lg mx-auto p-8 bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 shadow-lg'>
                    <div className='mb-8'>
                      <div className='w-24 h-24 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent flex items-center justify-center border border-primary/20'>
                        <div className='w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center'>
                          <svg
                            className='w-6 h-6 text-primary'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'>
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={1.5}
                              d='M13.5 16.875h3.375m0 0h3.375m-3.375 0V13.5m0 3.375v3.375M6 10.5h2.25a2.25 2.25 0 002.25-2.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v2.25A2.25 2.25 0 006 10.5zm0 9.75h2.25A2.25 2.25 0 0010.5 18v-2.25a2.25 2.25 0 00-2.25-2.25H6a2.25 2.25 0 00-2.25 2.25V18A2.25 2.25 0 006 20.25zm9.75-9.75H18a2.25 2.25 0 002.25-2.25V6A2.25 2.25 0 0018 3.75h-2.25A2.25 2.25 0 0013.5 6v2.25a2.25 2.25 0 002.25 2.25z'
                            />
                          </svg>
                        </div>
                      </div>
                      <h3 className='text-2xl font-bold text-foreground mb-3'>
                        Start Building Your Workflow
                      </h3>
                      <p className='text-muted-foreground text-base leading-relaxed mb-8 max-w-md mx-auto'>
                        Create powerful automation workflows by connecting
                        blocks together. Drag from the sidebar or use AI to get
                        started.
                      </p>
                    </div>

                    <div className='space-y-4'>
                      <div className='grid grid-cols-1 gap-3 text-sm'>
                        <div className='flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-muted'>
                          <div className='w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0'>
                            <span className='text-primary font-bold text-sm'>
                              1
                            </span>
                          </div>
                          <div className='text-left'>
                            <div className='font-medium text-foreground'>
                              Browse the Block Library
                            </div>
                            <div className='text-xs text-muted-foreground'>
                              Find triggers, actions, and logic blocks in the
                              sidebar
                            </div>
                          </div>
                        </div>
                        <div className='flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-muted'>
                          <div className='w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0'>
                            <span className='text-primary font-bold text-sm'>
                              2
                            </span>
                          </div>
                          <div className='text-left'>
                            <div className='font-medium text-foreground'>
                              Add Blocks to Canvas
                            </div>
                            <div className='text-xs text-muted-foreground'>
                              Drag blocks here or click to add them
                            </div>
                          </div>
                        </div>
                        <div className='flex items-center gap-3 p-3 bg-muted/30 rounded-xl border border-muted'>
                          <div className='w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0'>
                            <span className='text-primary font-bold text-sm'>
                              3
                            </span>
                          </div>
                          <div className='text-left'>
                            <div className='font-medium text-foreground'>
                              Connect & Configure
                            </div>
                            <div className='text-xs text-muted-foreground'>
                              Link blocks together and set up your automation
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className='pt-4 border-t border-border/50'>
                        <p className='text-xs text-muted-foreground/80 flex items-center justify-center gap-2'>
                          <svg
                            className='w-4 h-4'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'>
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={1.5}
                              d='M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z'
                            />
                          </svg>
                          Try the AI workflow generator below to get started
                          instantly
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </ResizablePanel>

            {/* Floating Execution Timeline */}
            {(showExecutionPanel || isExecutionPending || executionId) && (
              <ExecutionTimeline
                nodes={nodes.map((node) => ({
                  id: node.id,
                  label: String(node.data?.label || node.data?.name || node.id),
                  type: String(node.data?.type || node.type || "unknown"),
                  status:
                    (node.data?.status as
                      | "pending"
                      | "running"
                      | "completed"
                      | "failed"
                      | "skipped") || "pending",
                  startTime: node.data?.executionStartTime,
                  endTime: node.data?.executionEndTime,
                  duration: node.data?.executionDuration,
                  progress: node.data?.executionProgress,
                  error: node.data?.executionError,
                }))}
                edges={edges.map((edge) => ({
                  source: edge.source,
                  target: edge.target,
                }))}
                isExecuting={
                  isExecutionPending || executionStatus?.status === "running"
                }
                totalProgress={Math.round(
                  executionStatus?.node_statuses
                    ? (Object.values(executionStatus.node_statuses).filter(
                        (status) => status === "completed"
                      ).length /
                        Object.keys(executionStatus.node_statuses).length) *
                        100
                    : 0
                )}
                currentExecutionId={executionId || undefined}
                onNodeClick={(nodeId: string) => {
                  console.log("Focus on node:", nodeId);
                }}
                onClose={() => setShowExecutionPanel(false)}
              />
            )}
          </ResizablePanelGroup>

          {/* AI Workflow Generation Component */}
          <div className='absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-2xl px-4 pointer-events-none'>
            <div className='pointer-events-auto'>
              <NlWorkflowGenerator
                onNodesGenerated={(result) => {
                  const { nodes: newNodes, edges: newEdges } = result;
                  const updatedNodes = [...nodes, ...newNodes];
                  const updatedEdges = [...edges, ...newEdges];
                  setNodes(updatedNodes);
                  setEdges(updatedEdges);
                  addToHistory(updatedNodes, updatedEdges);
                  setHasUnsavedChanges(true);
                  toast({
                    title: "Workflow generated",
                    description: `Created ${newNodes.length} components based on your description.`,
                  });
                }}
                existingNodes={nodes}
                existingEdges={edges}
                isGenerating={isGenerating}
                setIsGenerating={setGenerating}
              />
            </div>
          </div>
        </div>

        {/* Workflow Refinement Dialog */}
        {isRefinementOpen && (
          <Dialog open={isRefinementOpen} onOpenChange={setIsRefinementOpen}>
            <DialogContent className='sm:max-w-[700px]'>
              <WorkflowRefinement
                nodes={nodes}
                edges={edges}
                isRefining={isRefining}
                onClose={() => setIsRefinementOpen(false)}
                onRefine={async (prompt, options) => {
                  setRefining(true);
                  try {
                    const result = await refineWorkflow(
                      prompt,
                      options,
                      nodes,
                      edges,
                      (status, progress, partial) => {
                        setGenerationStatus({
                          status: status,
                          progress,
                          error: "",
                        });
                        if (partial) setPartialNodes(partial);
                      }
                    );
                    if (result && result.nodes && result.edges) {
                      setNodes(result.nodes);
                      setEdges(result.edges);
                      addToHistory(result.nodes, result.edges);
                      setHasUnsavedChanges(true);
                      setIsRefinementOpen(false);
                      toast({
                        title: "Workflow refined",
                        description:
                          "Updated workflow based on your refinement request.",
                      });
                    }
                  } catch (error: unknown) {
                    const err = error as Error;
                    toast({
                      title: "Error",
                      description: err.message || "Failed to refine workflow.",
                      variant: "destructive",
                    });
                  } finally {
                    setRefining(false);
                  }
                }}
              />
            </DialogContent>
          </Dialog>
        )}

        {/* Dialogs */}
        <SaveNewWorkflowDialog
          open={saveState.isOpen && saveState.mode === "new"}
          onOpenChange={(open) =>
            setSaveState((prev) => ({ ...prev, isOpen: open }))
          }
          onSave={handleSaveNewWorkflow}
          initialName={workflowName}
          initialDescription={workflowDescription}
        />

        <UpdateWorkflowDialog
          open={saveState.isOpen && saveState.mode === "update"}
          onOpenChange={(open) =>
            setSaveState((prev) => ({ ...prev, isOpen: open }))
          }
          onUpdate={handleUpdateWorkflow}
          onSaveAsNew={handleSaveAsNew}
          currentName={workflowName || "Untitled Workflow"}
          currentDescription={workflowDescription || ""}
          currentTags={[]}
        />

        {/* Exit Confirmation Dialog */}
        <AlertDialog open={isExitDialogOpen} onOpenChange={setIsExitDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
              <AlertDialogDescription>
                You have unsaved changes. Are you sure you want to leave? Your
                changes will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => router.push("/workflows")}>
                Leave Without Saving
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </>
  );
}
