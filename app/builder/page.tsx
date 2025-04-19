"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { AuthGate } from "@/components/auth-gate"
import { BuilderSidebar } from "@/components/builder-sidebar"
import { CommandInput } from "@/components/command-input"
import { FlowCanvas } from "@/components/flow-canvas"
import { SaveWorkflowDialog } from "@/components/save-workflow-dialog"
import { BlockConfigPanel } from "@/components/block-config-panel"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { generateFlow } from "@/lib/api"
import { workflowService } from "@/lib/services/workflow-service"
import { Save, ArrowLeft, Play, Undo, Redo, Copy, Trash2, Loader2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { motion, AnimatePresence } from "framer-motion"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

// Import types from flow-canvas
import type { Node, Edge } from "@/components/flow-canvas"
import { cn } from "@/lib/utils"

export default function BuilderPage() {
  const [nodes, setNodes] = useState<Node[]>([])
  const [edges, setEdges] = useState<Edge[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false)
  const [isExitDialogOpen, setIsExitDialogOpen] = useState(false)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [workflowName, setWorkflowName] = useState("Untitled Workflow")
  const [workflowDescription, setWorkflowDescription] = useState("")
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [showTooltip, setShowTooltip] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()
  const router = useRouter()
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    setIsMounted(true)
    // Simulate loading for a smoother experience
    loadingTimeoutRef.current = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current)
      }
    }
  }, [])

  // Track changes to set unsaved changes flag
  useEffect(() => {
    if (nodes.length > 0 || edges.length > 0) {
      setHasUnsavedChanges(true)
    }
  }, [nodes, edges])

  const handleGenerate = async (prompt: string) => {
    setIsGenerating(true)
    try {
      const result = await generateFlow(prompt)
      if (result.nodes && result.edges) {
        setNodes(result.nodes)
        setEdges(result.edges)
        toast({
          title: "Workflow generated",
          description: "Your workflow has been generated successfully.",
        })
      }
    } catch (error) {
      toast({
        title: "Generation failed",
        description: "Failed to generate workflow. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveWorkflow = async (name: string, description: string, tags: string[]) => {
    try {
      await workflowService.createWorkflow({
        name,
        description,
        nodes,
        edges,
        is_public: false,
        tags,
      })

      toast({
        title: "Workflow saved",
        description: "Your workflow has been saved successfully.",
      })

      setHasUnsavedChanges(false)
      setIsSaveDialogOpen(false)
      router.push("/dashboard")
    } catch (error) {
      toast({
        title: "Save failed",
        description: "Failed to save workflow. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleNodeSelect = useCallback((node: Node | null) => {
    setSelectedNode(node)
  }, [])

  const handleNodeUpdate = useCallback((updatedNode: Node) => {
    setNodes((nds) => nds.map((n) => (n.id === updatedNode.id ? updatedNode : n)))
    setHasUnsavedChanges(true)
  }, [])

  const handleAddNode = useCallback((block: any) => {
    const position = { x: 100, y: 100 }
    const newNode = {
      id: `${block.id}-${Date.now()}`,
      type: "custom",
      position,
      data: {
        label: block.name,
        icon: block.id,
        blockType: block.id,
        description: block.description,
        isEnabled: true,
        config: {},
      },
    }
    setNodes((nds) => [...nds, newNode])
    setHasUnsavedChanges(true)
  }, [])

  const handleWorkflowDetailsChange = useCallback((details: { name?: string; description?: string }) => {
    if (details.name !== undefined) setWorkflowName(details.name)
    if (details.description !== undefined) setWorkflowDescription(details.description)
    setHasUnsavedChanges(true)
  }, [])

  const handleExecuteWorkflow = async () => {
    if (nodes.length === 0) {
      toast({
        title: "Cannot execute",
        description: "Your workflow is empty. Please add some blocks first.",
        variant: "destructive",
      })
      return
    }

    setIsExecuting(true)
    try {
      // Mock execution for demo
      await new Promise((resolve) => setTimeout(resolve, 2000))
      toast({
        title: "Workflow executed",
        description: "Your workflow has been executed successfully.",
      })
    } catch (error) {
      toast({
        title: "Execution failed",
        description: "Failed to execute workflow. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsExecuting(false)
    }
  }

  const handleExit = () => {
    if (hasUnsavedChanges) {
      setIsExitDialogOpen(true)
    } else {
      router.push("/dashboard")
    }
  }

  if (!isMounted || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
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
            className="mb-6 flex justify-center"
          >
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
          </motion.div>
          <h2 className="text-2xl font-semibold mb-2">Loading Workflow Builder</h2>
          <p className="text-muted-foreground">Please wait while we initialize your canvas</p>
        </motion.div>
      </div>
    )
  }

  return (
    <AuthGate>
      <div className="flex h-screen overflow-hidden">
        <BuilderSidebar
          onAddNode={handleAddNode}
          workflowName={workflowName}
          workflowDescription={workflowDescription}
          onWorkflowDetailsChange={handleWorkflowDetailsChange}
        />
        <motion.main
          className="relative flex flex-1 flex-col overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.2 }}
        >
          <motion.div
            className="flex h-14 items-center justify-between border-b bg-card px-4"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.3 }}
          >
            <div className="flex items-center">
              <motion.div whileHover={{ x: -2 }} whileTap={{ scale: 0.95 }}>
                <Button variant="ghost" size="sm" onClick={handleExit}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              </motion.div>
              <motion.div
                className="ml-4 text-sm font-medium"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {workflowName || "Untitled Workflow"}
              </motion.div>
              {hasUnsavedChanges && (
                <motion.div
                  className="ml-2 text-xs text-muted-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  (Unsaved changes)
                </motion.div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip open={showTooltip === "undo"} onOpenChange={(open) => setShowTooltip(open ? "undo" : null)}>
                  <TooltipTrigger asChild>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onMouseEnter={() => setShowTooltip("undo")}
                        onMouseLeave={() => setShowTooltip(null)}
                      >
                        <Undo className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip open={showTooltip === "redo"} onOpenChange={(open) => setShowTooltip(open ? "redo" : null)}>
                  <TooltipTrigger asChild>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onMouseEnter={() => setShowTooltip("redo")}
                        onMouseLeave={() => setShowTooltip(null)}
                      >
                        <Redo className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent>Redo (Ctrl+Shift+Z)</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip open={showTooltip === "copy"} onOpenChange={(open) => setShowTooltip(open ? "copy" : null)}>
                  <TooltipTrigger asChild>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onMouseEnter={() => setShowTooltip("copy")}
                        onMouseLeave={() => setShowTooltip(null)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent>Copy Selected (Ctrl+C)</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip
                  open={showTooltip === "delete"}
                  onOpenChange={(open) => setShowTooltip(open ? "delete" : null)}
                >
                  <TooltipTrigger asChild>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onMouseEnter={() => setShowTooltip("delete")}
                        onMouseLeave={() => setShowTooltip(null)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent>Delete Selected (Delete)</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip
                  open={showTooltip === "execute"}
                  onOpenChange={(open) => setShowTooltip(open ? "execute" : null)}
                >
                  <TooltipTrigger asChild>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleExecuteWorkflow}
                        disabled={isExecuting || nodes.length === 0}
                        className={cn(
                          "transition-all duration-200",
                          nodes.length > 0 && !isExecuting && "hover:bg-primary/10 hover:text-primary",
                        )}
                        onMouseEnter={() => setShowTooltip("execute")}
                        onMouseLeave={() => setShowTooltip(null)}
                      >
                        {isExecuting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Executing...
                          </>
                        ) : (
                          <>
                            <Play className="mr-2 h-4 w-4" />
                            Execute
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent>Run this workflow</TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Button size="sm" onClick={() => setIsSaveDialogOpen(true)} className="bg-primary hover:bg-primary/90">
                  <Save className="mr-2 h-4 w-4" />
                  Save Workflow
                </Button>
              </motion.div>
            </div>
          </motion.div>
          <div className="relative flex flex-1 overflow-hidden">
            <div className="flex-1 overflow-hidden">
              <FlowCanvas
                nodes={nodes}
                edges={edges}
                setNodes={setNodes}
                setEdges={setEdges}
                onNodeSelect={handleNodeSelect}
              />
            </div>
            <AnimatePresence>
              {selectedNode && (
                <motion.div
                  initial={{ opacity: 0, x: 300 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 300 }}
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                >
                  <BlockConfigPanel
                    node={selectedNode}
                    onUpdate={handleNodeUpdate}
                    onClose={() => setSelectedNode(null)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <CommandInput onGenerate={handleGenerate} isGenerating={isGenerating} />
        </motion.main>
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
              You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => router.push("/dashboard")}>Leave Without Saving</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AuthGate>
  )
}
