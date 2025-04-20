"use client";

import type React from "react";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthGate } from "@/components/auth-gate";
import { FlowCanvas } from "@/components/flow-canvas";
import { SaveWorkflowDialog } from "@/components/save-workflow-dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { generateFlow } from "@/lib/api";
import { workflowService } from "@/lib/services/workflow-service";
import { Loader2, Save, Play, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";
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
import { createClient } from "@/lib/supabase/client";
import { redirect } from "next/navigation";
import { v4 as uuidv4 } from "uuid";

// Import types from flow-canvas
import type { Node, Edge } from "@/components/flow-canvas";
import { ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { type BlockType, getBlockMetadata } from "@/types/workflow";
import type { CustomBlockDefinition } from "@/types/custom-block";
import { BuilderSidebar } from "@/components/builder-sidebar";
import { WorkflowToolbar } from "@/components/workflow-toolbar";

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
  const [isMounted, setIsMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [catalogTab, setCatalogTab] = useState("blocks");
  const [isGridVisible, setIsGridVisible] = useState(true);
  const { toast } = useToast();
  const router = useRouter();
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [workflowId, setWorkflowId] = useState<string | undefined>(undefined);
  const supabase = createClient();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const flowRef = useRef<any>(null);
  const toolbarRef = useRef<any>({
    canUndo: false,
    canRedo: false,
    undo: () => {},
    redo: () => {},
  });

  useEffect(() => {
    setIsMounted(true);
    // Simulate loading for a smoother experience
    loadingTimeoutRef.current = setTimeout(() => {
      setIsLoading(false);
    }, 1000);

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  // Track changes to set unsaved changes flag
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      setHasUnsavedChanges(true);
    }
  }, [nodes, edges]);

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
    } catch (error) {
      toast({
        title: "Generation failed",
        description: "Failed to generate workflow. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveWorkflow = async (
    name: string,
    description: string,
    tags: string[]
  ) => {
    try {
      setIsLoading(true);

      // If we have a workflowId, update the existing workflow
      if (workflowId) {
        const updatedWorkflow = await workflowService.updateWorkflow(
          workflowId,
          {
            name,
            description,
            nodes,
            edges,
            is_public: false,
            tags,
          }
        );

        toast({
          title: "Workflow updated",
          description: "Your workflow has been updated successfully.",
        });
      } else {
        // Create a new workflow
        const savedWorkflow = await workflowService.createWorkflow({
          name,
          description,
          nodes,
          edges,
          is_public: false,
          tags,
        });

        // Set the workflow ID after saving
        if (savedWorkflow && savedWorkflow.id) {
          setWorkflowId(savedWorkflow.id);
          // Update the URL to include the workflow ID
          router.replace(`/builder?id=${savedWorkflow.id}`);
        }

        toast({
          title: "Workflow saved",
          description: "Your workflow has been saved successfully.",
        });
      }

      setHasUnsavedChanges(false);
      setIsSaveDialogOpen(false);
    } catch (error) {
      console.error("Error saving workflow:", error);
      toast({
        title: "Save failed",
        description: "Failed to save workflow. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add a function to load an existing workflow
  const loadWorkflow = async (id: string) => {
    try {
      setIsLoading(true);
      const workflow = await workflowService.getWorkflow(id);

      if (workflow) {
        setWorkflowId(workflow.id);
        setWorkflowName(workflow.name);
        setWorkflowDescription(workflow.description || "");
        setNodes(workflow.nodes || []);
        setEdges(workflow.edges || []);

        toast({
          title: "Workflow loaded",
          description: "Your workflow has been loaded successfully.",
        });

        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error("Error loading workflow:", error);
      toast({
        title: "Load failed",
        description: "Failed to load workflow. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add a function to delete a workflow
  const handleDeleteWorkflow = async () => {
    if (!workflowId) return;

    try {
      setIsLoading(true);
      await workflowService.deleteWorkflow(workflowId);

      toast({
        title: "Workflow deleted",
        description: "Your workflow has been deleted successfully.",
      });

      router.push("/workflows");
    } catch (error) {
      console.error("Error deleting workflow:", error);
      toast({
        title: "Delete failed",
        description: "Failed to delete workflow. Please try again.",
        variant: "destructive",
      });
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

      // Get block metadata
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

      // Show a success toast
      toast({
        title: "Block Added",
        description: `Added ${blockMetadata.label} block to your workflow`,
        duration: 2000,
      });
    },
    [toast]
  );

  // Handle adding a custom block
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

      // Show a success toast
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

  const handleExecuteWorkflow = async () => {
    if (nodes.length === 0) {
      toast({
        title: "Cannot execute",
        description: "Your workflow is empty. Please add some blocks first.",
        variant: "destructive",
      });
      return;
    }

    setIsExecuting(true);
    try {
      // Mock execution for demo
      await new Promise((resolve) => setTimeout(resolve, 2000));
      toast({
        title: "Workflow executed",
        description: "Your workflow has been executed successfully.",
      });
    } catch (error) {
      toast({
        title: "Execution failed",
        description: "Failed to execute workflow. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExit = () => {
    if (hasUnsavedChanges) {
      setIsExitDialogOpen(true);
    } else {
      router.push("/dashboard");
    }
  };

  // Check for workflow ID in URL params and load the workflow if it exists
  const searchParams = useSearchParams();

  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      setWorkflowId(id);
      loadWorkflow(id);
    }
  }, [searchParams]);

  // Add a useEffect to handle auto-saving
  useEffect(() => {
    if (!workflowId || !hasUnsavedChanges || nodes.length === 0) return;

    const autoSaveTimeout = setTimeout(async () => {
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
          description: "Your workflow has been automatically saved.",
          duration: 2000,
        });
      } catch (error) {
        console.error("Auto-save error:", error);
      }
    }, 30000); // Auto-save after 30 seconds of inactivity

    return () => clearTimeout(autoSaveTimeout);
  }, [
    workflowId,
    hasUnsavedChanges,
    nodes,
    edges,
    workflowName,
    workflowDescription,
    toast,
  ]);

  // Handle drag start from the catalog
  const handleDragStart = (
    event: React.DragEvent,
    blockType: BlockType,
    blockData: any
  ) => {
    // This function is passed to BlockCatalog but the actual drag handling
    // is done within the BlockCatalog component itself
    console.log("Drag started:", blockType, blockData);
  };

  // Toolbar action handlers
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
      setIsSaveDialogOpen(true);
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

  if (!isMounted || isLoading) {
    return (
      <div className='flex h-screen items-center justify-center bg-background'>
        <motion.div
          className='text-center'
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}>
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
              rotate: [0, 2, -2, 0],
            }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              repeatType: "reverse",
            }}
            className='mb-6 flex justify-center'>
            <Loader2 className='h-12 w-12 text-primary animate-spin' />
          </motion.div>
          <h2 className='text-2xl font-semibold mb-2'>
            Loading Workflow Builder
          </h2>
          <p className='text-muted-foreground'>
            Please wait while we initialize your canvas
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <AuthGate>
      <div className='flex flex-col h-screen'>
        <div className='border-b p-4 flex justify-between items-center bg-background'>
          <div className='flex items-center'>
            <Button
              variant='ghost'
              size='sm'
              onClick={handleExit}
              className='mr-4'>
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
            <Button
              variant='outline'
              onClick={() => setIsSaveDialogOpen(true)}
              className='flex items-center gap-1'
              disabled={isLoading}>
              <Save className='h-4 w-4 mr-1' />
              Save
            </Button>
            <Button
              onClick={handleExecuteWorkflow}
              className='flex items-center gap-1'
              disabled={isExecuting || nodes.length === 0}>
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
          </div>
        </div>

        <div className='relative flex-1 overflow-hidden'>
          {/* Toolbar positioned at the top of the canvas */}
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
              />
            </ResizablePanel>
            <ResizablePanel defaultSize={80}>
              <FlowCanvas
                initialNodes={nodes}
                initialEdges={edges}
                onNodesChange={setNodes}
                onEdgesChange={setEdges}
                toolbarRef={toolbarRef}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
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
  redirect(`/builder/${uuid}`);
}
