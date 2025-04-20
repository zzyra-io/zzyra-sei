"use client"

import type React from "react"

import { useCallback, useEffect, useImperativeHandle, useRef, forwardRef } from "react"
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type EdgeChange,
  type NodeChange,
  type NodeTypes,
  type EdgeTypes,
  useReactFlow,
  ReactFlowProvider,
} from "reactflow"
import "reactflow/dist/style.css"
import { CustomNode } from "./custom-node"
import { CustomEdge } from "./custom-edge"
import { Loader2, AlertCircle } from "lucide-react"
import { motion } from "framer-motion"
import dynamic from "next/dynamic"

// Import types directly to avoid SSR issues
export interface FlowNode {
  id: string
  type?: string
  position: {
    x: number
    y: number
  }
  data: any
  selected?: boolean
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  type?: string
  animated?: boolean
  label?: string
  style?: any
}

// Define node types
const nodeTypes: NodeTypes = {
  default: CustomNode,
  ethereum_price_trigger: CustomNode,
  time_trigger: CustomNode,
  webhook_trigger: CustomNode,
  send_email: CustomNode,
  send_slack: CustomNode,
  execute_trade: CustomNode,
  condition: CustomNode,
  delay: CustomNode,
  transform: CustomNode,
  api_request: CustomNode,
}

// Define edge types
const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
}

// Dynamically import ReactFlow components with no SSR
const ReactFlowWrapper = dynamic(() => import("./react-flow-wrapper"), {
  ssr: false,
  loading: () => <LoadingCanvas />,
})

// Update the LoadingCanvas component to be more informative and visually appealing
function LoadingCanvas() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted/30">
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-4 flex flex-col items-center">
          <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
          <motion.div
            className="text-2xl font-semibold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Loading Flow Canvas...
          </motion.div>
        </div>
        <motion.div
          className="text-sm text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Please wait while we initialize the canvas
        </motion.div>
      </motion.div>
    </div>
  )
}

// Add an error boundary component
function ErrorCanvas({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary?: () => void }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-muted/30">
      <motion.div
        className="text-center max-w-md p-6 bg-background rounded-lg shadow-lg"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="mb-4 flex flex-col items-center">
          <AlertCircle className="h-10 w-10 text-destructive mb-4" />
          <motion.div
            className="text-xl font-semibold"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            Canvas Error
          </motion.div>
        </div>
        <motion.div
          className="text-sm text-muted-foreground mb-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          {error.message || "An error occurred while loading the workflow canvas."}
        </motion.div>
        {resetErrorBoundary && (
          <button
            onClick={resetErrorBoundary}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Try Again
          </button>
        )}
      </motion.div>
    </div>
  )
}

interface FlowCanvasProps {
  initialNodes?: FlowNode[]
  initialEdges?: FlowEdge[]
  onFlowChange?: () => void
  onNodeSelect?: (node: FlowNode) => void
}

// Helper function to find a position for a new node that doesn't overlap with existing nodes
const findAvailablePosition = (nodes: FlowNode[], startX = 250, startY = 100) => {
  // Define grid size
  const gridSize = 200
  const nodeWidth = 180
  const nodeHeight = 100

  // Start with the default position
  let x = startX
  let y = startY

  // Check if position is occupied
  const isPositionOccupied = (posX: number, posY: number) => {
    return nodes.some((node) => {
      const nodeX = node.position.x
      const nodeY = node.position.y
      return (
        posX < nodeX + nodeWidth && posX + nodeWidth > nodeX && posY < nodeY + nodeHeight && posY + nodeHeight > nodeY
      )
    })
  }

  // Try positions in a spiral pattern
  let ring = 1
  let positionsChecked = 0
  const maxPositions = 100 // Prevent infinite loops

  while (isPositionOccupied(x, y) && positionsChecked < maxPositions) {
    // Move in a spiral pattern: right, down, left, up, then increase ring size
    if (positionsChecked % 4 === 0) x += gridSize * ring
    else if (positionsChecked % 4 === 1) y += gridSize * ring
    else if (positionsChecked % 4 === 2) x -= gridSize * ring
    else {
      y -= gridSize * ring
      ring++ // Increase ring size after completing a full circle
    }

    positionsChecked++
  }

  return { x, y }
}

// Inner component with ReactFlow
const FlowCanvasInner = forwardRef<any, FlowCanvasProps>(
  ({ initialNodes = [], initialEdges = [], onFlowChange, onNodeSelect }, ref) => {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
    const reactFlowWrapper = useRef<HTMLDivElement>(null)
    const reactFlowInstance = useReactFlow()

    // Initialize ReactFlow with initial nodes and edges
    useEffect(() => {
      if (initialNodes.length > 0 || initialEdges.length > 0) {
        setNodes(initialNodes)
        setEdges(initialEdges)
      }
    }, [initialNodes, initialEdges, setNodes, setEdges])

    // Handle node changes
    const handleNodesChange = useCallback(
      (changes: NodeChange[]) => {
        onNodesChange(changes)
        if (onFlowChange) {
          onFlowChange()
        }
      },
      [onNodesChange, onFlowChange],
    )

    // Handle edge changes
    const handleEdgesChange = useCallback(
      (changes: EdgeChange[]) => {
        onEdgesChange(changes)
        if (onFlowChange) {
          onFlowChange()
        }
      },
      [onEdgesChange, onFlowChange],
    )

    // Handle connections between nodes
    const handleConnect = useCallback(
      (connection: Connection) => {
        // Create a custom edge
        const newEdge = {
          ...connection,
          type: "custom",
          animated: true,
          style: { stroke: "#10b981" },
        }
        setEdges((eds) => addEdge(newEdge, eds))
        if (onFlowChange) {
          onFlowChange()
        }
      },
      [setEdges, onFlowChange],
    )

    // Handle node click
    const handleNodeClick = useCallback(
      (_: React.MouseEvent, node: FlowNode) => {
        if (onNodeSelect) {
          onNodeSelect(node)
        }
      },
      [onNodeSelect],
    )

    // Handle drag over
    const onDragOver = useCallback((event: React.DragEvent) => {
      event.preventDefault()
      event.dataTransfer.dropEffect = "move"
    }, [])

    // Handle drop
    const onDrop = useCallback(
      (event: React.DragEvent) => {
        event.preventDefault()

        if (!reactFlowWrapper.current) return

        const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect()
        const blockData = event.dataTransfer.getData("application/reactflow")

        if (!blockData) return

        const block = JSON.parse(blockData)

        // Get the position from the drop event
        const position = reactFlowInstance.project({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        })

        // Create a new node
        const newNodeId = `node_${Math.random().toString(36).substring(2, 9)}`
        const newNode = {
          id: newNodeId,
          type: block.id,
          position,
          data: {
            label: block.name,
            description: block.description,
            icon: block.icon,
            nodeType: block.nodeType,
            config: block.config || {},
          },
        }

        // Add the new node
        setNodes((nds) => nds.concat(newNode))

        if (onFlowChange) {
          onFlowChange()
        }
      },
      [reactFlowInstance, setNodes, onFlowChange],
    )

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
      // Get current flow data
      getFlow: () => {
        return {
          nodes,
          edges,
        }
      },
      // Add a new node
      addNode: (node: any) => {
        // Find a position that doesn't overlap with existing nodes
        const position = findAvailablePosition(nodes)

        const newNode = {
          ...node,
          position,
        }

        setNodes((nds) => nds.concat(newNode))

        if (onFlowChange) {
          onFlowChange()
        }
      },
      // Update an existing node
      updateNode: (updatedNode: FlowNode) => {
        setNodes((nds) =>
          nds.map((node) => {
            if (node.id === updatedNode.id) {
              return {
                ...node,
                data: {
                  ...updatedNode.data,
                },
              }
            }
            return node
          }),
        )

        if (onFlowChange) {
          onFlowChange()
        }
      },
    }))

    return (
      <div className="h-full w-full" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onDragOver={onDragOver}
          onDrop={onDrop}
          fitView
          attributionPosition="bottom-right"
          defaultEdgeOptions={{ type: "custom" }}
        >
          <Background />
          <Controls />
          <MiniMap />
        </ReactFlow>
      </div>
    )
  },
)

FlowCanvasInner.displayName = "FlowCanvasInner"

// Wrapper component with ReactFlowProvider
export const FlowCanvas = forwardRef<any, FlowCanvasProps>((props, ref) => {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} ref={ref} />
    </ReactFlowProvider>
  )
})

FlowCanvas.displayName = "FlowCanvas"
