"use client";

import { AuthGate } from "@/components/auth-gate";
import { BuilderSidebar } from "@/components/builder-sidebar";
import { FlowCanvas } from "@/components/flow-canvas";
import { SaveWorkflowDialog } from "@/components/save-workflow-dialog";
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
import { generateFlow } from "@/lib/api";
import { refineWorkflow } from "@/lib/api/workflow-generation";
import { workflowService } from "@/lib/services/workflow-service";
import { useFlowToolbar, useWorkflowStore } from "@/lib/store/workflow-store";
import { ArrowLeft, Loader2, Play, Save } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useWorkflowExecution } from "@/hooks/use-workflow-execution";
import { ExecutionStatusPanel } from "@/components/execution-status-panel";
import { useHotkeys } from "react-hotkeys-hook";

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
    setWorkflowId,
    setWorkflowName,
    setWorkflowDescription,
    setHasUnsavedChanges,
    isSaveDialogOpen,
    isExitDialogOpen,
    isDeleteDialogOpen,
    // isExecuting is no longer needed as we're using isExecutionPending from the hook
    isRedirecting,
    isPreviewMode,
    isGenerating,
    isRefining,
    isLoading,
    catalogTab,
    setSaveDialogOpen,
    setExitDialogOpen,
    setDeleteDialogOpen,
    setRedirecting,
    setPreviewMode,
    setGenerating,
    setRefining,
    setLoading,
    setCatalogTab,
    nlPrompt,
    generationStatus,
    partialNodes,
    isRefinementOpen,
    showExamples,
    recentPrompts,
    setNlPrompt,
    setGenerationStatus,
    setPartialNodes,
    setIsRefinementOpen,
    setShowExamples,
    setRecentPrompts,
    resetCanvas,
    addToHistory,
    resetFlow,
  } = useWorkflowStore();

  const toolbar = useFlowToolbar();

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
    (blockType: string) => {
      const newNode = {
        id: `${Date.now()}`,
        type: blockType,
        position: { x: 100, y: 100 },
        data: { label: `${blockType} Node` },
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
  const { executeWorkflow, isExecuting: isExecutionPending, executionStatus, isLoadingStatus } = useWorkflowExecution();

  // State to control execution panel visibility
  const [showExecutionPanel, setShowExecutionPanel] = useState(false);

  // State to track if we should execute after saving
  const [shouldExecuteAfterSave, setShouldExecuteAfterSave] = useState(false);

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

  const handleSaveWorkflow = useCallback(
    async (name: string, description: string, tags: string[] = []) => {
      try {
        setLoading(true);
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
            router.replace(`/builder?id=${savedWorkflow.id}`);
            localStorage.removeItem("workflow_draft"); // Clean up if not handled by store
            toast({
              title: "Workflow saved",
              description: "Your workflow has been saved successfully.",
            });
          }
        }

        setHasUnsavedChanges(false);
        setSaveDialogOpen(false);

        // Execute the workflow if it was requested before saving
        if (shouldExecuteAfterSave) {
          setShouldExecuteAfterSave(false);
          // Wait for the save to complete before executing the workflow
          await new Promise((resolve) => setTimeout(resolve, 500));
          executeWorkflow();
          setShowExecutionPanel(true);
        }
      } catch (error: any) {
        // Type assertion for error
        console.error("Error saving workflow:", error);
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
      workflowId,
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

  // This section has been moved to the top of the file to fix reference errors

  const handleExecuteWorkflow = useCallback(() => {
    // Only execute if we have a valid workflow
    if (nodes.length === 0) {
      toast({
        title: "Cannot execute",
        description: "Workflow has no components to execute.",
        variant: "destructive",
      });
      return;
    }

    // Check if workflow is saved (has an ID in the URL)
    if (!workflowId) {
      // Show save dialog first for unsaved workflows
      toast({
        title: "Save required",
        description: "Please save your workflow before executing it.",
      });
      setShouldExecuteAfterSave(true); // Set flag to execute after saving
      setSaveDialogOpen(true);
      return;
    }

    // Execute workflow and show status panel
    executeWorkflow();
    setShowExecutionPanel(true);
  }, [executeWorkflow, nodes, toast, workflowId, setSaveDialogOpen, setShouldExecuteAfterSave, setShowExecutionPanel]);

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
      toolbar.save();
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
    <AuthGate>
      <div className='flex flex-col h-screen'>
        {/* Header */}
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
            <Button
              variant='outline'
              onClick={() => setSaveDialogOpen(true)}
              className='flex items-center gap-1'
              disabled={isLoading}
              aria-label='Save workflow'>
              <Save className='h-4 w-4 mr-1' />
              Save
            </Button>
            <Button
              onClick={handleExecuteWorkflow}
              className='flex items-center gap-1'
              disabled={
                isExecutionPending || nodes.length === 0 || hasInvalidConfig
              }
              aria-label='Execute workflow'>
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
              onSave={() => setSaveDialogOpen(true)}
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
        <SaveWorkflowDialog
          open={isSaveDialogOpen}
          onOpenChange={setSaveDialogOpen}
          onSave={handleSaveWorkflow}
          initialName={workflowName}
          initialDescription={workflowDescription}
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
    </AuthGate>
  );
}
