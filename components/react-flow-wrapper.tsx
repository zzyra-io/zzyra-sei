"use client"

import type React from "react"

import { useCallback, useState, useEffect, useRef } from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Trash2, ZoomIn, ZoomOut, Maximize2, MousePointer2, Hand, AlertCircle, Check } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "framer-motion"
import { FallbackFlowCanvas } from "./fallback-flow-canvas"
import { useToast } from "@/hooks/use-toast"

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
  ConnectionLineType,
  MarkerType,
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
  readOnly?: boolean
}

const nodeTypes = {
  custom: CustomNode,
}

// Custom edge types
const edgeTypes = {
  // Add custom edge types if needed
}

function FlowContent({ nodes, edges, setNodes, setEdges, onNodeSelect, readOnly = false }: ReactFlowWrapperProps) {
  const { resolvedTheme } = useTheme()
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [interactionMode, setInteractionMode] = useState<"select" | "pan">("select")
  const [showTooltip, setShowTooltip] = useState<string | null>(null)
  const [isZooming, setIsZooming] = useState(false)
  const [isPanning, setIsPanning] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [connectionSuccess, setConnectionSuccess] = useState(false)
  const reactFlowInstance = useReactFlow()
  const fitViewTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const resizeObserverRef = useRef<ResizeObserver | null>(null)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const debouncedUpdateRef = useRef<NodeJS.Timeout | null>(null)
  const isResizingRef = useRef(false)
  const { toast } = useToast()

  // Debounced update function to prevent ResizeObserver loop

  const onNodesChange: OnNodesChange = useCallback(
    (changes: NodeChange[]) => {
      // If in read-only mode, only allow selection changes
      if (readOnly) {
        const selectChanges = changes.filter((change) => change.type === "select")
        setNodes((nds) => applyNodeChanges(selectChanges, nds))
        return
      }

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
    [nodes, onNodeSelect, setNodes, readOnly],
  )

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      if (readOnly) return
      setEdges((eds) => applyEdgeChanges(changes, eds))
    },
    [setEdges, readOnly],
  )

  // Enhanced connection validation
  const isValidConnection = useCallback(
    (connection: Connection) => {
      // Don't allow connections to self
      if (connection.source === connection.target) {
        setConnectionError("Cannot connect a node to itself")
        setTimeout(() => setConnectionError(null), 3000)
        return false
      }

      // Don't allow duplicate connections
      const isDuplicate = edges.some((edge) => edge.source === connection.source && edge.target === connection.target)

      if (isDuplicate) {
        setConnectionError("Connection already exists")
        setTimeout(() => setConnectionError(null), 3000)
        return false
      }

      // Don't allow circular connections (this is a simple check, more complex workflows might need more sophisticated cycle detection)
      const wouldCreateCycle = checkForCycles(connection.source, connection.target, edges)
      if (wouldCreateCycle) {
        setConnectionError("Cannot create circular dependencies")
        setTimeout(() => setConnectionError(null), 3000)
        return false
      }

      // Show success indicator
      setConnectionSuccess(true)
      setTimeout(() => setConnectionSuccess(false), 1500)

      return true
    },
    [edges],
  )

  // Check for cycles in the graph
  const checkForCycles = (source: string, target: string, currentEdges: Edge[]): boolean => {
    // If we're connecting target -> source (backwards), it would create a cycle
    const wouldCreateDirectCycle = currentEdges.some((edge) => edge.source === target && edge.target === source)

    if (wouldCreateDirectCycle) return true

    // More complex cycle detection could be implemented here
    // This is a simple version that just checks for direct cycles

    return false
  }

  const onConnect: OnConnect = useCallback(
    (params: Connection) => {
      if (readOnly) return

      // Validate connection
      if (!isValidConnection(params)) return

      // Add a unique ID to the edge
      const edge = {
        ...params,
        id: `edge-${Date.now()}`,
        animated: true,
        type: "smoothstep",
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20,
        },
        style: {
          strokeWidth: 2,
          stroke: "#5E5BFF",
        },
      }

      setEdges((eds) => addEdge(edge, eds))
    },
    [setEdges, readOnly, isValidConnection],
  )

  const onDragOver = useCallback(
    (event: React.DragEvent) => {
      if (readOnly) return
      event.preventDefault()
      event.dataTransfer.dropEffect = "move"
    },
    [readOnly],
  )

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      if (readOnly) return
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
            // Default connection settings
            inputs: true,
            outputs: true,
            inputCount: 1,
            outputCount: 1,
          },
        }

        setNodes((nds) => nds.concat(newNode))

        // Show success toast
        toast({
          title: "Node Added",
          description: `Added ${block.name} node to the workflow`,
          duration: 2000,
        })
      } catch (error) {
        console.error("Error parsing dropped data:", error)
        toast({
          title: "Error Adding Node",
          description: "Failed to add node to the workflow",
          variant: "destructive",
        })
      }
    },
    [reactFlowInstance, setNodes, readOnly, toast],
  )

  const handleClearCanvas = () => {
    if (readOnly) return
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
    if (readOnly) return
    setInteractionMode((prev) => {
      const newMode = prev === "select" ? "pan" : "select"
      setIsPanning(newMode === "pan")
      return newMode
    })
  }

  // Set up keyboard shortcuts
  useEffect(() => {
    if (readOnly) return

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
  }, [selectedNodeId, nodes, setNodes, onNodeSelect, handleFitView, readOnly])

  // Auto fit view when nodes change
  useEffect(() => {
    if (nodes.length > 0) {
      const timer = setTimeout(() => {
        handleFitView()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [nodes.length, handleFitView])

  // Set up ResizeObserver to handle container resizing
  useEffect(() => {
    if (!containerRef.current) return

    // Clean up previous observer
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect()
    }

    // Create a new observer with error handling
    try {
      resizeObserverRef.current = new ResizeObserver((entries) => {
        // Skip if we're already processing a resize to prevent loops
        if (isResizingRef.current) return

        // Set flag to prevent multiple resize handling
        isResizingRef.current = true

        // Clear any existing timeout
        if (debouncedUpdateRef.current) {
          clearTimeout(debouncedUpdateRef.current)
        }

        // Debounce the update with a longer timeout
        debouncedUpdateRef.current = setTimeout(() => {
          try {
            if (reactFlowInstance) {
              // Use a more gentle fit view with longer duration
              reactFlowInstance.fitView({ padding: 0.2, duration: 300 })
            }
          } catch (error) {
            console.error("Error in resize observer callback:", error)
          } finally {
            // Reset the flag after a delay to ensure we don't get into a loop
            setTimeout(() => {
              isResizingRef.current = false
            }, 100)
          }
        }, 500) // Longer debounce time to prevent rapid updates
      })

      // Start observing with error handling
      try {
        resizeObserverRef.current.observe(containerRef.current)
      } catch (error) {
        console.error("Error starting ResizeObserver:", error)
      }
    } catch (error) {
      console.error("Error creating ResizeObserver:", error)
    }

    // Cleanup function
    return () => {
      if (resizeObserverRef.current) {
        try {
          resizeObserverRef.current.disconnect()
        } catch (error) {
          console.error("Error disconnecting ResizeObserver:", error)
        }
      }

      if (debouncedUpdateRef.current) {
        clearTimeout(debouncedUpdateRef.current)
      }
    }
  }, [reactFlowInstance])

  // Add a global error handler for ResizeObserver errors
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message.includes("ResizeObserver loop")) {
        // Prevent the error from being reported to the console
        event.preventDefault()
        event.stopPropagation()

        // Log a more helpful message
        console.warn("ResizeObserver loop detected and handled")
      }
    }

    // Add the error handler
    window.addEventListener("error", handleError as EventListener)

    // Clean up
    return () => {
      window.removeEventListener("error", handleError as EventListener)
    }
  }, [])

  useEffect(() => {
    return () => {
      if (fitViewTimeoutRef.current) {
        clearTimeout(fitViewTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="h-full w-full relative" ref={containerRef}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
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
          type: "smoothstep",
          style: { stroke: "#5E5BFF", strokeWidth: 2 },
          markerEnd: {
            type: MarkerType.ArrowClosed,
          },
        }}
        connectionLineType={ConnectionLineType.SmoothStep}
        connectionLineStyle={{
          stroke: "#5E5BFF",
          strokeWidth: 2,
        }}
        panOnScroll={interactionMode === "pan" || readOnly}
        selectionOnDrag={!readOnly && interactionMode === "select"}
        panOnDrag={interactionMode === "pan" || readOnly}
        selectionMode={!readOnly && interactionMode === "select" ? 1 : 0}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={!readOnly}
        snapToGrid={true}
        snapGrid={[15, 15]}
      >
        <Background />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(node) => {
            return node.selected ? "#5E5BFF" : "#ddd"
          }}
          maskColor={resolvedTheme === "dark" ? "rgba(30, 30, 47, 0.5)" : "rgba(255, 255, 255, 0.5)"}
        />

        {!readOnly && (
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
                <Tooltip
                  open={showTooltip === "zoomin"}
                  onOpenChange={(open) => setShowTooltip(open ? "zoomin" : null)}
                >
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
        )}

        <Panel position="bottom-center" className="pointer-events-none mb-2">
          <motion.div
            className="rounded-md bg-background/80 backdrop-blur-sm px-3 py-1.5 text-xs text-muted-foreground"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
          >
            {nodes.length} nodes · {edges.length} connections ·{" "}
            {!readOnly && (
              <span className={interactionMode === "select" ? "text-primary font-medium" : ""}>
                {interactionMode === "select" ? "Select Mode" : "Pan Mode"}
              </span>
            )}
            {readOnly && <span>View Mode</span>}
          </motion.div>
        </Panel>

        {/* Connection error notification */}
        <AnimatePresence>
          {connectionError && (
            <motion.div
              className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-destructive text-destructive-foreground px-4 py-2 rounded-md shadow-lg z-50 flex items-center"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <AlertCircle className="h-4 w-4 mr-2" />
              {connectionError}
            </motion.div>
          )}

          {connectionSuccess && (
            <motion.div
              className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-50 flex items-center"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <Check className="h-4 w-4 mr-2" />
              Connection created
            </motion.div>
          )}
        </AnimatePresence>
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
