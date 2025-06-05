"use client";

import { BuilderSidebar } from "@/components/builder-sidebar";
import { ExecutionStatusPanel } from "@/components/execution-status-panel";
import { FlowCanvas } from "@/components/flow-canvas";
import { SaveNewWorkflowDialog } from "@/components/save-workflow-dialog";
import { UpdateWorkflowDialog } from "@/components/update-workflow-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { useToast } from "@/components/ui/use-toast";
import { WorkflowRefinement } from "@/components/workflow-refinement";
import { WorkflowToolbar } from "@/components/workflow-toolbar";
import NlWorkflowGenerator from "@/components/workflow/nl-workflow-generator";
import { useWorkflowExecution } from "@/hooks/use-workflow-execution";
import { generateFlow } from "@/lib/api";
import { refineWorkflow } from "@/lib/api/workflow-generation";
import { workflowService } from "@/lib/services/workflow-service";
import { useFlowToolbar, useWorkflowStore } from "@/lib/store/workflow-store";
import { ArrowLeft, Loader2, Play, Save } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { useWorkflowValidation } from "@/lib/hooks/use-workflow-validation";
import { useSaveAndExecute } from "@/hooks/use-save-and-execute";
import { BlockType } from "@zyra/types";

export default function BuilderPage() {
  // Store hooks replacing local useState
  const {
    nodes,
    edges,
    addNode,
    setNodes,
    setEdges,
    workflowId,
    workflowName,
    workflowDescription,
    hasUnsavedChanges,
    executionId,
    tags,
    setWorkflowId,
    setWorkflowName,
    setWorkflowDescription,
    setHasUnsavedChanges,
    isSaveDialogOpen,
    isExitDialogOpen,
    // isExecuting is no longer needed as we're using isExecutionPending from the hook
    isGenerating,
    isRefining,
    isLoading,
    setSaveDialogOpen,
    setExitDialogOpen,
    setGenerating,
    setRefining,
    setLoading,
    nlPrompt,
    isRefinementOpen,
    setNlPrompt,
    setIsRefinementOpen,
    addToHistory,
    setRecentPrompts,
    setGenerationStatus,
  } = useWorkflowStore();

  const toolbar = useFlowToolbar();
  const { validateWorkflow } = useWorkflowValidation();
  const { mutateAsync: saveAndExecute, isPending: isSaveAndExecutePending } =
    useSaveAndExecute();

  // Other hooks
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id") || undefined;
  const toolbarRef = useRef(null);

  const [isClient, setIsClient] = useState(false);

  // Set isClient to true only after the component mounts on the client
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Render a fallback during SSR or before client-side mount

  // Load workflow on mount if ID is provided
  useEffect(() => {
    if (initialId) {
      (async () => {
        setLoading(true);
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
        } catch (error) {
          toast({
            title: "Error",
            description: error.message || "Failed to load workflow.",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      })();
    }
  }, [
    initialId,
    router,
    toast,
    setWorkflowId,
    setWorkflowName,
    setWorkflowDescription,
    setNodes,
    setEdges,
    setHasUnsavedChanges,
    setLoading,
  ]);

  // Handlers using store actions
  const handleAddBlock = useCallback(
    (blockType: BlockType) => {
      const newNode = {
        id: `${Date.now()}`,
        type: "custom",
        position: { x: 100, y: 100 },
        data: {
          label: `${blockType} Node`,
          blockType: blockType, // Store the actual block type enum value (e.g., "webhook")
          config: {},
        },
      };
      console.log("newNode", newNode);
      addNode(newNode);
      setHasUnsavedChanges(true);
    },
    [addNode, setHasUnsavedChanges]
  );

  const handleAddCustomBlock = useCallback(
    (customData: any) => {
      const newNode = {
        id: `${Date.now()}`,
        type: "custom",
        position: { x: 150, y: 150 },
        data: customData,
      };
      addNode(newNode);
      setHasUnsavedChanges(true);
    },
    [addNode, setHasUnsavedChanges]
  );

  // Use our custom hook for workflow execution with WebSocket-based real-time updates
  const {
    executeWorkflow,
    isExecuting: isExecutionPending,
    executionStatus,
    isLoadingStatus,
  } = useWorkflowExecution();

  // State to control execution panel visibility
  const [showExecutionPanel, setShowExecutionPanel] = useState(false);

  // State to track if we should execute after saving
  const [shouldExecuteAfterSave, setShouldExecuteAfterSave] = useState(false);

  // State for update dialog (separate from save dialog)
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);

  // Show execution panel when execution is pending or we have a status
  useEffect(() => {
    if (isExecutionPending || executionStatus) {
      setShowExecutionPanel(true);
    }
  }, [isExecutionPending, executionStatus, setShowExecutionPanel]);

  const handleWorkflowDetailsChange = useCallback(
    ({ name, description }: { name: string; description: string }) => {
      setWorkflowName(name);
      setWorkflowDescription(description);
      setHasUnsavedChanges(true);
    },
    [setWorkflowName, setWorkflowDescription, setHasUnsavedChanges]
  );

  // Utility to normalize blockType to lowercase string
  function normalizeNodesBlockType(nodes: any[]) {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        blockType:
          typeof node.data.blockType === "string"
            ? node.data.blockType.toLowerCase()
            : node.data.blockType,
      },
    }));
  }

  // Handler for saving new workflows
  const handleSaveNewWorkflow = useCallback(
    async (name: string, description: string, tags: string[] = []) => {
      try {
        setLoading(true);
        const normalizedNodes = normalizeNodesBlockType(nodes);
        console.log(
          "🟢 [DEBUG] Saving new workflow. Node blockTypes:",
          normalizedNodes.map((n) => n.data?.blockType)
        );
        const savedWorkflow = await workflowService.createWorkflow({
          name,
          description,
          nodes: normalizedNodes,
          edges,
          is_public: false,
          tags,
        });

        if (savedWorkflow && savedWorkflow.id) {
          setWorkflowId(savedWorkflow.id);
          router.replace(`/builder?id=${savedWorkflow.id}`);
          localStorage.removeItem("workflow_draft");
          toast({
            title: "Workflow saved",
            description: "Your workflow has been saved successfully.",
          });
        }

        setHasUnsavedChanges(false);
        setSaveDialogOpen(false);

        // Execute the workflow if it was requested before saving
        if (shouldExecuteAfterSave) {
          setShouldExecuteAfterSave(false);
          await new Promise((resolve) => setTimeout(resolve, 2000));
          executeWorkflow();
          setShowExecutionPanel(true);
        }
      } catch (error: any) {
        console.error("Error saving new workflow:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to save workflow.",
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
      setSaveDialogOpen,
      shouldExecuteAfterSave,
      setShouldExecuteAfterSave,
      executeWorkflow,
      setShowExecutionPanel,
      setLoading,
    ]
  );

  // Handler for updating existing workflows
  const handleUpdateWorkflow = useCallback(
    async (name: string, description: string, tags: string[] = []) => {
      try {
        setLoading(true);
        const normalizedNodes = normalizeNodesBlockType(nodes);
        console.log(
          "🟢 [DEBUG] Updating workflow. Node blockTypes:",
          normalizedNodes.map((n) => n.data?.blockType)
        );
        if (workflowId) {
          await workflowService.updateWorkflow(workflowId, {
            name,
            description,
            nodes: normalizedNodes,
            edges,
            is_public: false,
            tags,
          });
          toast({
            title: "Workflow updated",
            description: "Your workflow has been updated successfully.",
          });
        }

        setHasUnsavedChanges(false);
        setIsUpdateDialogOpen(false);

        // Execute the workflow if it was requested before saving
        if (shouldExecuteAfterSave) {
          setShouldExecuteAfterSave(false);
          await new Promise((resolve) => setTimeout(resolve, 1000));
          executeWorkflow();
          setShowExecutionPanel(true);
        }
      } catch (error: any) {
        console.error("Error updating workflow:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to update workflow.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    },
    [
      workflowId,
      nodes,
      edges,
      toast,
      setHasUnsavedChanges,
      setIsUpdateDialogOpen,
      shouldExecuteAfterSave,
      setShouldExecuteAfterSave,
      executeWorkflow,
      setShowExecutionPanel,
      setLoading,
    ]
  );

  // Handler for "Save as New" from update dialog
  const handleSaveAsNew = useCallback(
    async (name: string, description: string, tags: string[] = []) => {
      try {
        setLoading(true);
        const normalizedNodes = normalizeNodesBlockType(nodes);
        console.log(
          "🟢 [DEBUG] Save as new workflow. Node blockTypes:",
          normalizedNodes.map((n) => n.data?.blockType)
        );
        const savedWorkflow = await workflowService.createWorkflow({
          name,
          description,
          nodes: normalizedNodes,
          edges,
          is_public: false,
          tags,
        });

        if (savedWorkflow && savedWorkflow.id) {
          setWorkflowId(savedWorkflow.id);
          router.replace(`/builder?id=${savedWorkflow.id}`);
          toast({
            title: "New workflow created",
            description: "Your workflow has been saved as a new workflow.",
          });
        }

        setHasUnsavedChanges(false);
        setIsUpdateDialogOpen(false);

        // Execute the workflow if it was requested before saving
        if (shouldExecuteAfterSave) {
          setShouldExecuteAfterSave(false);
          await new Promise((resolve) => setTimeout(resolve, 2000));
          executeWorkflow();
          setShowExecutionPanel(true);
        }
      } catch (error: any) {
        console.error("Error saving as new workflow:", error);
        toast({
          title: "Error",
          description: error.message || "Failed to save as new workflow.",
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
      setIsUpdateDialogOpen,
      shouldExecuteAfterSave,
      setShouldExecuteAfterSave,
      executeWorkflow,
      setShowExecutionPanel,
      setLoading,
    ]
  );

  // Smart save function that handles both new and existing workflows
  const handleSmartSave = useCallback(async () => {
    if (workflowId) {
      // Existing workflow - show update modal
      setIsUpdateDialogOpen(true);
    } else {
      // New workflow - show save modal
      setSaveDialogOpen(true);
    }
  }, [workflowId, setSaveDialogOpen, setIsUpdateDialogOpen]);

  // Handle workflow execution with proper save logic
  const handleExecuteWorkflow = useCallback(async () => {
    try {
      console.log("🚀 handleExecuteWorkflow called");
      console.log("  workflowId:", workflowId);
      console.log("  nodes.length:", nodes.length);
      console.log("  edges.length:", edges.length);

      // 1. Comprehensive client-side validation using existing hook
      const validationResult = validateWorkflow(nodes, edges);
      console.log("  validation result:", validationResult);

      if (!validationResult.valid) {
        console.log("❌ Validation failed:", validationResult.message);
        toast({
          title: "Workflow Validation Failed",
          description:
            validationResult.message ||
            "Please fix the workflow issues before executing.",
          variant: "destructive",
        });

        // Highlight nodes with issues if available
        if (validationResult.issues) {
          console.log("Validation issues:", validationResult.issues);
          // Could add UI highlighting logic here
        }
        return;
      }

      console.log("✅ Validation passed");

      // 2. Handle saving before execution
      if (!workflowId) {
        // New workflow - show save modal and set flag to execute after save
        console.log("🔄 New workflow detected - showing save modal");
        console.log("  Setting shouldExecuteAfterSave to true");
        console.log("  Setting saveDialogOpen to true");

        setShouldExecuteAfterSave(true);
        setSaveDialogOpen(true);
        console.log(
          "  Modal should now be open. Current isSaveDialogOpen:",
          isSaveDialogOpen
        );
        return;
      } else if (hasUnsavedChanges) {
        // Existing workflow with changes - save directly
        console.log("💾 Existing workflow with changes - saving directly");
        toast({
          title: "Saving workflow...",
          description: "Saving changes before execution.",
        });

        setShouldExecuteAfterSave(true);
        setIsUpdateDialogOpen(true);
        return;

        // Give the database a moment to be consistent
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // 3. Normalize and update workflow before execution
      console.log("🔧 Normalizing block types before execution");
      const normalizedNodes = normalizeNodesBlockType(nodes);
      console.log(
        "🟢 [DEBUG] Normalized blockTypes for execution:",
        normalizedNodes.map((n) => n.data?.blockType)
      );

      if (workflowId) {
        // Update the workflow in database with normalized nodes
        await workflowService.updateWorkflow(workflowId, {
          name: workflowName,
          description: workflowDescription,
          nodes: normalizedNodes,
          edges,
          is_public: false,
          tags: tags || [],
        });
        console.log("✅ Workflow updated with normalized block types");
      }

      // 4. Execute workflow - server will do additional validation
      console.log("▶️ Starting execution");
      executeWorkflow();
      setShowExecutionPanel(true);
    } catch (error: any) {
      console.error("❌ Error in execution flow:", error);
      toast({
        title: "Execution Error",
        description: error.message || "Failed to execute workflow",
        variant: "destructive",
      });
    }
  }, [
    validateWorkflow,
    nodes,
    edges,
    toast,
    workflowId,
    hasUnsavedChanges,
    workflowName,
    workflowDescription,
    setIsUpdateDialogOpen,
    setShouldExecuteAfterSave,
    setSaveDialogOpen,
    executeWorkflow,
    setShowExecutionPanel,
    isSaveDialogOpen, // Add this dependency for debug
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
          setRecentPrompts((prev: string[]) => [nlPrompt, ...prev.slice(0, 4)]);
          setHasUnsavedChanges(true);
          toast({
            title: "Workflow updated",
            description: `Added ${result.nodes.length} new blocks based on your instructions.`,
          });
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to generate workflow.",
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

  const handleExit = useCallback(() => {
    if (hasUnsavedChanges) {
      setExitDialogOpen(true);
    } else {
      router.push("/dashboard");
    }
  }, [hasUnsavedChanges, setExitDialogOpen, router]);

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

  // Validation (example) - with null check to prevent errors during drag operations
  console.log("nodes", nodes);
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
        <div className='flex justify-between items-center p-4 border-b'>
          <div className='flex items-center gap-2'>
            <Button variant='ghost' size='sm' onClick={handleExit}>
              <ArrowLeft className='h-4 w-4 mr-1' />
              Back
            </Button>
            <span className='text-lg font-semibold'>
              {workflowName || "Untitled Workflow"}
            </span>
            {hasUnsavedChanges && (
              <span className='text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full'>
                Unsaved
              </span>
            )}
          </div>
          <div className='flex items-center gap-2'>
            <Button variant='outline' size='sm' onClick={handleSmartSave}>
              <Save className='h-4 w-4 mr-1' />
              {workflowId ? "Save" : "Save As..."}
            </Button>
            <Button
              onClick={handleExecuteWorkflow}
              disabled={isExecutionPending || hasInvalidConfig}
              className='bg-blue-500 hover:bg-blue-600 text-white'>
              {isExecutionPending ? (
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

        {/* Main content */}
        <div className='relative flex-1 overflow-hidden'>
          <div className='absolute top-4 left-1/2 transform -translate-x-1/2 z-10'>
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

          <ResizablePanelGroup direction='horizontal'>
            <ResizablePanel defaultSize={25} minSize={15} maxSize={30}>
              <BuilderSidebar
                onAddNode={handleAddBlock}
                onAddCustomBlock={handleAddCustomBlock}
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
            <ResizablePanel defaultSize={75}>
              <div className='relative h-full'>
                <FlowCanvas executionId={executionId} />

                {/* Execution Status Panel - displays when a workflow is being executed */}
                {showExecutionPanel && (
                  <div className='absolute bottom-4 right-4 z-50 w-96'>
                    <ExecutionStatusPanel
                      executionStatus={executionStatus || undefined}
                      isLoadingStatus={isLoadingStatus}
                      onClose={() => setShowExecutionPanel(false)}
                    />
                  </div>
                )}
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>

        {/* AI Workflow Generation Component */}
        <div className='absolute bottom-8 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-2xl px-4'>
          <Card className='bg-background/80 backdrop-blur-sm border shadow-lg p-4'>
            <NlWorkflowGenerator
              onNodesGenerated={(newNodes, newEdges) => {
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
          </Card>
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
                  } catch (error) {
                    toast({
                      title: "Error",
                      description:
                        error.message || "Failed to refine workflow.",
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
          open={isSaveDialogOpen}
          onOpenChange={setSaveDialogOpen}
          onSave={handleSaveNewWorkflow}
          initialName={workflowName}
          initialDescription={workflowDescription}
        />

        <UpdateWorkflowDialog
          open={isUpdateDialogOpen}
          onOpenChange={setIsUpdateDialogOpen}
          onUpdate={handleUpdateWorkflow}
          onSaveAsNew={handleSaveAsNew}
          currentName={workflowName || "Untitled Workflow"}
          currentDescription={workflowDescription || ""}
          currentTags={[]}
        />

        {/* Exit Confirmation Dialog */}
        <Dialog open={isExitDialogOpen} onOpenChange={setExitDialogOpen}>
          <DialogContent>
            <h2>Unsaved Changes</h2>
            <p>You have unsaved changes. Do you want to save before exiting?</p>
            <div className='flex gap-2'>
              <Button
                onClick={async () => {
                  await handleSaveWorkflow(workflowName, workflowDescription);
                  router.push("/dashboard");
                }}>
                Save and Exit
              </Button>
              <Button
                variant='destructive'
                onClick={() => {
                  setExitDialogOpen(false);
                  router.push("/dashboard");
                }}>
                Discard
              </Button>
              <Button
                variant='outline'
                onClick={() => setExitDialogOpen(false)}>
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
