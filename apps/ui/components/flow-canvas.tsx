"use client";

import { useToast } from "@/components/ui/use-toast";
import { wouldCreateCycle } from "@/lib/workflow/cycle-detection";
import {
  Background,
  BackgroundVariant,
  Controls,
  Edge,
  MiniMap,
  Node,
  ReactFlow,
  ReactFlowProvider,
  applyEdgeChanges,
  applyNodeChanges,
  ConnectionMode,
  Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { NodeCategory } from "@zyra/types";
// Removed debounce import since we're using direct node updates
import { useNodeConfigurations } from "@/app/builder/node-configurations";
import { useWorkflowStore } from "@/lib/store/workflow-store";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { BlockConfigPanel } from "./block-config-panel";
import { ContextMenu } from "./context-menu";
import { EdgeConfigPanel } from "./edge-config-panel";
import "@xyflow/react/dist/style.css";
import CustomConnectionLine from "./custom-connection-line";
import { useTheme } from "next-themes";

interface FlowCanvasProps {
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
  // Additional props for integration with builder page
  onAddCustomBlock?: (blockType: string) => void;
  onChangeWorkflowDetails?: (details: {
    name?: string;
    description?: string;
  }) => void;
  onSave?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onExecute?: () => void;
  onDelete?: () => void;
  onCopy?: () => void;
  onDuplicate?: () => void;
  onReset?: () => void;
  onZoomIn?: () => Promise<boolean> | undefined;
  onZoomOut?: () => Promise<boolean> | undefined;
  onFitView?: () => Promise<boolean> | undefined;
  onToggleGrid?: () => void;
  isGridVisible?: boolean;
  isUndoDisabled?: boolean;
  isRedoDisabled?: boolean;
  onHelp?: () => void;
  isExecuting?: boolean;
}

function FlowContent({ toolbarRef }: FlowCanvasProps) {
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
  const { theme } = useTheme();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const { nodeTypes, edgeTypes, defaultEdgeOptions } = useNodeConfigurations();

  // Local state for context menu (component-specific, not moved to store)
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    type: "node" | "edge" | "canvas";
    id?: string;
  } | null>(null);

  // Theme-aware colors
  const isDark = theme === "dark";
  const themeColors = {
    background: isDark ? "#0f172a" : "#ffffff",
    grid: isDark ? "#1e293b" : "#f1f5f9",
    connectionLine: isDark ? "#64748b" : "#94a3b8",
    edge: isDark ? "#475569" : "#64748b",
  };

  // Initialize canvas state
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

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
      console.log("onDrop", event);
      if (!reactFlowWrapper.current || !reactFlowInstance) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const blockType = event.dataTransfer.getData(
        "application/reactflow/type"
      );

      if (!blockType) return;

      // Get the additional metadata for creating a fully configured node
      interface NodeMetadata {
        label?: string;
        nodeType?: NodeCategory;
        description?: string;
        config?: Record<string, unknown>;
        [key: string]: unknown;
      }

      let nodeMetadata: NodeMetadata = {};
      try {
        const metadataStr = event.dataTransfer.getData(
          "application/reactflow/metadata"
        );
        if (metadataStr) {
          nodeMetadata = JSON.parse(metadataStr);
        }
      } catch (error) {
        console.error("Failed to parse node metadata:", error);
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      // Create a well-formed node with proper data structure for the ImprovedCustomNode

      // Preserve the config from nodeMetadata, especially for custom blocks
      const preservedConfig = nodeMetadata?.config || {};

      // Add default configuration values based on block type if they don't exist
      const defaultConfig = {
        ...preservedConfig, // Preserve existing config (like customBlockId)
      };

      const newNode = {
        id: `${blockType}-${Date.now()}`,
        type: blockType,
        position,
        data: {
          blockType,
          label: nodeMetadata?.label || `${blockType} Node`,
          nodeType: nodeMetadata?.nodeType || NodeCategory.ACTION,
          description: nodeMetadata?.description || "",
          isValid: true,
          isEnabled: true,
          inputCount: 1,
          outputCount: 1,
          status: "idle",
          ...nodeMetadata,
          // Override to ensure config is properly set (must come after spread)
          config: defaultConfig,
        },
      };

      console.log("Created node with config:", newNode.data.config);
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
      console.log("params", params);
      const newEdge = {
        ...params,
        id: `${params.source}-${params.target}-${Date.now()}`,
        type: "custom",
        animated: true,
        style: { stroke: themeColors.edge },
      };
      addEdge(newEdge);
    },
    [nodes, edges, addEdge, toast, themeColors.edge]
  );

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

  // Show loading state while initializing
  if (!isInitialized) {
    return (
      <div className='flex items-center justify-center h-full bg-muted/5'>
        <div className='flex flex-col items-center gap-4'>
          <div className='w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin' />
          <p className='text-sm text-muted-foreground'>
            Loading workflow canvas...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='flex h-full bg-background'>
      {/* Canvas Area */}
      <div
        ref={reactFlowWrapper}
        className={`flex-1 h-full ${isDark ? "dark" : ""}`}
        onDragOver={handleDragOverCanvas}
        onDrop={onDrop}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={(changes) => {
            try {
              // Create a deep copy of nodes to avoid modifying read-only properties
              const nodesCopy = nodes.map((node) => ({
                ...JSON.parse(JSON.stringify(node)),
                // Preserve any non-serializable properties if needed
                // For example, if there are functions or complex objects
              }));

              // Apply changes to our copied nodes
              const updatedNodes = applyNodeChanges(changes, nodesCopy);
              setNodes(updatedNodes);
            } catch (error) {
              console.error("Error applying node changes:", error);
              // Fallback: just use the original nodes if there's an error
            }
          }}
          onEdgesChange={(changes) => {
            // Apply changes directly, the store's setEdges is already throttled
            const updatedEdges = applyEdgeChanges(changes, edges);
            setEdges(updatedEdges);
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
            setContextMenu(null); // Close context menu on pane click
          }}
          onNodeContextMenu={(event, node) => {
            // Prevent default browser context menu
            event.preventDefault();
            setSelectedNode(node);
            setContextMenu({
              x: event.clientX,
              y: event.clientY,
              type: "node",
              id: node.id,
            });
          }}
          onEdgeContextMenu={(event, edge) => {
            // Prevent default browser context menu
            event.preventDefault();
            setSelectedEdge(edge);
            setContextMenu({
              x: event.clientX,
              y: event.clientY,
              type: "edge",
              id: edge.id,
            });
          }}
          onPaneContextMenu={(event) => {
            // Prevent default browser context menu
            event.preventDefault();
            setContextMenu({
              x: event.clientX,
              y: event.clientY,
              type: "canvas",
            });
          }}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onInit={setReactFlowInstance}
          connectionMode={ConnectionMode.Loose}
          connectionLineStyle={{ stroke: themeColors.connectionLine }}
          defaultEdgeOptions={defaultEdgeOptions}
          connectionLineComponent={CustomConnectionLine}
          fitView
          className={isDark ? "dark" : "light"}
          style={{ backgroundColor: themeColors.background }}>
          {/* Theme-aware Background */}
          {isGridVisible && (
            <Background
              variant='dots'
              gap={16}
              size={0.6}
              color={themeColors.grid}
            />
          )}

          {/* Theme-aware Controls */}
          <Controls
            className={
              isDark
                ? "react-flow__controls-dark"
                : "react-flow__controls-light"
            }
          />

          {/* Theme-aware MiniMap */}
          {nodes.length > 10 && (
            <MiniMap
              pannable
              zoomable
              className={
                isDark
                  ? "react-flow__minimap-dark"
                  : "react-flow__minimap-light"
              }
              maskColor={
                isDark ? "rgba(15, 23, 42, 0.8)" : "rgba(255, 255, 255, 0.8)"
              }
              nodeColor={(node) => {
                return node.selected
                  ? isDark
                    ? "#3b82f6"
                    : "#2563eb"
                  : isDark
                    ? "#374151"
                    : "#e5e7eb";
              }}
            />
          )}
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

export function FlowCanvas(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowContent {...props} />
    </ReactFlowProvider>
  );
}
