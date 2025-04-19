"use client"

import type React from "react"

import { useCallback, useState, useEffect, useRef } from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Trash2, ZoomIn, ZoomOut, Maximize2, MousePointer2, Hand } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { FallbackFlowCanvas } from "./fallback-flow-canvas"

// Import ReactFlow
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlowProvider,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  useReactFlow,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
} from "reactflow"

// Import the CSS
import "reactflow/dist/style.css"

// Import CustomNode
import CustomNode from "@/components/custom-node"

interface ReactFlowWrapperProps {
  nodes: Node[]
  edges: Edge[]
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>
  onNodeSelect?: (node: Node | null) => void
}

const nodeTypes = {
  custom: CustomNode,
}

function FlowContent({ nodes, edges, setNodes, setEdges, onNodeSelect }: ReactFlowWrapperProps) {
  const { resolvedTheme } = useTheme()
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [interactionMode, setInteractionMode] = useState<"select" | "pan">("select")
  const [showTooltip, setShowTooltip] = useState<string | null>(null)
  const [isZooming, setIsZooming] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const reactFlowInstance = useReactFlow()
  const fitViewTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const onNodesChange: OnNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // Handle node selection
      const selectChange = changes.find((change) => change.type === "select" && change.selected !== undefined)

      if (selectChange && "id" in selectChange) {
        const nodeId = selectChange.selected ? selectChange.id : null
        setSelectedNodeId(nodeId)

        if (onNodeSelect) {
          const selectedNode = nodeId ? nodes.find((n) => n.id === nodeId) || null : null
          onNodeSelect(selectedNode)
        }
      }

      setNodes((nds) => applyNodeChanges(changes, nds))
    },
    [nodes, onNodeSelect, setNodes],
  )

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setEdges((eds) => applyEdgeChanges(changes, eds))
    },
    [setEdges],
  )

  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
      // Add a unique ID to the edge
      const edge = { ...params, id: `edge-${Date.now()}`, animated: true }
      setEdges((eds) => addEdge(edge, eds))
    },
    [setEdges],
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const reactFlowBounds = event.currentTarget.getBoundingClientRect()
      const type = event.dataTransfer.getData("application/reactflow")

      // Check if the dropped element is valid
      if (!type) return

      try {
        const block = JSON.parse(type)
        const position = reactFlowInstance.project({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        })

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

        setNodes((nds) => nds.concat(newNode))
      } catch (error) {
        console.error("Error parsing dropped data:", error)
      }
    },
    [reactFlowInstance, setNodes],
  )

  const handleClearCanvas = () => {
    if (nodes.length === 0) return

    if (window.confirm("Are you sure you want to clear the canvas? This will remove all nodes and connections.")) {
      setNodes([])
      setEdges([])
      if (onNodeSelect) {
        onNodeSelect(null)
      }
    }
  }

  const handleZoomIn = () => {
    setIsZooming(true)
    reactFlowInstance.zoomIn()
    setTimeout(() => setIsZooming(false), 300)
  }

  const handleZoomOut = () => {
    setIsZooming(true)
    reactFlowInstance.zoomOut()
    setTimeout(() => setIsZooming(false), 300)
  }

  const handleFitView = useCallback(() => {
    setIsZooming(true)

    // Clear any existing timeout
    if (fitViewTimeoutRef.current) {
      clearTimeout(fitViewTimeoutRef.current)
    }

    reactFlowInstance.fitView({ padding: 0.2, duration: 400 })

    // Set a timeout to turn off the zooming state
    fitViewTimeoutRef.current = setTimeout(() => setIsZooming(false), 500)
  }, [reactFlowInstance])

  const toggleInteractionMode = () => {
    setInteractionMode((prev) => {
      const newMode = prev === "select" ? "pan" : "select"
      setIsPanning(newMode === "pan")
      return newMode
    })
  }

  // Set up keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete selected node with Delete or Backspace
      if ((e.key === "Delete" || e.key === "Backspace") && selectedNodeId) {
        setNodes(nodes.filter((node) => node.id !== selectedNodeId))
        setSelectedNodeId(null)
        if (onNodeSelect) onNodeSelect(null)
      }

      // Fit view with 'F' key
      if (e.key === "f") {
        handleFitView()
      }

      // Toggle interaction mode with Space
      if (e.key === " " && document.activeElement === document.body) {
        e.preventDefault() // Prevent space from scrolling
        toggleInteractionMode()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedNodeId, nodes, setNodes, onNodeSelect, handleFitView])

  // Auto fit view when nodes change
  useEffect(() => {
    if (nodes.length > 0) {
      const timer = setTimeout(() => {
        handleFitView()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [nodes.length, handleFitView])

  useEffect(() => {
    return () => {
      if (fitViewTimeoutRef.current) {
        clearTimeout(fitViewTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="h-full w-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onDragOver={onDragOver}
        onDrop={onDrop}
        fitView
        className={cn(
          "bg-muted/30 transition-all duration-300",
          isZooming && "scale-[1.01] transition-transform duration-300",
          isPanning && "cursor-grab",
        )}
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: "#5E5BFF", strokeWidth: 2 },
        }}
        panOnScroll={interactionMode === "pan"}
        selectionOnDrag={interactionMode === "select"}
        panOnDrag={interactionMode === "pan"}
        selectionMode={interactionMode === "select" ? 1 : 0}
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(node) => {
            return node.selected ? "#5E5BFF" : "#ddd"
          }}
          maskColor={resolvedTheme === "dark" ? "rgba(30, 30, 47, 0.5)" : "rgba(255, 255, 255, 0.5)"}
        />

        <Panel position="top-right" className="flex gap-2">
          <motion.div
            className="flex gap-2"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <TooltipProvider>
              <Tooltip open={showTooltip === "mode"} onOpenChange={(open) => setShowTooltip(open ? "mode" : null)}>
                <TooltipTrigger asChild>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={toggleInteractionMode}
                      className={cn(
                        "h-8 w-8 rounded-md bg-background transition-all duration-200",
                        interactionMode === "pan" && "bg-primary/10 text-primary ring-1 ring-primary/30",
                      )}
                      onMouseEnter={() => setShowTooltip("mode")}
                      onMouseLeave={() => setShowTooltip(null)}
                    >
                      {interactionMode === "select" ? (
                        <MousePointer2 className="h-4 w-4" />
                      ) : (
                        <Hand className="h-4 w-4" />
                      )}
                    </Button>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  {interactionMode === "select" ? "Switch to Pan Mode (Space)" : "Switch to Select Mode (Space)"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip open={showTooltip === "zoomin"} onOpenChange={(open) => setShowTooltip(open ? "zoomin" : null)}>
                <TooltipTrigger asChild>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleZoomIn}
                      className="h-8 w-8 rounded-md bg-background"
                      onMouseEnter={() => setShowTooltip("zoomin")}
                      onMouseLeave={() => setShowTooltip(null)}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="bottom">Zoom In</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip
                open={showTooltip === "zoomout"}
                onOpenChange={(open) => setShowTooltip(open ? "zoomout" : null)}
              >
                <TooltipTrigger asChild>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleZoomOut}
                      className="h-8 w-8 rounded-md bg-background"
                      onMouseEnter={() => setShowTooltip("zoomout")}
                      onMouseLeave={() => setShowTooltip(null)}
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="bottom">Zoom Out</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip open={showTooltip === "fit"} onOpenChange={(open) => setShowTooltip(open ? "fit" : null)}>
                <TooltipTrigger asChild>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleFitView}
                      className="h-8 w-8 rounded-md bg-background"
                      onMouseEnter={() => setShowTooltip("fit")}
                      onMouseLeave={() => setShowTooltip(null)}
                    >
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="bottom">Fit View (F)</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip open={showTooltip === "clear"} onOpenChange={(open) => setShowTooltip(open ? "clear" : null)}>
                <TooltipTrigger asChild>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleClearCanvas}
                      className={cn(
                        "h-8 w-8 rounded-md bg-background transition-colors duration-200",
                        nodes.length > 0
                          ? "text-destructive hover:bg-destructive/10 hover:text-destructive"
                          : "text-muted-foreground",
                      )}
                      disabled={nodes.length === 0}
                      onMouseEnter={() => setShowTooltip("clear")}
                      onMouseLeave={() => setShowTooltip(null)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="bottom">Clear Canvas</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </motion.div>
        </Panel>

        <Panel position="bottom-center" className="pointer-events-none mb-2">
          <motion.div
            className="rounded-md bg-background/80 backdrop-blur-sm px-3 py-1.5 text-xs text-muted-foreground"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            {nodes.length} nodes · {edges.length} connections ·{" "}
            <span className={interactionMode === "select" ? "text-primary font-medium" : ""}>
              {interactionMode === "select" ? "Select Mode" : "Pan Mode"}
            </span>
          </motion.div>
        </Panel>
      </ReactFlow>
    </div>
  )
}

export default function ReactFlowWrapper(props: ReactFlowWrapperProps) {
  const [error, setError] = useState<Error | null>(null)

  if (error) {
    return <FallbackFlowCanvas onRetry={() => setError(null)} />
  }

  try {
    return (
      <ReactFlowProvider>
        <FlowContent {...props} />
      </ReactFlowProvider>
    )
  } catch (err) {
    console.error("Error rendering ReactFlow:", err)
    setError(err as Error)
    return <FallbackFlowCanvas onRetry={() => setError(null)} />
  }
}
