"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { v4 as uuidv4 } from "uuid"
import { toast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Loader2, Save, Play, ArrowLeft, Trash2 } from "lucide-react"
import { BlockCatalog } from "@/components/block-catalog"
import { BlockConfigPanel } from "@/components/block-config-panel"
import { FlowCanvas } from "@/components/flow-canvas"
import { ExecutionLogsList } from "@/components/execution-logs-list"
import { ExecutionNodeExecutions } from "@/components/execution/execution-node-executions"
import { workflowExecutionEngine } from "@/lib/workflow/execution-engine"

export default function BuilderPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const uuid = params.uuid as string

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedNode, setSelectedNode] = useState<any>(null)
  const [workflow, setWorkflow] = useState<any>({
    name: "Untitled Workflow",
    description: "",
    nodes: [],
    edges: [],
    tags: [],
    is_public: false,
  })
  const [hasChanges, setHasChanges] = useState(false)
  const [activeTab, setActiveTab] = useState("builder")
  const [executionLogs, setExecutionLogs] = useState<any[]>([])
  const [nodes, setNodes] = useState<any[]>([])
  const [executionId, setExecutionId] = useState<string | null>(null)

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const canvasRef = useRef<any>(null)

  // Load workflow data
  useEffect(() => {
    const fetchWorkflow = async () => {
      try {
        setIsLoading(true)

        // Check if user is authenticated
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          // Redirect to login if not authenticated
          router.push("/login?redirect=/builder/" + uuid)
          return
        }

        // Fetch workflow data
        const { data, error } = await supabase.from("workflows").select("*").eq("id", uuid).single()

        if (error) {
          // If workflow doesn't exist, create a new one
          if (error.code === "PGRST116") {
            const newWorkflow = {
              id: uuid,
              user_id: user.id,
              name: "Untitled Workflow",
              description: "",
              nodes: [],
              edges: [],
              tags: [],
              is_public: false,
            }

            const { error: insertError } = await supabase.from("workflows").insert(newWorkflow)

            if (insertError) {
              throw new Error(`Failed to create workflow: ${insertError.message}`)
            }

            setWorkflow(newWorkflow)
          } else {
            throw new Error(`Failed to fetch workflow: ${error.message}`)
          }
        } else {
          setWorkflow(data)
          setNodes(data.nodes || [])

          // Fetch execution logs
          fetchExecutionLogs()
        }
      } catch (error: any) {
        console.error("Error loading workflow:", error)
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchWorkflow()
  }, [uuid, router, supabase])

  // Fetch execution logs
  const fetchExecutionLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("workflow_executions")
        .select("*")
        .eq("workflow_id", uuid)
        .order("started_at", { ascending: false })

      if (error) {
        throw new Error(`Failed to fetch execution logs: ${error.message}`)
      }

      setExecutionLogs(data || [])
    } catch (error: any) {
      console.error("Error fetching execution logs:", error)
    }
  }

  // Save workflow
  const saveWorkflow = async () => {
    try {
      if (!canvasRef.current) return

      setIsSaving(true)

      // Get current flow data
      const { nodes, edges } = canvasRef.current.getFlow()

      // Update workflow data
      const updatedWorkflow = {
        ...workflow,
        nodes,
        edges,
        updated_at: new Date().toISOString(),
      }

      // Save to Supabase
      const { error } = await supabase.from("workflows").update(updatedWorkflow).eq("id", uuid)

      if (error) {
        throw new Error(`Failed to save workflow: ${error.message}`)
      }

      setWorkflow(updatedWorkflow)
      setHasChanges(false)

      toast({
        title: "Workflow Saved",
        description: "Your workflow has been saved successfully.",
      })
    } catch (error: any) {
      console.error("Error saving workflow:", error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Auto-save workflow
  const autoSaveWorkflow = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    if (hasChanges) {
      saveTimeoutRef.current = setTimeout(() => {
        saveWorkflow()
      }, 10000) // Auto-save after 10 seconds of inactivity
    }
  }, [hasChanges])

  // Set up auto-save
  useEffect(() => {
    autoSaveWorkflow()

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [autoSaveWorkflow])

  // Execute workflow via API
  const executeWorkflow = async () => {
    console.log('executeWorkflow triggered for workflow:', uuid)
    try {
      await saveWorkflow()
      setIsExecuting(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error("You must be logged in to execute a workflow")
      console.log('Calling /api/executions', { workflowId: uuid })
      const res = await fetch('/api/executions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workflowId: uuid }),
      })
      const json = await res.json()
      console.log('POST /api/executions response:', res.status, json)

      if (!res.ok) throw new Error(json.error || 'Failed to start execution')
      setExecutionId(json.executionId)
      setActiveTab('logs')
      toast({ title: 'Execution Started', description: `ID: ${json.executionId}` })
    } catch (error: any) {
      console.error('Error starting execution:', error)
      toast({ title: 'Execution Error', description: error.message, variant: 'destructive' })
    } finally {
      setIsExecuting(false)
    }
  }

  // Delete workflow
  const deleteWorkflow = async () => {
    try {
      const { error } = await supabase.from("workflows").delete().eq("id", uuid)

      if (error) {
        throw new Error(`Failed to delete workflow: ${error.message}`)
      }

      toast({
        title: "Workflow Deleted",
        description: "Your workflow has been deleted successfully.",
      })

      // Redirect to workflows list
      router.push("/workflows")
    } catch (error: any) {
      console.error("Error deleting workflow:", error)
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    }
  }

  // Handle flow changes
  const handleFlowChange = () => {
    setHasChanges(true)
  }

  // Handle node selection
  const handleNodeSelect = (node: any) => {
    setSelectedNode(node)
  }

  // Handle node update
  const handleNodeUpdate = (updatedNode: any) => {
    if (canvasRef.current) {
      canvasRef.current.updateNode(updatedNode)
      setHasChanges(true)

      // Also update the nodes state to ensure it's in sync
      setNodes((nds) => nds.map((n) => (n.id === updatedNode.id ? updatedNode : n)))

      // Show a success toast
      toast({
        title: "Node Updated",
        description: "Node configuration has been updated",
        duration: 2000,
      })
    }
  }

  // Handle adding a node
  const handleAddNode = (block: any) => {
    if (canvasRef.current) {
      const newNodeId = `node_${uuidv4().substring(0, 8)}`

      const newNode = {
        id: newNodeId,
        type: block.id,
        position: { x: 100, y: 100 }, // This will be adjusted by the FlowCanvas component
        data: {
          label: block.name,
          description: block.description,
          icon: block.icon,
          nodeType: block.nodeType,
          config: block.config || {},
        },
      }

      canvasRef.current.addNode(newNode)
      setHasChanges(true)

      // Show a success toast
      toast({
        title: "Block Added",
        description: `Added ${block.name} block to the workflow`,
        duration: 2000,
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push("/workflows")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{workflow.name}</h1>
            <p className="text-sm text-muted-foreground">{workflow.description || "No description"}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>

          <Button variant="outline" size="sm" onClick={saveWorkflow} disabled={isSaving || !hasChanges}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save
              </>
            )}
          </Button>

          <Button variant="default" size="sm" onClick={executeWorkflow} disabled={isExecuting}>
            {isExecuting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Executing...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Execute
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar - Block catalog */}
        <div className="w-64 border-r bg-background">
          <BlockCatalog onAddNode={handleAddNode} />
        </div>

        {/* Main area */}
        <div className="flex-1 flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="mx-4 mt-4">
              <TabsTrigger value="builder">Builder</TabsTrigger>
              <TabsTrigger value="logs">Execution Logs</TabsTrigger>
            </TabsList>

            <TabsContent value="builder" className="flex-1 p-0 m-0">
              <div className="h-full">
                <FlowCanvas
                  ref={canvasRef}
                  initialNodes={workflow.nodes}
                  initialEdges={workflow.edges}
                  onFlowChange={handleFlowChange}
                  onNodeSelect={handleNodeSelect}
                />
              </div>
            </TabsContent>

            <TabsContent value="logs" className="flex-1 p-4 m-0 overflow-auto">
              {executionId ? (
                <ExecutionNodeExecutions executionId={executionId} />
              ) : (
                <ExecutionLogsList logs={executionLogs} workflowId={uuid} />
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Right sidebar - Node configuration */}
        {selectedNode && (
          <div className="border-l">
            <BlockConfigPanel node={selectedNode} onUpdate={handleNodeUpdate} onClose={() => setSelectedNode(null)} />
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your workflow and all associated execution
              logs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteWorkflow} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
