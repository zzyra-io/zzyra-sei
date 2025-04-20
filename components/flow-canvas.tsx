"use client"

import type React from "react"

import { useCallback, useRef, useState, useEffect } from "react"
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  applyNodeChanges,
  applyEdgeChanges,
  ReactFlowProvider,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
  type EdgeTypes,
} from "reactflow"
import "reactflow/dist/style.css"
import { CustomNode } from "./custom-node"
import { CustomEdge } from "./custom-edge"
import { BlockConfigPanel } from "./block-config-panel"
import { BlockType, getBlockMetadata } from "@/types/workflow"
import { useToast } from "@/components/ui/use-toast"
import { useHotkeys } from "react-hotkeys-hook"
import { EdgeConfigPanel } from "./edge-config-panel"
import { ContextMenu } from "./context-menu"
import {
  Edit,
  Copy,
  Trash2,
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
  Eye,
  EyeOff,
  Plus,
  Maximize2,
  CloudOffIcon as GridOff,
  Grid,
} from "lucide-react"

// Import the cycle detection function
import { wouldCreateCycle } from "@/lib/workflow/cycle-detection"

// Define custom node and edge types
const nodeTypes: NodeTypes = {
  custom: CustomNode,
}

const edgeTypes: EdgeTypes = {
  custom: CustomEdge,
}

interface FlowCanvasProps {
  initialNodes?: Node[]
  initialEdges?: Edge[]
  onNodesChange?: (nodes: Node[]) => void
  onEdgesChange?: (edges: Edge[]) => void
  toolbarRef?: React.RefObject<{
    canUndo: boolean
    canRedo: boolean
    undo: () => void
    redo: () => void
    zoomIn?: () => void
    zoomOut?: () => void
    fitView?: () => void
    toggleGrid?: () => void
    deleteSelected?: () => void
    duplicateSelected?: () => void
    alignHorizontal?: (alignment: "left" | "center" | "right") => void
    alignVertical?: (alignment: "top" | "center" | "bottom") => void
    resetCanvas?: () => void
  }>
}

export type { Node, Edge }

// Create a separate component for the flow content to use hooks inside the provider
function FlowContent({
  initialNodes = [],
  initialEdges = [],
  onNodesChange,
  onEdgesChange,
  toolbarRef,
}: FlowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [nodes, setNodes] = useNodesState(initialNodes)
  const [edges, setEdges] = useEdgesState(initialEdges)
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [showConfigPanel, setShowConfigPanel] = useState(false)
  const [isGridVisible, setIsGridVisible] = useState(true)
  const { toast } = useToast()

  // Add state for selected edge
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null)
  const [showEdgeConfigPanel, setShowEdgeConfigPanel] = useState(false)

  // History management for undo/redo
  const [history, setHistory] = useState<{ nodes: Node[][]; edges: Edge[][]; currentIndex: number }>({
    nodes: [initialNodes],
    edges: [initialEdges],
    currentIndex: 0,
  })

  // Add state for context menu
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    type: "node" | "edge" | "canvas"
    id?: string
  } | null>(null)

  // Add state for edge being dragged
  const [edgeUpdateSuccessful, setEdgeUpdateSuccessful] = useState(true)

  // Add to history when nodes or edges change - Define this FIRST before using it
  const addToHistory = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    setHistory((prev) => {
      // Remove any future history if we're not at the end
      const nodes = prev.nodes.slice(0, prev.currentIndex + 1)
      const edges = prev.edges.slice(0, prev.currentIndex + 1)

      return {
        nodes: [...nodes, newNodes],
        edges: [...edges, newEdges],
        currentIndex: prev.currentIndex + 1,
      }
    })
  }, [])

  // Handle node deletion
  const handleDeleteSelectedNodes = useCallback(() => {
    if (selectedNode) {
      setNodes((nds) => {
        const newNodes = nds.filter((node) => node.id !== selectedNode.id)
        addToHistory(newNodes, edges)
        return newNodes
      })

      setSelectedNode(null)
      setShowConfigPanel(false)

      toast({
        title: "Node Deleted",
        description: "Selected node has been removed",
        duration: 1500,
      })
    }
  }, [selectedNode, nodes, edges, setNodes, addToHistory, toast])

  // Handle node duplication
  const handleDuplicateSelectedNode = useCallback(() => {
    if (selectedNode) {
      const newNode: Node = {
        ...selectedNode,
        id: `${selectedNode.data.blockType || "node"}-${Date.now()}`,
        position: {
          x: selectedNode.position.x + 50,
          y: selectedNode.position.y + 50,
        },
      }

      setNodes((nds) => {
        const newNodes = [...nds, newNode]
        addToHistory(newNodes, edges)
        return newNodes
      })

      toast({
        title: "Node Duplicated",
        description: "Selected node has been duplicated",
        duration: 1500,
      })
    }
  }, [selectedNode, nodes, edges, setNodes, addToHistory, toast])

  // Handle node alignment
  const handleAlignHorizontal = useCallback(
    (alignment: "left" | "center" | "right") => {
      if (!selectedNode || nodes.length <= 1) return

      let alignPosition: number

      switch (alignment) {
        case "left":
          alignPosition = Math.min(...nodes.map((node) => node.position.x))
          break
        case "center": {
          const minX = Math.min(...nodes.map((node) => node.position.x))
          const maxX = Math.max(...nodes.map((node) => node.position.x + (node.width || 0)))
          alignPosition = minX + (maxX - minX) / 2
          break
        }
        case "right":
          alignPosition = Math.max(...nodes.map((node) => node.position.x + (node.width || 0)))
          break
        default:
          return
      }

      setNodes((nds) => {
        const newNodes = nds.map((node) => {
          if (node.id === selectedNode.id) {
            return {
              ...node,
              position: {
                ...node.position,
                x:
                  alignment === "center"
                    ? alignPosition - (node.width || 0) / 2
                    : alignment === "right"
                      ? alignPosition - (node.width || 0)
                      : alignPosition,
              },
            }
          }
          return node
        })

        addToHistory(newNodes, edges)
        return newNodes
      })

      if (onNodesChange) {
        onNodesChange(nodes)
      }
    },
    [selectedNode, nodes, edges, onNodesChange, setNodes, addToHistory],
  )

  // Handle node vertical alignment
  const handleAlignVertical = useCallback(
    (alignment: "top" | "center" | "bottom") => {
      if (!selectedNode || nodes.length <= 1) return

      let alignPosition: number

      switch (alignment) {
        case "top":
          alignPosition = Math.min(...nodes.map((node) => node.position.y))
          break
        case "center": {
          const minY = Math.min(...nodes.map((node) => node.position.y))
          const maxY = Math.max(...nodes.map((node) => node.position.y + (node.height || 0)))
          alignPosition = minY + (maxY - minY) / 2
          break
        }
        case "bottom":
          alignPosition = Math.max(...nodes.map((node) => node.position.y + (node.height || 0)))
          break
        default:
          return
      }

      setNodes((nds) => {
        const newNodes = nds.map((node) => {
          if (node.id === selectedNode.id) {
            return {
              ...node,
              position: {
                ...node.position,
                y:
                  alignment === "center"
                    ? alignPosition - (node.height || 0) / 2
                    : alignment === "bottom"
                      ? alignPosition - (node.height || 0)
                      : alignPosition,
              },
            }
          }
          return node
        })

        addToHistory(newNodes, edges)
        return newNodes
      })

      if (onNodesChange) {
        onNodesChange(nodes)
      }
    },
    [selectedNode, nodes, edges, onNodesChange, setNodes, addToHistory],
  )

  // Handle canvas reset
  const handleResetCanvas = useCallback(() => {
    setNodes([])
    setEdges([])
    addToHistory([], [])

    if (onNodesChange) onNodesChange([])
    if (onEdgesChange) onEdgesChange([])

    toast({
      title: "Canvas Reset",
      description: "All nodes and connections have been removed",
      duration: 1500,
    })
  }, [setNodes, setEdges, onNodesChange, onEdgesChange, addToHistory, toast])

  // Handle zoom in
  const handleZoomIn = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomIn()
    }
  }, [reactFlowInstance])

  // Handle zoom out
  const handleZoomOut = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomOut()
    }
  }, [reactFlowInstance])

  // Handle fit view
  const handleFitView = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView()
    }
  }, [reactFlowInstance])

  // Add edge update handler
  const onEdgeUpdateStart = useCallback(() => {
    // Set edge update to not successful by default
    // It will be set to true if the edge connects to a valid target
    setEdgeUpdateSuccessful(false)
  }, [])

  // Handle undo
  const handleUndo = useCallback(() => {
    if (history.currentIndex > 0) {
      const newIndex = history.currentIndex - 1
      const prevNodes = history.nodes[newIndex]
      const prevEdges = history.edges[newIndex]

      setNodes(prevNodes)
      setEdges(prevEdges)

      if (onNodesChange) onNodesChange(prevNodes)
      if (onEdgesChange) onEdgesChange(prevEdges)

      setHistory((prev) => ({
        ...prev,
        currentIndex: newIndex,
      }))

      toast({
        title: "Undo",
        description: "Previous action undone",
        duration: 1500,
      })
    }
  }, [history, onNodesChange, onEdgesChange, setNodes, setEdges, toast])

  // Handle redo
  const handleRedo = useCallback(() => {
    if (history.currentIndex < history.nodes.length - 1) {
      const newIndex = history.currentIndex + 1
      const nextNodes = history.nodes[newIndex]
      const nextEdges = history.edges[newIndex]

      setNodes(nextNodes)
      setEdges(nextEdges)

      if (onNodesChange) onNodesChange(nextNodes)
      if (onEdgesChange) onEdgesChange(nextEdges)

      setHistory((prev) => ({
        ...prev,
        currentIndex: newIndex,
      }))

      toast({
        title: "Redo",
        description: "Action redone",
        duration: 1500,
      })
    }
  }, [history, onNodesChange, onEdgesChange, setNodes, setEdges, toast])

  // Set up keyboard shortcuts
  useHotkeys("ctrl+z", handleUndo, [handleUndo])
  useHotkeys("ctrl+y", handleRedo, [handleRedo])

  // Update the onConnect function to check for cycles
  const onConnect = useCallback(
    (params: Connection) => {
      // Check if adding this connection would create a cycle
      if (wouldCreateCycle(nodes, edges, params)) {
        toast({
          title: "Cannot Create Connection",
          description: "This would create a circular dependency in your workflow",
          variant: "destructive",
          duration: 3000,
        })
        return
      }

      // Create a custom edge with the custom type
      const newEdge: Edge = {
        ...params,
        type: "custom",
        animated: true,
        style: { stroke: "#64748b" },
      }

      setEdges((eds) => {
        const newEdges = addEdge(newEdge, eds)
        addToHistory(nodes, newEdges)
        return newEdges
      })

      // Notify parent component if callback is provided
      if (onEdgesChange) {
        onEdgesChange(addEdge(newEdge, edges))
      }
    },
    [nodes, edges, onEdgesChange, setEdges, addToHistory, toast],
  )

  // Also update the onEdgeUpdate function to check for cycles
  const onEdgeUpdate = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      // Check if updating this edge would create a cycle
      if (
        wouldCreateCycle(
          nodes,
          edges.filter((e) => e.id !== oldEdge.id),
          newConnection,
        )
      ) {
        toast({
          title: "Cannot Update Connection",
          description: "This would create a circular dependency in your workflow",
          variant: "destructive",
          duration: 3000,
        })
        setEdgeUpdateSuccessful(false)
        return
      }

      // If we have a valid new connection, update the edge
      if (newConnection.source && newConnection.target) {
        setEdgeUpdateSuccessful(true)
        setEdges((eds) => {
          const updatedEdges = eds.map((e) => (e.id === oldEdge.id ? { ...oldEdge, ...newConnection } : e))
          addToHistory(nodes, updatedEdges)
          return updatedEdges
        })
      }
    },
    [nodes, edges, setEdges, addToHistory, toast],
  )

  const onEdgeUpdateEnd = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      // If the edge update was not successful (no valid target), delete the edge
      if (!edgeUpdateSuccessful) {
        setEdges((eds) => {
          const newEdges = eds.filter((e) => e.id !== edge.id)
          addToHistory(nodes, newEdges)
          return newEdges
        })

        toast({
          title: "Edge Deleted",
          description: "Connection has been removed",
          duration: 1500,
        })
      }

      // Reset the state
      setEdgeUpdateSuccessful(true)
    },
    [edgeUpdateSuccessful, nodes, setEdges, addToHistory, toast],
  )

  // Handle node update from config panel
  const handleNodeUpdate = useCallback(
    (updatedNode: Node) => {
      setNodes((nds) => {
        const newNodes = nds.map((node) => (node.id === updatedNode.id ? updatedNode : node))
        addToHistory(newNodes, edges)
        return newNodes
      })

      setSelectedNode(updatedNode)

      // Notify parent component if callback is provided
      if (onNodesChange) {
        onNodesChange(nodes.map((node) => (node.id === updatedNode.id ? updatedNode : node)))
      }
    },
    [nodes, edges, onNodesChange, setNodes, addToHistory],
  )

  // Add edge update handler
  const handleEdgeUpdate = useCallback(
    (updatedEdge: Edge) => {
      setEdges((eds) => {
        const newEdges = eds.map((edge) => (edge.id === updatedEdge.id ? updatedEdge : edge))
        addToHistory(nodes, newEdges)
        return newEdges
      })

      setSelectedEdge(updatedEdge)

      // Notify parent component if callback is provided
      if (onEdgesChange) {
        onEdgesChange(edges.map((edge) => (edge.id === updatedEdge.id ? updatedEdge : edge)))
      }
    },
    [nodes, edges, onEdgesChange, setEdges, addToHistory],
  )

  // Handle node selection
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    console.log("Node clicked:", node)
    setSelectedNode(node)
    setShowConfigPanel(true)
  }, [])

  // Add edge click handler
  const onEdgeClick = useCallback((_: React.MouseEvent, edge: Edge) => {
    console.log("Edge clicked:", edge)
    setSelectedEdge(edge)
    setShowEdgeConfigPanel(true)
  }, [])

  // Add context menu handlers
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      // Prevent default context menu
      event.preventDefault()

      // Select the node
      setSelectedNode(node)
      setShowConfigPanel(true)

      // Show context menu
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        type: "node",
        id: node.id,
      })
    },
    [setSelectedNode, setShowConfigPanel, setContextMenu],
  )

  const onEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      // Prevent default context menu
      event.preventDefault()

      // Select the edge
      setSelectedEdge(edge)
      setShowEdgeConfigPanel(true)

      // Show context menu
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        type: "edge",
        id: edge.id,
      })
    },
    [setSelectedEdge, setShowEdgeConfigPanel, setContextMenu],
  )

  const onPaneContextMenu = useCallback(
    (event: React.MouseEvent) => {
      // Prevent default context menu
      event.preventDefault()

      // Show context menu
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        type: "canvas",
      })
    },
    [setContextMenu],
  )

  // Add context menu close handler
  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  // Add context menu options
  const getContextMenuOptions = useCallback(() => {
    if (!contextMenu) return []

    if (contextMenu.type === "node") {
      return [
        {
          label: "Edit Node",
          icon: <Edit className="h-4 w-4" />,
          onClick: () => {
            // Node is already selected, just make sure config panel is open
            setShowConfigPanel(true)
          },
        },
        {
          label: "Duplicate Node",
          icon: <Copy className="h-4 w-4" />,
          onClick: handleDuplicateSelectedNode,
        },
        {
          label: "Delete Node",
          icon: <Trash2 className="h-4 w-4" />,
          onClick: handleDeleteSelectedNodes,
        },
        {
          label: "Center Horizontally",
          icon: <AlignHorizontalJustifyCenter className="h-4 w-4" />,
          onClick: () => handleAlignHorizontal("center"),
          divider: true,
        },
        {
          label: "Center Vertically",
          icon: <AlignVerticalJustifyCenter className="h-4 w-4" />,
          onClick: () => handleAlignVertical("center"),
        },
        {
          label: selectedNode?.data?.isEnabled === false ? "Enable Node" : "Disable Node",
          icon: selectedNode?.data?.isEnabled === false ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />,
          onClick: () => {
            if (selectedNode) {
              handleNodeUpdate({
                ...selectedNode,
                data: {
                  ...selectedNode.data,
                  isEnabled: selectedNode.data?.isEnabled === false ? true : false,
                },
              })
            }
          },
          divider: true,
        },
      ]
    }

    if (contextMenu.type === "edge") {
      return [
        {
          label: "Edit Edge",
          icon: <Edit className="h-4 w-4" />,
          onClick: () => {
            // Edge is already selected, just make sure config panel is open
            setShowEdgeConfigPanel(true)
          },
        },
        {
          label: "Delete Edge",
          icon: <Trash2 className="h-4 w-4" />,
          onClick: () => {
            if (selectedEdge) {
              setEdges((eds) => {
                const newEdges = eds.filter((e) => e.id !== selectedEdge.id)
                addToHistory(nodes, newEdges)
                return newEdges
              })
              setSelectedEdge(null)
              setShowEdgeConfigPanel(false)
            }
          },
        },
        {
          label: selectedEdge?.animated ? "Disable Animation" : "Enable Animation",
          icon: selectedEdge?.animated ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />,
          onClick: () => {
            if (selectedEdge) {
              handleEdgeUpdate({
                ...selectedEdge,
                animated: !selectedEdge.animated,
                data: {
                  ...selectedEdge.data,
                  animated: !selectedEdge.animated,
                },
              })
            }
          },
        },
      ]
    }

    if (contextMenu.type === "canvas") {
      return [
        {
          label: "Add Node",
          icon: <Plus className="h-4 w-4" />,
          onClick: () => {
            // This would ideally open a node selection dialog
            toast({
              title: "Add Node",
              description: "Please use the block catalog to add nodes",
              duration: 2000,
            })
          },
        },
        {
          label: "Fit View",
          icon: <Maximize2 className="h-4 w-4" />,
          onClick: handleFitView,
        },
        {
          label: isGridVisible ? "Hide Grid" : "Show Grid",
          icon: isGridVisible ? <GridOff className="h-4 w-4" /> : <Grid className="h-4 w-4" />,
          onClick: () => setIsGridVisible(!isGridVisible),
        },
      ]
    }

    return []
  }, [
    contextMenu,
    selectedNode,
    selectedEdge,
    handleNodeUpdate,
    handleEdgeUpdate,
    handleDeleteSelectedNodes,
    handleDuplicateSelectedNode,
    handleAlignHorizontal,
    handleAlignVertical,
    handleFitView,
    isGridVisible,
    nodes,
    setEdges,
    addToHistory,
    setShowConfigPanel,
    setShowEdgeConfigPanel,
    toast,
  ])

  // Handle closing the config panel
  const handleCloseConfigPanel = useCallback(() => {
    setShowConfigPanel(false)
    setSelectedNode(null)
  }, [])

  // Add handler to close edge config panel
  const handleCloseEdgeConfigPanel = useCallback(() => {
    setShowEdgeConfigPanel(false)
    setSelectedEdge(null)
  }, [])

  // Handle dropping a new node onto the canvas
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      if (!reactFlowWrapper.current || !reactFlowInstance) {
        return
      }

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect()

      // Safely get the node type
      let blockTypeValue = ""
      try {
        blockTypeValue = event.dataTransfer.getData("application/reactflow/type")
      } catch (error) {
        console.error("Error getting block type:", error)
        return
      }

      // Validate that the block type is a valid enum value
      if (!Object.values(BlockType).includes(blockTypeValue as BlockType)) {
        console.error("Invalid block type:", blockTypeValue)
        return
      }

      const blockType = blockTypeValue as BlockType
      const blockMetadata = getBlockMetadata(blockType)

      // Safely parse the node data
      let nodeData = {}
      try {
        const dataString = event.dataTransfer.getData("application/reactflow/data")
        if (dataString) {
          nodeData = JSON.parse(dataString)
        } else {
          console.warn("No node data found in dataTransfer")
          // Provide default data if none exists
          nodeData = {
            label: blockMetadata.label,
            description: blockMetadata.description,
            blockType: blockType,
            config: { ...blockMetadata.defaultConfig },
          }
        }
      } catch (error) {
        console.error("Error parsing node data:", error)
        // Provide default data on parsing error
        nodeData = {
          label: blockMetadata.label,
          description: blockMetadata.description,
          blockType: blockType,
          config: { ...blockMetadata.defaultConfig },
        }
      }

      // Get the position where the node was dropped
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      })

      // Create a new node
      const newNode: Node = {
        id: `${blockType}-${Date.now()}`,
        type: "custom", // Use our custom node type
        position,
        data: {
          ...nodeData,
          blockType: blockType, // Explicitly set blockType to the enum value
        },
      }

      console.log("Created new node:", newNode)

      // Add the new node to the canvas
      setNodes((nds) => {
        const newNodes = nds.concat(newNode)
        addToHistory(newNodes, edges)
        return newNodes
      })

      // Notify parent component if callback is provided
      if (onNodesChange) {
        onNodesChange([...nodes, newNode])
      }
    },
    [nodes, edges, onNodesChange, reactFlowInstance, setNodes, addToHistory],
  )

  // Handle drag over event
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "move"
  }, [])

  // Drag highlighting: show dashed outline on valid drop
  const [isDragActive, setIsDragActive] = useState(false)
  const handleDragOverCanvas = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setIsDragActive(true)
  }, [])
  const handleDragLeaveCanvas = useCallback(() => {
    setIsDragActive(false)
  }, [])
  const handleDropCanvas = useCallback((event: React.DragEvent) => {
    onDrop(event)
    setIsDragActive(false)
  }, [onDrop])

  // Expose methods for the toolbar
  const flowActions = {
    zoomIn: handleZoomIn,
    zoomOut: handleZoomOut,
    fitView: handleFitView,
    toggleGrid: () => setIsGridVisible(!isGridVisible),
    deleteSelected: handleDeleteSelectedNodes,
    duplicateSelected: handleDuplicateSelectedNode,
    alignHorizontal: handleAlignHorizontal,
    alignVertical: handleAlignVertical,
    resetCanvas: handleResetCanvas,
    undo: handleUndo,
    redo: handleRedo,
    canUndo: history.currentIndex > 0,
    canRedo: history.currentIndex < history.nodes.length - 1,
  }

  // Make flowActions available to parent components
  useEffect(() => {
    if (toolbarRef && toolbarRef.current) {
      toolbarRef.current.canUndo = flowActions.canUndo
      toolbarRef.current.canRedo = flowActions.canRedo
      toolbarRef.current.undo = flowActions.undo
      toolbarRef.current.redo = flowActions.redo
      toolbarRef.current.zoomIn = flowActions.zoomIn
      toolbarRef.current.zoomOut = flowActions.zoomOut
      toolbarRef.current.fitView = flowActions.fitView
      toolbarRef.current.toggleGrid = flowActions.toggleGrid
      toolbarRef.current.deleteSelected = flowActions.deleteSelected
      toolbarRef.current.duplicateSelected = flowActions.duplicateSelected
      toolbarRef.current.alignHorizontal = flowActions.alignHorizontal
      toolbarRef.current.alignVertical = flowActions.alignVertical
      toolbarRef.current.resetCanvas = flowActions.resetCanvas
    }
  }, [
    toolbarRef,
    flowActions.canUndo,
    flowActions.canRedo,
    flowActions.undo,
    flowActions.redo,
    flowActions.zoomIn,
    flowActions.zoomOut,
    flowActions.fitView,
    flowActions.toggleGrid,
    flowActions.deleteSelected,
    flowActions.duplicateSelected,
    flowActions.alignHorizontal,
    flowActions.alignVertical,
    flowActions.resetCanvas,
  ])

  // Sync to parent after render to avoid setState during render
  useEffect(() => {
    if (onNodesChange) onNodesChange(nodes)
  }, [nodes, onNodesChange])
  useEffect(() => {
    if (onEdgesChange) onEdgesChange(edges)
  }, [edges, onEdgesChange])

  // Highlight disconnected nodes
  useEffect(() => {
    // Only update styles if needed
    const updatedNodes = nodes.map((node) => {
      const connected = edges.some(
        (e) => e.source === node.id || e.target === node.id
      );
      const borderStyle = connected ? undefined : '2px solid red';
      if ((node.style?.border || undefined) !== borderStyle) {
        return { ...node, style: { ...node.style, border: borderStyle } };
      }
      return node;
    });
    // Check if any styles changed
    const hasChanges = updatedNodes.some((u, i) => u !== nodes[i]);
    if (hasChanges) setNodes(updatedNodes);
  }, [nodes, edges, setNodes]);

  return (
    <div className="flex h-full">
      <div
        ref={reactFlowWrapper}
        className={`flex-1 h-full ${isDragActive ? 'border-2 border-dashed border-blue-400' : ''}`}
        onDragOver={handleDragOverCanvas}
        onDragLeave={handleDragLeaveCanvas}
        onDrop={handleDropCanvas}
      >
        <ReactFlow
          // Animated connection and smooth grid snap
          snapToGrid
          snapGrid={[16, 16]}
          connectionLineStyle={{ stroke: "#3b82f6", strokeWidth: 2, transition: "stroke 0.2s ease-in-out" }}
          nodes={nodes}
          edges={edges}
          onNodesChange={(changes) => {
            setNodes((nds) => {
              const updatedNodes = applyNodeChanges(changes, nds)

              // Only add to history for position changes or resize changes, not selection changes
              const hasPositionChanges = changes.some((change) => change.type === "position" && change.position)
              const hasResizeChanges = changes.some(
                (change) => change.type === "dimensions" && (change.dimensions?.width || change.dimensions?.height),
              )

              if (hasPositionChanges || hasResizeChanges) {
                addToHistory(updatedNodes, edges)
              }

              return updatedNodes
            })
          }}
          onEdgesChange={(changes) => {
            setEdges((eds) => {
              const updatedEdges = applyEdgeChanges(changes, eds)

              // Only add to history for remove changes
              const hasRemoveChanges = changes.some((change) => change.type === "remove")

              if (hasRemoveChanges) {
                addToHistory(nodes, updatedEdges)
              }

              return updatedEdges
            })
          }}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onNodeContextMenu={onNodeContextMenu}
          onEdgeContextMenu={onEdgeContextMenu}
          onPaneContextMenu={onPaneContextMenu}
          onEdgeUpdateStart={onEdgeUpdateStart}
          onEdgeUpdate={onEdgeUpdate}
          onEdgeUpdateEnd={onEdgeUpdateEnd}
          onInit={setReactFlowInstance}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          defaultEdgeOptions={{ type: "custom" }}
        >
          {isGridVisible && <Background />}
          <Controls showInteractive={false} />
          <MiniMap />
        </ReactFlow>
      </div>

      {showConfigPanel && selectedNode && (
        <BlockConfigPanel node={selectedNode} onUpdate={handleNodeUpdate} onClose={handleCloseConfigPanel} />
      )}
      {showEdgeConfigPanel && selectedEdge && (
        <EdgeConfigPanel edge={selectedEdge} onUpdate={handleEdgeUpdate} onClose={handleCloseEdgeConfigPanel} />
      )}
      {contextMenu && (
        <ContextMenu x={contextMenu.x} y={contextMenu.y} onClose={closeContextMenu} options={getContextMenuOptions()} />
      )}
    </div>
  )
}

// Main component that wraps the flow content with the provider
export function FlowCanvas(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowContent {...props} />
    </ReactFlowProvider>
  )
}
