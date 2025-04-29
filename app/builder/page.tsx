"use client";

import type React from "react";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthGate } from "@/components/auth-gate";
import { FlowCanvas } from "@/components/flow-canvas";
import { SaveWorkflowDialog } from "@/components/save-workflow-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { generateFlow } from "@/lib/api";
import { workflowService } from "@/lib/services/workflow-service";
import { Loader2, Save, Play, ArrowLeft } from "lucide-react";
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
import { redirect } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { useHotkeys } from "react-hotkeys-hook";
import { debounce } from "lodash";

// Import types from flow-canvas
import type { Node, Edge } from "@/components/flow-canvas";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { BlockType, getBlockMetadata } from "@/types/workflow";
import type { CustomBlockDefinition } from "@/types/custom-block";
import { BuilderSidebar } from "@/components/builder-sidebar";
import { WorkflowToolbar } from "@/components/workflow-toolbar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function BuilderPage() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [workflowName, setWorkflowName] = useState("Untitled Workflow");
  const [workflowDescription, setWorkflowDescription] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [catalogTab, setCatalogTab] = useState("blocks");
  const [isGridVisible, setIsGridVisible] = useState(true);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialId = searchParams.get("id") || undefined;
  const [workflowId, setWorkflowId] = useState<string | undefined>(initialId);

  // State variables that depend on initialId
  const [isRedirecting, setIsRedirecting] = useState(!searchParams);

  useEffect(() => {
    if (!searchParams) {
      router.replace("/builder");
    }
  }, [searchParams, router]);

  if (isRedirecting) {
    return (
      <AuthGate>
        <div className='flex min-h-screen items-center justify-center'>
          Redirecting...
        </div>
      </AuthGate>
    );
  }

  // Memoize nodes and edges to prevent unnecessary re-renders
  const memoizedNodes = useMemo(() => nodes, [nodes]);
  const memoizedEdges = useMemo(() => edges, [edges]);

  // Workflow validation function
  const validateWorkflow = (
    nodes: Node[],
    edges: Edge[]
  ): { valid: boolean; message?: string } => {
    // Check if workflow is empty
    if (nodes.length === 0) {
      return {
        valid: false,
        message: "Workflow is empty. Please add some blocks first.",
      };
    }

    // Check for nodes with missing required configuration
    for (const node of nodes) {
      if (
        node.type === "custom" &&
        (!node.data.config || Object.keys(node.data.config).length === 0)
      ) {
        return {
          valid: false,
          message: `Node "${node.data.label}" is missing required configuration.`,
        };
      }

      // Check for specific block types that need validation
      if (
        node.data.blockType === BlockType.WEBHOOK &&
        (!node.data.config?.url || !node.data.config.url.trim())
      ) {
        return {
          valid: false,
          message: `Webhook node "${node.data.label}" requires a URL.`,
        };
      }
    }

    // Check for disconnected nodes (no incoming or outgoing edges)
    if (nodes.length > 1) {
      const connectedNodeIds = new Set<string>();

      edges.forEach((edge) => {
        connectedNodeIds.add(edge.source);
        connectedNodeIds.add(edge.target);
      });

      const disconnectedNodes = nodes.filter(
        (node) => !connectedNodeIds.has(node.id)
      );

      if (disconnectedNodes.length > 0) {
        return {
          valid: false,
          message: `Disconnected nodes detected: ${disconnectedNodes
            .map((n) => n.data.label)
            .join(", ")}. Connect all nodes to create a valid workflow.`,
          // This could be a warning instead of an error depending on your requirements
        };
      }
    }

    return { valid: true };
  };

  // Load workflow effect with enhanced error handling
  useEffect(() => {
    if (initialId) {
      (async () => {
        setIsLoading(true);
        try {
          const workflow = await workflowService.getWorkflow(initialId);
          if (workflow) {
            setWorkflowId(workflow.id);
            setWorkflowName(workflow.name);
            setWorkflowDescription(workflow.description || "");
            setNodes(workflow.nodes || []);
            setEdges(workflow.edges || []);
            setHasUnsavedChanges(false);
            toast({
              title: "Workflow loaded",
              description: "Your workflow has been loaded successfully.",
            });
          }
        } catch (error: any) {
          console.error("Error loading workflow:", error);

          // Enhanced error handling with specific messages
          if (error.message?.includes("not found")) {
            toast({
              title: "Workflow not found",
              description:
                "The requested workflow could not be found. It may have been deleted.",
              variant: "destructive",
            });
            router.replace("/builder");
          } else if (error.message?.includes("permission")) {
            toast({
              title: "Access denied",
              description: "You don't have permission to access this workflow.",
              variant: "destructive",
            });
            router.replace("/builder");
          } else {
            toast({
              title: "Load failed",
              description: "Failed to load workflow. Please try again.",
              variant: "destructive",
            });
          }
        } finally {
          setIsLoading(false);
        }
      })();
    }
  }, [initialId, router, toast]);

  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      setHasUnsavedChanges(true);
    }
  }, [nodes, edges]);

  // Debounced autosave function
  const debouncedSave = useCallback(
    debounce(async () => {
      if (workflowId && hasUnsavedChanges) {
        try {
          await workflowService.updateWorkflow(workflowId, {
            name: workflowName,
            description: workflowDescription,
            nodes,
            edges,
            is_public: false,
            tags: [],
          });
          setHasUnsavedChanges(false);
          toast({
            title: "Auto-saved",
            description: "Your workflow has been saved automatically.",
            duration: 2000,
          });
        } catch (error) {
          console.error("Auto-save failed:", error);
          // Silent failure for autosave - we don't want to disrupt the user
        }
      }
    }, 30000),
    [
      workflowId,
      hasUnsavedChanges,
      nodes,
      edges,
      workflowName,
      workflowDescription,
      toast,
    ]
  );

  // Trigger debounced autosave when changes occur
  useEffect(() => {
    if (hasUnsavedChanges && workflowId) {
      debouncedSave();
    }
    return () => debouncedSave.cancel();
  }, [hasUnsavedChanges, debouncedSave, workflowId]);

  // Local storage draft backup
  useEffect(() => {
    if (hasUnsavedChanges) {
      const draft = {
        nodes,
        edges,
        name: workflowName,
        description: workflowDescription,
        timestamp: new Date().toISOString(),
      };
      localStorage.setItem("workflow_draft", JSON.stringify(draft));
    }
  }, [nodes, edges, workflowName, workflowDescription, hasUnsavedChanges]);

  // Restore draft on initial load if no workflow ID
  useEffect(() => {
    if (!initialId) {
      const draftJson = localStorage.getItem("workflow_draft");
      if (draftJson) {
        try {
          const draft = JSON.parse(draftJson);
          // Only restore if the draft is less than 24 hours old
          const draftTime = new Date(draft.timestamp).getTime();
          const now = new Date().getTime();
          const hoursSinceDraft = (now - draftTime) / (1000 * 60 * 60);

          if (hoursSinceDraft < 24) {
            setNodes(draft.nodes || []);
            setEdges(draft.edges || []);
            setWorkflowName(draft.name || "Untitled Workflow");
            setWorkflowDescription(draft.description || "");
            toast({
              title: "Draft restored",
              description: "Your unsaved changes have been restored.",
              duration: 3000,
            });
          }
        } catch (error) {
          console.error("Failed to parse draft:", error);
          // Clear corrupted draft
          localStorage.removeItem("workflow_draft");
        }
      }
    }
  }, [initialId, toast]);

  const handleGenerate = async (prompt: string) => {
    setIsGenerating(true);
    try {
      const result = await generateFlow(prompt);
      if (result.nodes && result.edges) {
        setNodes(result.nodes);
        setEdges(result.edges);
        toast({
          title: "Workflow generated",
          description: "Your workflow has been generated successfully.",
        });
      }
    } catch (error: any) {
      console.error("Generation error:", error);
      toast({
        title: "Generation failed",
        description:
          error.message || "Failed to generate workflow. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveWorkflow = async (
    name: string,
    description: string,
    tags: string[],
    replaceUrl = true
  ) => {
    try {
      setIsLoading(true);

      if (workflowId) {
        await workflowService.updateWorkflow(workflowId, {
          name,
          description,
          nodes,
          edges,
          is_public: false,
          tags,
        });

        toast({
          title: "Workflow updated",
          description: "Your workflow has been updated successfully.",
        });
      } else {
        const savedWorkflow = await workflowService.createWorkflow({
          name,
          description,
          nodes,
          edges,
          is_public: false,
          tags,
        });

        if (savedWorkflow && savedWorkflow.id) {
          setWorkflowId(savedWorkflow.id);
          if (replaceUrl) router.replace(`/builder?id=${savedWorkflow.id}`);

          // Clear draft after successful save
          localStorage.removeItem("workflow_draft");
        }

        toast({
          title: "Workflow saved",
          description: "Your workflow has been saved successfully.",
        });
      }

      setHasUnsavedChanges(false);
      setIsSaveDialogOpen(false);
    } catch (error: any) {
      console.error("Error saving workflow:", error);

      // Enhanced error handling with specific messages
      if (error.message?.includes("validation")) {
        toast({
          title: "Validation Error",
          description: error.message,
          variant: "destructive",
        });
      } else if (
        error.message?.includes("network") ||
        error.message?.includes("connection")
      ) {
        toast({
          title: "Network Error",
          description: "Please check your internet connection and try again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Save failed",
          description: "Failed to save workflow. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteWorkflow = async () => {
    if (!workflowId) return;

    try {
      setIsLoading(true);
      await workflowService.deleteWorkflow(workflowId);

      toast({
        title: "Workflow deleted",
        description: "Your workflow has been deleted successfully.",
      });

      // Clear draft after successful delete
      localStorage.removeItem("workflow_draft");
      router.push("/workflows");
    } catch (error: any) {
      console.error("Error deleting workflow:", error);

      if (error.message?.includes("permission")) {
        toast({
          title: "Permission denied",
          description: "You don't have permission to delete this workflow.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Delete failed",
          description: "Failed to delete workflow. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleNodeSelect = useCallback((node: Node | null) => {
    setSelectedNode(node);
  }, []);

  const handleNodeUpdate = useCallback((updatedNode: Node) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === updatedNode.id ? updatedNode : n))
    );
    setHasUnsavedChanges(true);
  }, []);

  const handleAddBlock = useCallback(
    (blockType: BlockType, position?: { x: number; y: number }) => {
      const defaultPosition = { x: 100, y: 100 };
      const nodePosition = position || defaultPosition;

      const blockMetadata = getBlockMetadata(blockType);

      const newNode = {
        id: `${blockType}-${Date.now()}`,
        type: "custom",
        position: nodePosition,
        data: {
          label: blockMetadata.label,
          description: blockMetadata.description,
          blockType: blockType,
          nodeType: blockMetadata.category,
          iconName: blockMetadata.icon,
          isEnabled: true,
          config: { ...blockMetadata.defaultConfig },
        },
      };

      setNodes((nds) => [...nds, newNode]);
      setHasUnsavedChanges(true);

      toast({
        title: "Block Added",
        description: `Added ${blockMetadata.label} block to your workflow`,
        duration: 2000,
      });
    },
    [toast]
  );

  const handleAddCustomBlock = useCallback(
    (
      customBlock: CustomBlockDefinition,
      position?: { x: number; y: number }
    ) => {
      const defaultPosition = { x: 100, y: 100 };
      const nodePosition = position || defaultPosition;

      const newNode = {
        id: `custom-${Date.now()}`,
        type: "custom",
        position: nodePosition,
        data: {
          label: customBlock.name,
          description: customBlock.description,
          blockType: BlockType.CUSTOM,
          customBlockId: customBlock.id,
          nodeType: customBlock.category,
          iconName: "custom-block",
          isEnabled: true,
          config: {},
        },
      };

      setNodes((nds) => [...nds, newNode]);
      setHasUnsavedChanges(true);

      toast({
        title: "Custom Block Added",
        description: `Added ${customBlock.name} to your workflow`,
        duration: 2000,
      });
    },
    [toast]
  );

  const handleWorkflowDetailsChange = useCallback(
    (details: { name?: string; description?: string }) => {
      if (details.name !== undefined) setWorkflowName(details.name);
      if (details.description !== undefined)
        setWorkflowDescription(details.description);
      setHasUnsavedChanges(true);
    },
    []
  );

  const performExecution = async (execWorkflowId: string) => {
    setIsExecuting(true);
    try {
      const response = await fetch("/api/execute-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ workflowId: execWorkflowId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to enqueue execution");
      }

      const { executionId: execId } = await response.json();
      toast({
        title: "Execution started",
        description: `Execution ID: ${execId}`,
      });

      // Track execution in analytics
      try {
        // Example analytics call
        // track("Workflow Executed", { workflowId: execWorkflowId, nodeCount: nodes.length });
      } catch (analyticsError) {
        console.error("Analytics error:", analyticsError);
        // Non-critical error, don't show to user
      }
    } catch (error: any) {
      console.error("Execution error:", error);

      if (error.message?.includes("timeout")) {
        toast({
          title: "Execution timeout",
          description:
            "The server took too long to respond. Your workflow may still be running.",
          variant: "destructive",
        });
      } else if (error.message?.includes("permission")) {
        toast({
          title: "Permission denied",
          description: "You don't have permission to execute this workflow.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Execution failed",
          description:
            error.message || "Failed to execute workflow. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExecuteWorkflow = async () => {
    // Validate workflow before execution
    const validation = validateWorkflow(nodes, edges);
    if (!validation.valid) {
      toast({
        title: "Cannot execute",
        description: validation.message || "Invalid workflow configuration.",
        variant: "destructive",
      });
      return;
    }

    let execId = workflowId;
    if (!execId) {
      const name = window.prompt("Enter name for new workflow:", workflowName);
      if (!name || !name.trim()) {
        toast({
          title: "Execution cancelled",
          description: "Workflow name is required",
          variant: "destructive",
        });
        return;
      }
      try {
        setIsLoading(true);
        const saved = await workflowService.createWorkflow({
          name: name.trim(),
          description: workflowDescription,
          nodes,
          edges,
          is_public: false,
          tags: [],
        });
        execId = saved.id;
        setWorkflowId(execId);
        toast({ title: "Workflow created", description: `ID: ${execId}` });

        // Clear draft after successful save
        localStorage.removeItem("workflow_draft");
      } catch (error: any) {
        console.error("Save error:", error);
        toast({
          title: "Save failed",
          description: error.message || "Could not create workflow.",
          variant: "destructive",
        });
        return;
      } finally {
        setIsLoading(false);
      }
    }

    // Update workflow before execution to ensure latest changes are used
    try {
      await workflowService.updateWorkflow(execId, {
        nodes,
        edges,
      });
    } catch (error) {
      console.error("Pre-execution update failed:", error);
      // Continue with execution anyway, as this is not critical
    }

    // Execute the workflow
    await performExecution(execId);
  };

  const handleExit = () => {
    if (hasUnsavedChanges) {
      setIsExitDialogOpen(true);
    } else {
      router.push("/dashboard");
    }
  };

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const flowRef = useRef<any>(null);
  const toolbarRef = useRef<any>({
    canUndo: false,
    canRedo: false,
    undo: () => {},
    redo: () => {},
  });

  const handleDragStart = (
    event: React.DragEvent,
    blockType: BlockType,
    blockData: any
  ) => {
    console.log("Drag started:", blockType, blockData);
  };

  const handleToolbarAction = {
    undo: () => {
      if (toolbarRef.current && toolbarRef.current.undo) {
        toolbarRef.current.undo();
      }
    },
    redo: () => {
      if (toolbarRef.current && toolbarRef.current.redo) {
        toolbarRef.current.redo();
      }
    },
    zoomIn: () => {
      if (toolbarRef.current && toolbarRef.current.zoomIn) {
        toolbarRef.current.zoomIn();
      }
    },
    zoomOut: () => {
      if (toolbarRef.current && toolbarRef.current.zoomOut) {
        toolbarRef.current.zoomOut();
      }
    },
    fitView: () => {
      if (toolbarRef.current && toolbarRef.current.fitView) {
        toolbarRef.current.fitView();
      }
    },
    toggleGrid: () => {
      if (toolbarRef.current && toolbarRef.current.toggleGrid) {
        toolbarRef.current.toggleGrid();
        setIsGridVisible(!isGridVisible);
      }
    },
    save: () => {
      if (workflowId) {
        // Directly update without modal
        handleSaveWorkflow(workflowName, workflowDescription, [], false);
      } else {
        // Open modal to create new workflow
        setIsSaveDialogOpen(true);
      }
    },
    execute: handleExecuteWorkflow,
    delete: () => {
      if (toolbarRef.current && toolbarRef.current.deleteSelected) {
        toolbarRef.current.deleteSelected();
      }
    },
    copy: () => {
      if (toolbarRef.current && toolbarRef.current.duplicateSelected) {
        toolbarRef.current.duplicateSelected();
      }
    },
    alignHorizontal: (alignment: "left" | "center" | "right") => {
      if (toolbarRef.current && toolbarRef.current.alignHorizontal) {
        toolbarRef.current.alignHorizontal(alignment);
      }
    },
    alignVertical: (alignment: "top" | "center" | "bottom") => {
      if (toolbarRef.current && toolbarRef.current.alignVertical) {
        toolbarRef.current.alignVertical(alignment);
      }
    },
    reset: () => {
      if (toolbarRef.current && toolbarRef.current.resetCanvas) {
        toolbarRef.current.resetCanvas();
      }
    },
  };

  // Execution Preview & Step-Through
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewLogs, setPreviewLogs] = useState<
    Array<{ nodeId: string; message: string }>
  >([]);
  const [previewStep, setPreviewStep] = useState(0);

  const handlePreview = () => {
    // Validate workflow before preview
    const validation = validateWorkflow(nodes, edges);
    if (!validation.valid) {
      toast({
        title: "Cannot preview",
        description: validation.message || "Invalid workflow configuration.",
        variant: "destructive",
      });
      return;
    }

    // Generate mock preview logs
    const logs = nodes.map((n) => ({
      nodeId: n.id,
      message: `Mock output for block ${n.data.label} (${n.id})`,
    }));
    setPreviewLogs(logs);
    setPreviewStep(0);
    setIsPreviewing(true);
  };

  // Keyboard shortcuts: ensure form tags also capture shortcuts
  // Use 'mod' for cross-platform (Cmd on Mac, Ctrl on others)
  useHotkeys(
    "mod+s",
    (e) => {
      e.preventDefault();
      handleToolbarAction.save();
    },
    { enableOnFormTags: true }
  );
  useHotkeys(
    "mod+e",
    (e) => {
      e.preventDefault();
      handleToolbarAction.execute();
    },
    { enableOnFormTags: true }
  );
  useHotkeys("mod+z", (e) => {
    e.preventDefault();
    handleToolbarAction.undo();
  });
  useHotkeys("mod+y", (e) => {
    e.preventDefault();
    handleToolbarAction.redo();
  });
  useHotkeys("mod+shift+f", (e) => {
    e.preventDefault();
    handleToolbarAction.fitView();
  });
  useHotkeys("mod+g", (e) => {
    e.preventDefault();
    handleToolbarAction.toggleGrid();
  });
  useHotkeys("delete", (e) => {
    // Only trigger if not in an input field
    if (
      !(
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
    ) {
      e.preventDefault();
      handleToolbarAction.delete();
    }
  });
  useHotkeys("mod+d", (e) => {
    e.preventDefault();
    handleToolbarAction.copy();
  });

  // Live validation: disable execute if any required config missing
  const hasInvalidConfig = useMemo(() => {
    return !validateWorkflow(nodes, edges).valid;
  }, [nodes, edges]);

  const [configWarned, setConfigWarned] = useState(false);
  useEffect(() => setConfigWarned(false), [nodes]);

  const warnInvalidConfig = () => {
    if (hasInvalidConfig && !configWarned) {
      const validation = validateWorkflow(nodes, edges);
      toast({
        title: "Cannot execute",
        description:
          validation.message || "Please configure all blocks before executing.",
        variant: "destructive",
      });
      setConfigWarned(true);
    }
  };

  // Guided tour state for first-time users
  const [showTour, setShowTour] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const tourMessages = [
    "Drag blocks from the left sidebar to the canvas to start building your workflow.",
    "Connect blocks by dragging from the circle handles to link your steps.",
    "Configure each block by clicking on it and filling in the required fields.",
    "Click the Play button in the toolbar to execute your workflow.",
    "Use keyboard shortcuts like Ctrl+S to save and Ctrl+Z to undo changes.",
  ];

  useEffect(() => {
    const done = localStorage.getItem("builderTourComplete");
    if (!done) setShowTour(true);
  }, []);

  const endTour = () => {
    setShowTour(false);
    localStorage.setItem("builderTourComplete", "true");
  };

  const nextStep = () => {
    if (tourStep < tourMessages.length - 1) setTourStep((s) => s + 1);
    else endTour();
  };

  // Accessibility improvements - focus management
  const saveButtonRef = useRef<HTMLButtonElement>(null);
  const executeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    // When save dialog closes, focus the save button
    if (!isSaveDialogOpen && saveButtonRef.current) {
      saveButtonRef.current.focus();
    }
  }, [isSaveDialogOpen]);

  // Performance monitoring
  const renderCount = useRef(0);
  renderCount.current++;

  useEffect(() => {
    // Log excessive renders in development
    if (
      process.env.NODE_ENV === "development" &&
      renderCount.current % 10 === 0
    ) {
      console.log(`BuilderPage has rendered ${renderCount.current} times`);
    }
  });

  return (
    <AuthGate>
      {showTour && (
        <div
          className='fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center'
          role='dialog'
          aria-modal='true'
          aria-labelledby='tour-title'>
          <div className='bg-white rounded shadow-lg p-4 max-w-xs'>
            <h2 id='tour-title' className='text-lg font-semibold mb-2'>
              Workflow Builder Tour
            </h2>
            <p className='text-sm text-gray-800'>{tourMessages[tourStep]}</p>
            <div className='mt-4 flex justify-end space-x-2'>
              <Button size='sm' variant='ghost' onClick={endTour}>
                Skip
              </Button>
              <Button size='sm' onClick={nextStep}>
                {tourStep < tourMessages.length - 1 ? "Next" : "Done"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {isLoading ? (
        <div
          className='flex min-h-screen items-center justify-center'
          aria-live='polite'
          aria-busy='true'>
          <Loader2 className='h-12 w-12 animate-spin text-primary' />
        </div>
      ) : (
        <div className='flex flex-col h-screen'>
          <div className='border-b p-4 flex justify-between items-center bg-background'>
            <div className='flex items-center'>
              <Button
                variant='ghost'
                size='sm'
                onClick={handleExit}
                className='mr-4'
                aria-label='Go back to dashboard'>
                <ArrowLeft className='mr-2 h-4 w-4' />
                Back
              </Button>
              <h1 className='text-xl font-semibold'>
                {workflowName || "Untitled Workflow"}
              </h1>
              {hasUnsavedChanges && (
                <span className='ml-2 text-xs text-muted-foreground'>
                  (Unsaved changes)
                </span>
              )}
            </div>
            <div className='flex gap-2'>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant='outline'
                      onClick={() => setIsSaveDialogOpen(true)}
                      className='flex items-center gap-1'
                      disabled={isLoading}
                      ref={saveButtonRef}
                      aria-label='Save workflow'>
                      <Save className='h-4 w-4 mr-1' />
                      Save
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Save workflow (Ctrl+S)</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handlePreview}
                      className='flex items-center gap-1'
                      disabled={
                        isExecuting || nodes.length === 0 || hasInvalidConfig
                      }
                      aria-label='Preview workflow'>
                      Preview
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Preview workflow execution</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleExecuteWorkflow}
                      onMouseEnter={warnInvalidConfig}
                      className='flex items-center gap-1'
                      disabled={
                        isExecuting || nodes.length === 0 || hasInvalidConfig
                      }
                      ref={executeButtonRef}
                      aria-label='Execute workflow'>
                      {isExecuting ? (
                        <>
                          <Loader2 className='h-4 w-4 mr-1 animate-spin' />
                          Executing...
                        </>
                      ) : (
                        <>
                          <Play className='h-4 w-4 mr-1' />
                          Execute
                        </>
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Execute workflow (Ctrl+E)</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <div className='relative flex-1 overflow-hidden'>
            <div className='absolute top-4 left-1/2 transform -translate-x-1/2 z-10'>
              <WorkflowToolbar
                onUndo={handleToolbarAction.undo}
                onRedo={handleToolbarAction.redo}
                onZoomIn={handleToolbarAction.zoomIn}
                onZoomOut={handleToolbarAction.zoomOut}
                onFitView={handleToolbarAction.fitView}
                onToggleGrid={handleToolbarAction.toggleGrid}
                onSave={handleToolbarAction.save}
                onExecute={handleToolbarAction.execute}
                onDelete={handleToolbarAction.delete}
                onCopy={handleToolbarAction.copy}
                onAlignHorizontal={handleToolbarAction.alignHorizontal}
                onAlignVertical={handleToolbarAction.alignVertical}
                onReset={handleToolbarAction.reset}
                onHelp={() => {
                  setTourStep(0);
                  setShowTour(true);
                }}
                canUndo={toolbarRef.current?.canUndo || false}
                canRedo={toolbarRef.current?.canRedo || false}
                isGridVisible={isGridVisible}
                isExecuting={isExecuting}
              />
            </div>

            <ResizablePanelGroup direction='horizontal'>
              <ResizablePanel defaultSize={25} minSize={15} maxSize={30}>
                <BuilderSidebar
                  onAddNode={handleAddBlock}
                  workflowName={workflowName}
                  workflowDescription={workflowDescription}
                  onWorkflowDetailsChange={handleWorkflowDetailsChange}
                  nodes={nodes}
                  selectedNode={selectedNode}
                  onNodeSelect={handleNodeSelect}
                  onNodeUpdate={handleNodeUpdate}
                />
              </ResizablePanel>
              <ResizableHandle />
              <ResizablePanel defaultSize={80}>
                <FlowCanvas
                  initialNodes={memoizedNodes}
                  initialEdges={memoizedEdges}
                  onNodesChange={setNodes}
                  onEdgesChange={setEdges}
                  toolbarRef={toolbarRef}
                  onNodeSelect={handleNodeSelect}
                  onNodeUpdate={handleNodeUpdate}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          </div>
        </div>
      )}

      {/* Preview panel */}
      {isPreviewing && (
        <div
          className='fixed bottom-0 left-0 right-0 h-1/2 bg-background border-t shadow-lg p-4 overflow-auto'
          role='dialog'
          aria-labelledby='preview-title'>
          <div className='flex justify-between items-center mb-4'>
            <h3 id='preview-title' className='text-lg font-semibold'>
              Execution Preview
            </h3>
            <Button
              size='sm'
              variant='ghost'
              onClick={() => setIsPreviewing(false)}
              aria-label='Close preview'>
              Close
            </Button>
          </div>

          <div className='bg-muted p-4 rounded mb-4'>
            <div className='font-medium mb-2'>
              Node:{" "}
              {nodes.find((n) => n.id === previewLogs[previewStep]?.nodeId)
                ?.data.label || "Unknown"}
            </div>
            <pre className='bg-background p-2 rounded text-sm overflow-x-auto'>
              {previewLogs[previewStep]?.message || "No output available"}
            </pre>
          </div>

          <div className='flex justify-between items-center'>
            <Button
              size='sm'
              onClick={() => setPreviewStep((s) => Math.max(s - 1, 0))}
              disabled={previewStep === 0}
              aria-label='Previous step'>
              Previous
            </Button>
            <span className='text-sm'>
              Step {previewStep + 1} of {previewLogs.length}
            </span>
            <Button
              size='sm'
              onClick={() =>
                setPreviewStep((s) => Math.min(s + 1, previewLogs.length - 1))
              }
              disabled={previewStep === previewLogs.length - 1}
              aria-label='Next step'>
              Next
            </Button>
          </div>
        </div>
      )}

      <SaveWorkflowDialog
        open={isSaveDialogOpen}
        onOpenChange={setIsSaveDialogOpen}
        onSave={handleSaveWorkflow}
        initialName={workflowName}
        initialDescription={workflowDescription}
      />

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
            <AlertDialogAction onClick={() => router.push("/dashboard")}>
              Leave Without Saving
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this workflow? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWorkflow}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AuthGate>
  );
}

export function BuilderRedirectPage() {
  const uuid = uuidv4();
  redirect(`/builder?id=${uuid}`);
}
