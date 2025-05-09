"use client";

import { useToast } from "@/components/ui/use-toast";
import { createClient } from "@/lib/supabase/client";
import { wouldCreateCycle } from "@/lib/workflow/cycle-detection";
import {
  Background,
  Connection,
  Controls,
  Edge,
  MiniMap,
  Node,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { debounce } from "lodash";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { BlockConfigPanel } from "./block-config-panel";
import { ContextMenu } from "./context-menu";
import { CustomEdge } from "./custom-edge";
import { ImprovedCustomNode } from "./custom-node_improved";
import { EdgeConfigPanel } from "./edge-config-panel";
import { useWorkflowStore } from "@/lib/store/workflow-store";

const MemoizedCustomNode = React.memo(ImprovedCustomNode);
const MemoizedCustomEdge = React.memo(CustomEdge);

interface FlowCanvasProps {
  executionId?: string | null;
  toolbarRef?: React.RefObject<{
    canUndo: boolean;
    canRedo: boolean;
    undo: () => void;
    redo: () => void;
    zoomIn?: () => void;
    zoomOut?: () => void;
    fitView?: () => void;
    toggleGrid?: () => void;
    deleteSelected?: () => void;
    duplicateSelected?: () => void;
    alignHorizontal?: (alignment: "left" | "center" | "right") => void;
    alignVertical?: (alignment: "top" | "center" | "bottom") => void;
    resetCanvas?: () => void;
  }>;
}

function FlowContent({ executionId, toolbarRef }: FlowCanvasProps) {
  // Access state and actions from Zustand store
  const {
    nodes,
    edges,
    addNode,
    setNodes,
    setEdges,
    updateEdge,
    removeEdge,
    updateNode,
    removeNode,
    setSelectedNode,
    setSelectedEdge,
    setShowConfigPanel,
    setShowEdgeConfigPanel,
    setGridVisible,
    setReactFlowInstance,
    reactFlowInstance,
    selectedEdge,
    selectedNode,
    canUndo,
    canRedo,
    undo,
    redo,
    addEdge,
    isGridVisible,
    showConfigPanel,
    showEdgeConfigPanel,
  } = useWorkflowStore();

  const { toast } = useToast();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Memoize node and edge types for performance
  const nodeTypes = useMemo(() => ({ custom: MemoizedCustomNode }), []);
  const edgeTypes = useMemo(() => ({ custom: MemoizedCustomEdge }), []);

  // Local state for context menu (component-specific, not moved to store)
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    type: "node" | "edge" | "canvas";
    id?: string;
  } | null>(null);

  // **Event Handlers**

  // Handle node updates from the config panel
  const handleNodeUpdate = useCallback(
    (updatedNode: Node) => {
      updateNode(updatedNode.id, updatedNode);
      setSelectedNode(updatedNode);
    },
    [updateNode, setSelectedNode]
  );

  // Handle edge updates from the config panel
  const handleEdgeUpdate = useCallback(
    (updatedEdge: Edge) => {
      updateEdge(updatedEdge.id, updatedEdge);
      setSelectedEdge(updatedEdge);
    },
    [updateEdge, setSelectedEdge]
  );

  // Close the node config panel
  const handleCloseConfigPanel = useCallback(() => {
    setShowConfigPanel(false);
    setSelectedNode(null);
  }, [setShowConfigPanel, setSelectedNode]);

  // Close the edge config panel
  const handleCloseEdgeConfigPanel = useCallback(() => {
    setShowEdgeConfigPanel(false);
    setSelectedEdge(null);
  }, [setShowEdgeConfigPanel, setSelectedEdge]);

  // Handle dropping a new node onto the canvas
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (!reactFlowWrapper.current || !reactFlowInstance) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const blockType = event.dataTransfer.getData(
        "application/reactflow/type"
      );

      if (!blockType) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode = {
        id: `${blockType}-${Date.now()}`,
        type: "custom",
        position,
        data: { label: `${blockType} Node` },
      };

      addNode(newNode);
    },
    [addNode, reactFlowInstance]
  );

  // Allow dropping on the canvas
  const handleDragOverCanvas = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // Close the context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Generate context menu options based on the clicked element
  const getContextMenuOptions = useCallback(() => {
    if (!contextMenu) return [];

    if (contextMenu.type === "node") {
      return [
        {
          label: "Edit Node",
          onClick: () => setShowConfigPanel(true),
        },
        {
          label: "Delete Node",
          onClick: () => {
            if (selectedNode) removeNode(selectedNode.id);
          },
        },
      ];
    }

    if (contextMenu.type === "edge") {
      return [
        {
          label: "Edit Edge",
          onClick: () => setShowEdgeConfigPanel(true),
        },
        {
          label: "Delete Edge",
          onClick: () => {
            if (selectedEdge) removeEdge(selectedEdge.id);
          },
        },
      ];
    }

    return [];
  }, [
    contextMenu,
    selectedNode,
    selectedEdge,
    removeNode,
    removeEdge,
    setShowConfigPanel,
    setShowEdgeConfigPanel,
  ]);

  // Handle edge connections with cycle detection
  const onConnect = useCallback(
    (params: Connection) => {
      if (wouldCreateCycle(nodes, edges, params)) {
        toast({
          title: "Cannot Create Connection",
          description:
            "This would create a circular dependency in your workflow",
          variant: "destructive",
          duration: 3000,
        });
        return;
      }
      const newEdge = {
        ...params,
        id: `${params.source}-${params.target}-${Date.now()}`,
        type: "custom",
        animated: true,
        style: { stroke: "#64748b" },
      };
      addEdge(newEdge);
    },
    [nodes, edges, addEdge, toast]
  );

  // Debounce node updates for smoother dragging
  const debouncedSetNodes = useMemo(() => debounce(setNodes, 50), [setNodes]);

  // Update toolbar actions using store state and actions
  useEffect(() => {
    if (toolbarRef && toolbarRef.current) {
      toolbarRef.current.canUndo = canUndo;
      toolbarRef.current.canRedo = canRedo;
      toolbarRef.current.undo = undo;
      toolbarRef.current.redo = redo;
      toolbarRef.current.zoomIn = () => reactFlowInstance?.zoomIn();
      toolbarRef.current.zoomOut = () => reactFlowInstance?.zoomOut();
      toolbarRef.current.fitView = () => reactFlowInstance?.fitView();
      toolbarRef.current.toggleGrid = () => setGridVisible(!isGridVisible);
      toolbarRef.current.deleteSelected = () => {
        if (selectedNode) removeNode(selectedNode.id);
        if (selectedEdge) removeEdge(selectedEdge.id);
      };
      toolbarRef.current.duplicateSelected = () => {
        if (selectedNode) {
          const newNode = {
            ...selectedNode,
            id: `${selectedNode.type}-${Date.now()}`,
            position: {
              x: selectedNode.position.x + 50,
              y: selectedNode.position.y + 50,
            },
          };
          addNode(newNode);
        }
      };
      // Additional toolbar actions (e.g., alignHorizontal, alignVertical) can be added here
    }
  }, [
    canUndo,
    canRedo,
    undo,
    redo,
    reactFlowInstance,
    isGridVisible,
    setGridVisible,
    selectedNode,
    selectedEdge,
    removeNode,
    removeEdge,
    addNode,
    toolbarRef,
  ]);

  return (
    <div className='flex h-full'>
      {/* Canvas Area */}
      <div
        ref={reactFlowWrapper}
        className='flex-1 h-full'
        onDragOver={handleDragOverCanvas}
        onDrop={onDrop}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={(changes) => {
            debouncedSetNodes((nds) => applyNodeChanges(changes, nds));
          }}
          onEdgesChange={(changes) => {
            setEdges((eds) => applyEdgeChanges(changes, eds));
          }}
          onConnect={onConnect}
          onNodeClick={(event, node) => {
            setSelectedNode(node);
            setShowConfigPanel(true);
          }}
          onEdgeClick={(event, edge) => {
            setSelectedEdge(edge);
            setShowEdgeConfigPanel(true);
          }}
          onPaneClick={() => {
            setSelectedNode(null);
            setSelectedEdge(null);
            setShowConfigPanel(false);
            setShowEdgeConfigPanel(false);
          }}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onInit={setReactFlowInstance}
          fitView>
          {isGridVisible && (
            <Background variant='dots' gap={16} size={0.6} color='#f8fafc' />
          )}
          <Controls />
          {nodes.length > 10 && <MiniMap pannable zoomable />}
        </ReactFlow>
      </div>

      {/* Config Panels */}
      {showConfigPanel && selectedNode && (
        <BlockConfigPanel
          node={selectedNode}
          onUpdate={handleNodeUpdate}
          onClose={handleCloseConfigPanel}
        />
      )}
      {showEdgeConfigPanel && selectedEdge && (
        <EdgeConfigPanel
          edge={selectedEdge}
          onUpdate={handleEdgeUpdate}
          onClose={handleCloseEdgeConfigPanel}
        />
      )}

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          options={getContextMenuOptions()}
        />
      )}
    </div>
  );
}

export function FlowCanvas({ executionId, toolbarRef }: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowContent executionId={executionId} toolbarRef={toolbarRef} />
    </ReactFlowProvider>
  );
}
