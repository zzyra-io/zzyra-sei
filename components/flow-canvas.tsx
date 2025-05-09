"use client";

import type React from "react";
import { useCallback, useRef, useState, useEffect, memo, useMemo } from "react";
import { debounce } from "lodash";
import {
  ReactFlow,
  Controls,
  Background,
  MiniMap,
  NodeTypes,
  Edge,
  Connection,
  ReactFlowInstance,
  ReactFlowProvider,
  Node,
  addEdge,
  EdgeTypes,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  NodeDragHandler,
  OnNodesChange,
  OnEdgesChange,
  updateEdge,
  MarkerType,
  Position,
  useReactFlow,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
// import { CustomNode } from "./custom-node";
import { CustomEdge } from "./custom-edge";
import { BlockConfigPanel } from "./block-config-panel";
import { EdgeConfigPanel } from "./edge-config-panel";
import { ContextMenu } from "./context-menu";
import { BlockType, getBlockMetadata } from "@/types/workflow";
import { useToast } from "@/components/ui/use-toast";
import { useHotkeys } from "react-hotkeys-hook";
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
} from "lucide-react";
import { wouldCreateCycle } from "@/lib/workflow/cycle-detection";
import { ImprovedCustomNode } from "./custom-node_improved";
import { CustomConnectionLine } from "./custom-connection-line";
import { createClient } from "@/lib/supabase/client";

// Pre-memoize components at module level is safe for SSR
const MemoizedCustomNode = memo(ImprovedCustomNode);
const MemoizedCustomEdge = memo(CustomEdge);

interface FlowCanvasProps {
  executionId?: string | null;
  initialNodes?: Node[];
  initialEdges?: Edge[];
  onNodesChange?: (nodes: Node[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
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

// Create a separate component for the flow content to use hooks inside the provider
function FlowContent({
  initialNodes = [],
  initialEdges = [],
  onNodesChange,
  onEdgesChange,
  toolbarRef,
  executionId,
}: FlowCanvasProps): React.ReactNode {
  // Define node and edge types inside the component with useMemo
  // This prevents server-side rendering errors
  const nodeTypes = useMemo(
    () => ({
      custom: MemoizedCustomNode,
    }),
    []
  ) as NodeTypes;

  const edgeTypes = useMemo<EdgeTypes>(
    () => ({
      custom: MemoizedCustomEdge,
    }),
    []
  );
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  // XYFlow uses regular useState hooks instead of the specialized ones from ReactFlow
  const [nodes, setNodes] = useState<Node[]>(initialNodes);
  const [edges, setEdges] = useState<Edge[]>(initialEdges);
  // Use the XYFlow hook to get access to the instance and its methods
  const reactFlowHook = useReactFlow();

  // Optimize node updates with debounce
  const updateNodesOptimized = useCallback(
    (changes: NodeChange[]) => {
      setNodes((nds) => applyNodeChanges(changes, nds));
    },
    [setNodes]
  );

  const debouncedNodeUpdate = useMemo(
    () => debounce(updateNodesOptimized, 50),
    [updateNodesOptimized]
  );
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance | null>(null);
  const [isPanning, setIsPanning] = useState<boolean>(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [isGridVisible, setIsGridVisible] = useState(true);
  const { toast } = useToast();

  // Add state for selected edge
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [showEdgeConfigPanel, setShowEdgeConfigPanel] = useState(false);

  // History management for undo/redo
  const [history, setHistory] = useState<{
    nodes: Node[][];
    edges: Edge[][];
    currentIndex: number;
  }>({
    nodes: [initialNodes],
    edges: [initialEdges],
    currentIndex: 0,
  });

  // Add state for context menu
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    type: "node" | "edge" | "canvas";
    id?: string;
  } | null>(null);

  // Edge state management with XYFlow approach
  // XYFlow handles edge updates differently than ReactFlow

  const supabase = useMemo(() => createClient(), []);

  const [statusMap, setStatusMap] = useState<Record<string, string>>({});

  // Define interface for node status data outside the effect
  interface NodeStatusData {
    id: number;
    execution_id: string;
    node_id: string;
    status: string; // Using string instead of union type to avoid type errors
    updated_at: string;
  }

  // Use a ref to track if we've already fetched initial statuses
  const initialStatusesFetched = useRef(false);

  useEffect(() => {
    if (!executionId) {
      console.log("No execution ID provided, skipping subscription setup");
      return;
    }

    console.log(`Setting up status tracking for execution ID: ${executionId}`);

    // Reset the status map when execution ID changes
    setStatusMap({});
    initialStatusesFetched.current = false;

    // Fetch existing statuses first
    const fetchExistingStatuses = async () => {
      try {
        console.log(
          `Fetching existing statuses for execution ID: ${executionId}`
        );
        const { data, error } = await supabase
          .from("execution_node_status")
          .select("*")
          .eq("execution_id", executionId);

        if (error) {
          console.error("Error fetching node statuses:", error);
          return;
        }

        if (data && data.length > 0) {
          console.log(`Found ${data.length} existing node statuses:`, data);

          // Type-safe implementation
          const statusMapFromData: Record<string, NodeStatusData> = {};

          // Group by node_id and keep the latest status
          data.forEach((item: NodeStatusData) => {
            if (
              !statusMapFromData[item.node_id] ||
              new Date(item.updated_at) >
                new Date(statusMapFromData[item.node_id].updated_at)
            ) {
              statusMapFromData[item.node_id] = item;
            }
          });

          // Convert to simple status map
          const simpleStatusMap: Record<string, string> = {};
          Object.keys(statusMapFromData).forEach((nodeId) => {
            simpleStatusMap[nodeId] = statusMapFromData[nodeId].status;
          });

          console.log("Setting initial status map:", simpleStatusMap);
          setStatusMap(simpleStatusMap);
        } else {
          console.log("No existing node statuses found");
        }

        initialStatusesFetched.current = true;
      } catch (err) {
        console.error("Error in fetchExistingStatuses:", err);
      }
    };

    fetchExistingStatuses();

    // Set up real-time subscription for new updates
    console.log(`Setting up subscription for execution ID: ${executionId}`);

    // Create a more reliable channel name
    const channelName = `node_status_${executionId}_${Date.now()}`;
    console.log(`Channel name: ${channelName}`);

    // We'll set up test status updates in a separate useEffect

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "execution_node_status",
          filter: `execution_id=eq.${executionId}`,
        },
        (payload) => {
          console.log("Received node status update via subscription:", payload);
          if (payload.new) {
            const nodeId = payload.new.node_id;
            const status = payload.new.status;
            console.log(`Updating node ${nodeId} with status: ${status}`);

            // Alert to make it very visible in the console
            console.warn(
              `⚠️ SOCKET UPDATE: Node ${nodeId} status changed to ${status}`
            );

            setStatusMap((prev) => {
              const newMap = { ...prev, [nodeId]: status };
              console.log("Updated status map:", newMap);
              return newMap;
            });
          }
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status);
      });

    console.log("Subscription channel created:", channel);

    return () => {
      console.log(`Removing channel subscription for ${channelName}`);
      supabase.removeChannel(channel);
    };
  }, [executionId, supabase]);

  // Debug logging function for node status updates - only active in development
  const debugLog = (message: string, data?: any) => {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[Node Status] ${message}`, data);
    }
  };

  // Track component mount state to prevent updates after unmount
  const isMountedRef = useRef(true);
  const lastProcessedStatusMapRef = useRef<Record<string, string>>({});
  // Handle component unmount
  useEffect(() => {
    // Set up cleanup function
    return () => {
      // Mark component as unmounted to prevent state updates after unmount
      isMountedRef.current = false;
      // Cancel any pending debounced operations to prevent memory leaks
      debouncedSetNodesRef.current?.cancel?.();
    };
  }, []); // Empty dependency array as this should only run on mount/unmount

  // Ref to store the debounced function to prevent re-creation on each render
  // Define a proper type for the debounced function
  type DebouncedSetNodesFunction = {
    (updater: (nodes: Node[]) => Node[]): void;
    cancel: () => void;
    flush: () => void;
  };
  const debouncedSetNodesRef = useRef<DebouncedSetNodesFunction | null>(null);

  // Create debounced status update function to prevent excessive re-renders
  useMemo(() => {
    // Create a debounced function with appropriate timing based on environment
    const debounceTime = process.env.NODE_ENV === "production" ? 25 : 50;

    debouncedSetNodesRef.current = debounce(
      (updater: (nodes: Node[]) => Node[]) => {
        if (isMountedRef.current) {
          setNodes(updater);
        }
      },
      debounceTime
    );
  }, [setNodes]);

  // Remove test status update code as it's no longer needed

  // Enterprise-grade production-ready node status update implementation
  useEffect(() => {
    // Skip processing if component is unmounted
    if (!isMountedRef.current) return;

    // Skip empty status maps
    if (Object.keys(statusMap).length === 0) return;

    try {
      // Check if this is a duplicate update with the same status values
      const statusMapStr = JSON.stringify(statusMap);
      const lastStatusMapStr = JSON.stringify(
        lastProcessedStatusMapRef.current
      );

      if (statusMapStr === lastStatusMapStr) return;

      // Update the last processed status map
      lastProcessedStatusMapRef.current = { ...statusMap };

      // In production, we only need minimal logging
      if (process.env.NODE_ENV === "development") {
        console.log(
          "Processing status updates:",
          Object.entries(statusMap)
            .map(([id, status]) => `${id}:${status}`)
            .join(", ")
        );
      }

      // Use debounced node updates to prevent excessive re-renders
      // For production, we use a shorter debounce time for more responsive UI
      // No need to update debounce time here as it's now handled in the useMemo hook

      // Use a performance-optimized approach for production
      const updateNodes = (nds: Node[]) => {
        // Performance optimization: Create a Map for O(1) lookups
        const nodeMap = new Map<string, Node>();
        const dataIdMap = new Map<string, Node>();
        const nodeStatusMap = new Map<string, string>();

        // Track if we need to update the UI
        let hasUpdates = false;

        // Build lookup maps for efficient node finding
        nds.forEach((node) => {
          nodeMap.set(node.id, node);
          if (node.data?.id) {
            dataIdMap.set(node.data.id, node);
          }
          // Store current status for comparison
          // nodeStatusMap.set(node.id, node.data?.status);
        });

        // Batch all updates for better performance
        const updatedNodes = [...nds];
        const updatedIndices = new Set<number>();

        // Find nodes that need status updates
        // Object.entries(statusMap).forEach(([statusNodeId, status]) => {
        //   // Try to find the node by direct ID first
        //   let node = nodeMap.get(statusNodeId);
        //   let nodeIndex = -1;

        //   // If not found by direct ID, try data.id
        //   if (!node) {
        //     node = dataIdMap.get(statusNodeId);
        //   }

        //   if (node) {
        //     nodeIndex = nds.findIndex((n) => n.id === node!.id);
        //   }

        //   // If node found, status is different, and we haven't updated this node yet
        //   if (
        //     node &&
        //     nodeIndex !== -1 &&
        //     nodeStatusMap.get(node.id) !== status &&
        //     !updatedIndices.has(nodeIndex)
        //   ) {
        //     // Mark that we have updates
        //     hasUpdates = true;

        //     // Create updated node with new status
        //     updatedNodes[nodeIndex] = {
        //       ...node,
        //       data: {
        //         ...node.data,
        //         status: status,
        //         // Add timestamp for animation triggers and debugging
        //         statusUpdatedAt: Date.now(),
        //       },
        //     };

        //     // Mark this index as updated
        //     updatedIndices.add(nodeIndex);
        //   }
        // });

        // If no nodes were updated, return original array
        if (!hasUpdates) return nds;

        return updatedNodes;
      };

      // Apply the updates with debouncing
      if (debouncedSetNodesRef.current) {
        debouncedSetNodesRef.current(updateNodes);
      }
    } catch (error) {
      // In production, we should log errors to a monitoring service
      console.error("Error updating node statuses:", error);

      // In a real production app, you would report this to your error tracking service
      // reportErrorToMonitoring(error);
    }

    // Cleanup function to prevent memory leaks
    return () => {
      debouncedSetNodesRef.current?.cancel?.();
    };
  }, [statusMap]); // Only depend on statusMap changes

  // Add to history when nodes or edges change
  const addToHistory = useCallback((newNodes: Node[], newEdges: Edge[]) => {
    setHistory((prev) => {
      // Remove any future history if we're not at the end
      const nodes = prev.nodes.slice(0, prev.currentIndex + 1);
      const edges = prev.edges.slice(0, prev.currentIndex + 1);

      return {
        nodes: [...nodes, newNodes],
        edges: [...edges, newEdges],
        currentIndex: prev.currentIndex + 1,
      };
    });
  }, []);

  // Handle node deletion
  const handleDeleteSelectedNodes = useCallback(() => {
    if (selectedNode) {
      setNodes((nds) => {
        const newNodes = nds.filter((node) => node.id !== selectedNode.id);
        addToHistory(newNodes, edges);
        return newNodes;
      });

      setSelectedNode(null);
      setShowConfigPanel(false);

      toast({
        title: "Node Deleted",
        description: "Selected node has been removed",
        duration: 1500,
      });
    }
  }, [selectedNode, edges, setNodes, addToHistory, toast]);

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
      };

      setNodes((nds) => {
        const newNodes = [...nds, newNode];
        addToHistory(newNodes, edges);
        return newNodes;
      });

      toast({
        title: "Node Duplicated",
        description: "Selected node has been duplicated",
        duration: 1500,
      });
    }
  }, [selectedNode, edges, setNodes, addToHistory, toast]);

  // Handle node alignment
  const handleAlignHorizontal = useCallback(
    (alignment: "left" | "center" | "right") => {
      if (!selectedNode) return;

      let alignPosition: number;

      switch (alignment) {
        case "left":
          alignPosition = Math.min(...nodes.map((node) => node.position.x));
          break;
        case "center": {
          const minX = Math.min(...nodes.map((node) => node.position.x));
          const maxX = Math.max(
            ...nodes.map((node) => node.position.x + (node.width || 0))
          );
          alignPosition = minX + (maxX - minX) / 2;
          break;
        }
        case "right":
          alignPosition = Math.max(
            ...nodes.map((node) => node.position.x + (node.width || 0))
          );
          break;
        default:
          return;
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
            };
          }
          return node;
        });

        addToHistory(newNodes, edges);
        return newNodes;
      });
    },
    [selectedNode, edges, setNodes, addToHistory]
  );

  // Handle node vertical alignment
  const handleAlignVertical = useCallback(
    (alignment: "top" | "center" | "bottom") => {
      if (!selectedNode) return;

      let alignPosition: number;

      switch (alignment) {
        case "top":
          alignPosition = Math.min(...nodes.map((node) => node.position.y));
          break;
        case "center": {
          const minY = Math.min(...nodes.map((node) => node.position.y));
          const maxY = Math.max(
            ...nodes.map((node) => node.position.y + (node.height || 0))
          );
          alignPosition = minY + (maxY - minY) / 2;
          break;
        }
        case "bottom":
          alignPosition = Math.max(
            ...nodes.map((node) => node.position.y + (node.height || 0))
          );
          break;
        default:
          return;
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
            };
          }
          return node;
        });

        addToHistory(newNodes, edges);
        return newNodes;
      });
    },
    [selectedNode, edges, setNodes, addToHistory]
  );

  // Handle canvas reset
  const handleResetCanvas = useCallback(() => {
    setNodes([]);
    setEdges([]);
    addToHistory([], []);

    toast({
      title: "Canvas Reset",
      description: "All nodes and connections have been removed",
      duration: 1500,
    });
  }, [setNodes, setEdges, addToHistory, toast]);

  // Handle zoom in
  const handleZoomIn = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomIn();
    }
  }, [reactFlowInstance]);

  // Handle zoom out
  const handleZoomOut = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.zoomOut();
    }
  }, [reactFlowInstance]);

  // Handle fit view
  const handleFitView = useCallback(() => {
    if (reactFlowInstance) {
      reactFlowInstance.fitView();
    }
  }, [reactFlowInstance]);

  // Handle undo
  const handleUndo = useCallback(() => {
    if (history.currentIndex > 0) {
      const newIndex = history.currentIndex - 1;
      const prevNodes = history.nodes[newIndex];
      const prevEdges = history.edges[newIndex];

      setNodes(prevNodes);
      setEdges(prevEdges);

      setHistory((prev) => ({
        ...prev,
        currentIndex: newIndex,
      }));

      toast({
        title: "Undo",
        description: "Previous action undone",
        duration: 1500,
      });
    }
  }, [history, setNodes, setEdges, toast]);

  // Handle redo
  const handleRedo = useCallback(() => {
    if (history.currentIndex < history.nodes.length - 1) {
      const newIndex = history.currentIndex + 1;
      const nextNodes = history.nodes[newIndex];
      const nextEdges = history.edges[newIndex];

      setNodes(nextNodes);
      setEdges(nextEdges);

      setHistory((prev) => ({
        ...prev,
        currentIndex: newIndex,
      }));

      toast({
        title: "Redo",
        description: "Action redone",
        duration: 1500,
      });
    }
  }, [history, setNodes, setEdges, toast]);

  // Set up keyboard shortcuts
  useHotkeys("ctrl+z", handleUndo, [handleUndo]);
  useHotkeys("ctrl+y", handleRedo, [handleRedo]);
  useHotkeys("delete", handleDeleteSelectedNodes, [handleDeleteSelectedNodes]);
  useHotkeys("ctrl+d", handleDuplicateSelectedNode, [
    handleDuplicateSelectedNode,
  ]);

  // Update the onConnect function to check for cycles
  const onConnect = useCallback(
    (params: Connection) => {
      // Check if adding this connection would create a cycle
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

      // Create a custom edge with the custom type
      const newEdge: Edge = {
        ...params,
        type: "custom",
        animated: true,
        style: { stroke: "#64748b" },
      };

      setEdges((eds) => {
        const newEdges = addEdge(newEdge, eds);
        addToHistory(nodes, newEdges);
        return newEdges;
      });
    },
    [nodes, edges, setEdges, addToHistory, toast]
  );

  // XYFlow uses a different approach for edge updates
  // const onEdgeUpdate = useCallback(
  //   (oldEdge: Edge, newConnection: Connection) => {
  //     // Check if updating this edge would create a cycle
  //     if (
  //       wouldCreateCycle(
  //         nodes,
  //         edges.filter((e) => e.id !== oldEdge.id),
  //         newConnection
  //       )
  //     ) {
  //       toast({
  //         title: "Cannot Update Connection",
  //         description:
  //           "This would create a circular dependency in your workflow",
  //         variant: "destructive",
  //         duration: 3000,
  //       });
  //       return;
  //     }

  //     // Create an updated edge manually
  //     setEdges((eds) => {
  //       const updatedEdges = eds.map((e) =>
  //         e.id === oldEdge.id ? { ...oldEdge, ...newConnection } : e
  //       );
  //       addToHistory(nodes, updatedEdges);
  //       return updatedEdges;
  //     });
  //   },
  //   [nodes, edges, setEdges, addToHistory, toast]
  // );

  // XYFlow doesn't require separate start/end handlers like ReactFlow did

  // Handle node update from config panel
  const handleNodeUpdate = useCallback(
    (updatedNode: Node) => {
      setNodes((nds) => {
        const newNodes = nds.map((node) =>
          node.id === updatedNode.id ? updatedNode : node
        );
        addToHistory(newNodes, edges);
        return newNodes;
      });

      setSelectedNode(updatedNode);
    },
    [edges, setNodes, addToHistory, setSelectedNode]
  );

  // Add edge update handler
  const handleEdgeUpdate = useCallback(
    (updatedEdge: Edge) => {
      setEdges((eds) => {
        const newEdges = eds.map((edge) =>
          edge.id === updatedEdge.id ? updatedEdge : edge
        );
        addToHistory(nodes, newEdges);
        return newEdges;
      });

      setSelectedEdge(updatedEdge);
    },
    [nodes, edges, setEdges, addToHistory]
  );

  // Add context menu close handler
  const closeContextMenu = useCallback(() => {
    setContextMenu(null);
  }, [setContextMenu]);

  // Add context menu options
  const getContextMenuOptions = useCallback(() => {
    if (!contextMenu) return [];

    if (contextMenu.type === "node") {
      return [
        {
          label: "Edit Node",
          icon: <Edit className='h-4 w-4' />,
          onClick: () => {
            // Node is already selected, just make sure config panel is open
            setShowConfigPanel(true);
          },
        },
        {
          label: "Duplicate Node",
          icon: <Copy className='h-4 w-4' />,
          onClick: handleDuplicateSelectedNode,
        },
        {
          label: "Delete Node",
          icon: <Trash2 className='h-4 w-4' />,
          onClick: handleDeleteSelectedNodes,
        },
        {
          label: "Center Horizontally",
          icon: <AlignHorizontalJustifyCenter className='h-4 w-4' />,
          onClick: () => handleAlignHorizontal("center"),
          divider: true,
        },
        {
          label: "Center Vertically",
          icon: <AlignVerticalJustifyCenter className='h-4 w-4' />,
          onClick: () => handleAlignVertical("center"),
        },
        {
          label:
            selectedNode?.data?.isEnabled === false
              ? "Enable Node"
              : "Disable Node",
          icon:
            selectedNode?.data?.isEnabled === false ? (
              <Eye className='h-4 w-4' />
            ) : (
              <EyeOff className='h-4 w-4' />
            ),
          onClick: () => {
            if (selectedNode) {
              handleNodeUpdate({
                ...selectedNode,
                data: {
                  ...selectedNode.data,
                  isEnabled:
                    selectedNode.data?.isEnabled === false ? true : false,
                },
              });
            }
          },
          divider: true,
        },
      ];
    }

    if (contextMenu.type === "edge") {
      return [
        {
          label: "Edit Edge",
          icon: <Edit className='h-4 w-4' />,
          onClick: () => {
            // Edge is already selected, just make sure config panel is open
            setShowEdgeConfigPanel(true);
          },
        },
        {
          label: "Delete Edge",
          icon: <Trash2 className='h-4 w-4' />,
          onClick: () => {
            if (selectedEdge) {
              setEdges((eds) => {
                const newEdges = eds.filter((e) => e.id !== selectedEdge.id);
                addToHistory(nodes, newEdges);
                return newEdges;
              });
              setSelectedEdge(null);
              setShowEdgeConfigPanel(false);
            }
          },
        },
        {
          label: selectedEdge?.animated
            ? "Disable Animation"
            : "Enable Animation",
          icon: selectedEdge?.animated ? (
            <EyeOff className='h-4 w-4' />
          ) : (
            <Eye className='h-4 w-4' />
          ),
          onClick: () => {
            if (selectedEdge) {
              handleEdgeUpdate({
                ...selectedEdge,
                animated: !selectedEdge.animated,
                data: {
                  ...selectedEdge.data,
                  animated: !selectedEdge.animated,
                },
              });
            }
          },
        },
      ];
    }

    if (contextMenu.type === "canvas") {
      return [
        {
          label: "Add Node",
          icon: <Plus className='h-4 w-4' />,
          onClick: () => {
            // This would ideally open a node selection dialog
            toast({
              title: "Add Node",
              description: "Please use the block catalog to add nodes",
              duration: 2000,
            });
          },
        },
        {
          label: "Fit View",
          icon: <Maximize2 className='h-4 w-4' />,
          onClick: handleFitView,
        },
        {
          label: isGridVisible ? "Hide Grid" : "Show Grid",
          icon: isGridVisible ? (
            <GridOff className='h-4 w-4' />
          ) : (
            <Grid className='h-4 w-4' />
          ),
          onClick: () => setIsGridVisible(!isGridVisible),
        },
      ];
    }

    return [];
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
  ]);

  // Handle closing the config panel
  const handleCloseConfigPanel = useCallback(() => {
    setShowConfigPanel(false);
    setSelectedNode(null);
  }, []);

  // Add handler to close edge config panel
  const handleCloseEdgeConfigPanel = useCallback(() => {
    setShowEdgeConfigPanel(false);
    setSelectedEdge(null);
  }, []);

  // Handle dropping a new node onto the canvas
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      if (!reactFlowWrapper.current || !reactFlowHook) {
        return;
      }

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();

      // Safely get the node type
      let blockTypeValue = "";
      try {
        blockTypeValue = event.dataTransfer.getData(
          "application/reactflow/type"
        );
      } catch (error) {
        console.error("Error getting block type:", error);
        return;
      }

      // Validate that the block type is a valid enum value
      if (!Object.values(BlockType).includes(blockTypeValue as BlockType)) {
        console.error("Invalid block type:", blockTypeValue);
        return;
      }

      const blockType = blockTypeValue as BlockType;
      const blockMetadata = getBlockMetadata(blockType);

      // Safely parse the node data
      let nodeData = {};
      try {
        const dataString = event.dataTransfer.getData(
          "application/reactflow/data"
        );
        if (dataString) {
          nodeData = JSON.parse(dataString);
        } else {
          console.warn("No node data found in dataTransfer");
          // Provide default data if none exists
          nodeData = {
            label: blockMetadata.label,
            description: blockMetadata.description,
            blockType: blockType,
            config: { ...blockMetadata.defaultConfig },
          };
        }
      } catch (error) {
        console.error("Error parsing node data:", error);
        // Provide default data on parsing error
        nodeData = {
          label: blockMetadata.label,
          description: blockMetadata.description,
          blockType: blockType,
          config: { ...blockMetadata.defaultConfig },
        };
      }

      // Get the position where the node was dropped - using XYFlow pattern
      const position = reactFlowHook.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      // Check if this is a custom block
      let customBlockData = null;
      if (blockType === BlockType.CUSTOM) {
        try {
          const customBlockString = event.dataTransfer.getData(
            "application/reactflow/customBlock"
          );
          if (customBlockString) {
            customBlockData = JSON.parse(customBlockString);
            console.log("Custom block data:", customBlockData);
          }
        } catch (error) {
          console.error("Error parsing custom block data:", error);
        }
      }

      // Create a new node
      const newNode: Node = {
        id: `${blockType}-${Date.now()}`,
        type: "custom", // Use our custom node type
        position,
        data: {
          ...nodeData,
          blockType: blockType, // Explicitly set blockType to the enum value
          customBlockId: customBlockData?.id, // Add custom block ID if available
          customBlockDefinition: customBlockData, // Store the full custom block definition
        },
      };

      console.log("Created new node:", newNode);

      // Add the new node to the canvas
      setNodes((nds) => {
        const newNodes = nds.concat(newNode);
        addToHistory(newNodes, edges);
        return newNodes;
      });
    },
    [edges, reactFlowHook, setNodes, addToHistory]
  );

  // Drag highlighting: show dashed outline on valid drop
  const [isDragActive, setIsDragActive] = useState(false);
  const handleDragOverCanvas = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setIsDragActive(true);
  }, []);
  const handleDragLeaveCanvas = useCallback(() => {
    setIsDragActive(false);
  }, []);
  const handleDropCanvas = useCallback(
    (event: React.DragEvent) => {
      onDrop(event);
      setIsDragActive(false);
    },
    [onDrop]
  );

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
  };

  // Make flowActions available to parent components
  useEffect(() => {
    if (toolbarRef && toolbarRef.current) {
      toolbarRef.current.canUndo = flowActions.canUndo;
      toolbarRef.current.canRedo = flowActions.canRedo;
      toolbarRef.current.undo = flowActions.undo;
      toolbarRef.current.redo = flowActions.redo;
      toolbarRef.current.zoomIn = flowActions.zoomIn;
      toolbarRef.current.zoomOut = flowActions.zoomOut;
      toolbarRef.current.fitView = flowActions.fitView;
      toolbarRef.current.toggleGrid = flowActions.toggleGrid;
      toolbarRef.current.deleteSelected = flowActions.deleteSelected;
      toolbarRef.current.duplicateSelected = flowActions.duplicateSelected;
      toolbarRef.current.alignHorizontal = flowActions.alignHorizontal;
      toolbarRef.current.alignVertical = flowActions.alignVertical;
      toolbarRef.current.resetCanvas = flowActions.resetCanvas;
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
  ]);

  // Sync to parent after render to avoid setState during render
  useEffect(() => {
    if (onNodesChange) onNodesChange(nodes);
  }, [nodes, onNodesChange]);

  // Highlight disconnected nodes
  useEffect(() => {
    // Only update styles if needed
    const updatedNodes = nodes.map((node) => {
      const connected = edges.some(
        (e) => e.source === node.id || e.target === node.id
      );
      const borderStyle = connected ? undefined : "2px solid red";
      if ((node.style?.border || undefined) !== borderStyle) {
        return { ...node, style: { ...node.style, border: borderStyle } };
      }
      return node;
    });
    // Check if any styles changed
    const hasChanges = updatedNodes.some((u, i) => u !== nodes[i]);
    if (hasChanges) setNodes(updatedNodes);
  }, [nodes, edges, setNodes]);

  // Sync internal ReactFlow state when props change
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges]);

  return (
    <div className='flex h-full'>
      <div
        ref={reactFlowWrapper}
        className={`flex-1 h-full ${
          isDragActive ? "border-2 border-dashed border-blue-400" : ""
        }`}
        onDragOver={handleDragOverCanvas}
        onDragLeave={handleDragLeaveCanvas}
        onDrop={handleDropCanvas}>
        <ReactFlow
          snapToGrid={true}
          snapGrid={[16, 16]}
          connectionLineComponent={CustomConnectionLine}
          connectionRadius={20}
          nodes={nodes}
          edges={edges}
          nodesFocusable={false}
          elevateEdgesOnSelect={true}
          nodeExtent={[
            [0, 0],
            [3000, 3000],
          ]}
          onlyRenderVisibleElements={true}
          defaultMarkerColor='rgba(100, 116, 139, 0.5)'
          selectNodesOnDrag={false}
          onPaneClick={() => setSelectedNode(null)}
          onConnect={(params) => {
            // Check for cycles before adding connection
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

            onConnect(params);
          }}
          onEdgeClick={(event, edge) => {
            // Prevent edge selection during pane drag
            setSelectedNode(null);
            setShowConfigPanel(false); // Close node config panel
            setSelectedEdge(edge);
            setShowEdgeConfigPanel(true);
          }}
          onNodeContextMenu={(event, node) => {
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
            // Prevent default context menu
            event.preventDefault();

            // Select the edge
            setSelectedEdge(edge);
            setShowEdgeConfigPanel(true);

            // Show context menu
            setContextMenu({
              x: event.clientX,
              y: event.clientY,
              type: "edge",
              id: edge.id,
            });
          }}
          onPaneContextMenu={(event) => {
            // Prevent default context menu
            event.preventDefault();

            // Show context menu
            setContextMenu({
              x: event.clientX,
              y: event.clientY,
              type: "canvas",
            });
          }}
          // XYFlow uses onEdgesChange instead of onEdgeUpdate
          onInit={setReactFlowInstance}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          fitView
          deleteKeyCode={["Backspace", "Delete"]}
          multiSelectionKeyCode={["Meta", "Shift"]}
          defaultEdgeOptions={{ type: "custom" }}
          onNodesChange={(changes) => {
            // Use optimized handler for position changes, direct handler for other changes
            const hasPositionChanges = changes.some(
              (change) => change.type === "position" && change.position
            );
            const hasResizeChanges = changes.some(
              (change) =>
                change.type === "dimensions" &&
                (change.dimensions?.width || change.dimensions?.height)
            );

            if (hasPositionChanges) {
              // Use debounced update for smoother drag experience
              debouncedNodeUpdate(changes);

              // Only add to history after debounce completes
              const updatedNodes = applyNodeChanges(changes, nodes);
              addToHistory(updatedNodes, edges);
            } else {
              // Direct update for selection and other changes
              setNodes((nds) => {
                const updatedNodes = applyNodeChanges(changes, nds);

                if (hasResizeChanges) {
                  addToHistory(updatedNodes, edges);
                }

                return updatedNodes;
              });
            }
          }}
          onEdgesChange={(changes) => {
            setEdges((eds) => {
              const updatedEdges = applyEdgeChanges(changes, eds);

              // Only add to history for remove changes
              const hasRemoveChanges = changes.some(
                (change) => change.type === "remove"
              );

              if (hasRemoveChanges) {
                addToHistory(nodes, updatedEdges);
              }

              return updatedEdges;
            });
          }}>
          {isGridVisible && (
            <Background variant='dots' gap={16} size={0.6} color='#f8fafc' />
          )}
          <Controls />
          {nodes.length > 10 && <MiniMap pannable zoomable />}
        </ReactFlow>
      </div>

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

// Main component that wraps the flow content with the provider
export function FlowCanvas({
  executionId,
  initialNodes,
  initialEdges,
  onNodesChange,
  onEdgesChange,
  toolbarRef,
}: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowContent
        executionId={executionId}
        initialNodes={initialNodes}
        initialEdges={initialEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        toolbarRef={toolbarRef}
      />
    </ReactFlowProvider>
  );
}

// Add this to ensure NextJS knows this needs client-side rendering only
FlowCanvas.displayName = "FlowCanvas";

// Export types for use in other files
export type { Node, Edge } from "@xyflow/react";
