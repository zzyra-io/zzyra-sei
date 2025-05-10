"use client"

import React, { forwardRef } from "react"
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  type EdgeTypes,
  Panel,
  useReactFlow,
} from "reactflow"
import "reactflow/dist/style.css"
import { CustomNode } from "@/components/custom-node"
import { CustomEdge } from "@/components/custom-edge"
import { Button } from "@/components/ui/button"
import { ZoomIn, ZoomOut, Maximize2 } from "lucide-react"

// Define node types
const nodeTypes: NodeTypes = {
  custom: CustomNode,
}

// Define edge types
const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
}

interface ReactFlowWrapperProps {
  nodes: Node[]
  edges: Edge[]
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>
  onNodeSelect?: (node: Node | null) => void
  readOnly?: boolean
  onError?: (error: Error) => void
}

// Create the inner component that will be wrapped with ReactFlowProvider
const ReactFlowInner = forwardRef<any, ReactFlowWrapperProps>(
  ({ nodes, edges, setNodes, setEdges, onNodeSelect, readOnly = false, onError }, ref) => {
    const [internalNodes, setInternalNodes, onNodesChange] = useNodesState(nodes)
    const [internalEdges, setInternalEdges, onEdgesChange] = useEdgesState(edges)
    const reactFlowInstance = useReactFlow()

    // Handle connection
    const onConnect = React.useCallback(
      (params: Connection) => {
        try {
          const newEdge = {
            ...params,
            id: `edge-${params.source}-${params.target}`,
            type: "custom",
            animated: true,
            data: { label: "" },
          }
          setEdges((eds) => addEdge(newEdge, eds))
        } catch (error) {
          console.error("Error connecting nodes:", error)
          if (onError) onError(error as Error)
        }
      },
      [setEdges, onError],
    )

    // Handle node click
    const onNodeClick = React.useCallback(
      (_: React.MouseEvent, node: Node) => {
        if (onNodeSelect) {
          onNodeSelect(node)
        }
      },
      [onNodeSelect],
    )

    // Handle pane click
    const onPaneClick = React.useCallback(() => {
      if (onNodeSelect) {
        onNodeSelect(null)
      }
    }, [onNodeSelect])

    // Sync nodes and edges with parent
    React.useEffect(() => {
      setInternalNodes(nodes)
    }, [nodes, setInternalNodes])

    React.useEffect(() => {
      setInternalEdges(edges)
    }, [edges, setInternalEdges])

    // Expose methods to parent
    React.useImperativeHandle(ref, () => ({
      zoomIn: () => reactFlowInstance.zoomIn(),
      zoomOut: () => reactFlowInstance.zoomOut(),
      fitView: () => reactFlowInstance.fitView(),
      getNodes: () => internalNodes,
      getEdges: () => internalEdges,
    }))

    return (
      <ReactFlow
        nodes={internalNodes}
        edges={internalEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        attributionPosition="bottom-right"
        minZoom={0.2}
        maxZoom={4}
        snapToGrid
        snapGrid={[15, 15]}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
      >
        <Background />
        <MiniMap
          nodeStrokeWidth={3}
          zoomable
          pannable
          nodeColor={(node) => {
            return node.selected ? "#6366F1" : "#ddd"
          }}
        />
        <Controls showInteractive={false} />
        <Panel position="top-right">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => reactFlowInstance.zoomIn()}
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => reactFlowInstance.zoomOut()}
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => reactFlowInstance.fitView()}
              title="Fit View"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
        </Panel>
      </ReactFlow>
    )
  },
)

ReactFlowInner.displayName = "ReactFlowInner"

// Create the wrapper component that provides the ReactFlowProvider
const ReactFlowWrapper = forwardRef<any, ReactFlowWrapperProps>((props, ref) => {
  return (
    <ReactFlowProvider>
      <ReactFlowInner {...props} ref={ref} />
    </ReactFlowProvider>
  )
})

ReactFlowWrapper.displayName = "ReactFlowWrapper"

export default ReactFlowWrapper
