"use client";

import { StateCreator } from "zustand";
import { nanoid } from "nanoid";
import type { Node, Edge, ReactFlowInstance } from "@xyflow/react";
import { CanvasState, CanvasActions, WorkflowStore } from "./types";

// Throttle function for performance optimization
const throttle = <T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): T => {
  let lastFunc: ReturnType<typeof setTimeout>;
  let lastRan: number;

  return ((...args: Parameters<T>): ReturnType<T> => {
    if (!lastRan) {
      func(...args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(
        () => {
          if (Date.now() - lastRan >= limit) {
            func(...args);
            lastRan = Date.now();
          }
        },
        limit - (Date.now() - lastRan)
      );
    }
    return undefined as unknown as ReturnType<T>;
  }) as T;
};

// Initial canvas state
const initialCanvasState: CanvasState = {
  nodes: [],
  edges: [],
  selectedNode: null,
  selectedEdge: null,
  showConfigPanel: false,
  showEdgeConfigPanel: false,
  isGridVisible: true,
  isPanning: false,
  reactFlowInstance: null,
};

// Canvas slice implementation
export const createCanvasSlice: StateCreator<
  WorkflowStore,
  [],
  [],
  CanvasState & CanvasActions
> = (set, get) => ({
  ...initialCanvasState,

  // Performance optimized node operations using throttling
  setNodes: throttle((nodes: Node[]) => {
    set(() => ({ nodes }));
  }, 16), // Throttle at ~60fps

  setEdges: throttle((edges: Edge[]) => {
    set(() => ({ edges }));
  }, 16),

  addNode: (node: Node) => {
    const { nodes, addToHistory, edges } = get();
    const newNodes = [...nodes, node];
    console.log("newNodes", newNodes);
    set(() => ({ nodes: newNodes }));
    // Throttle history updates to prevent excessive calls
    setTimeout(() => addToHistory(newNodes, edges), 0);
  },

  updateNode: (nodeId: string, updates: Partial<Node>) => {
    const { nodes, addToHistory, edges } = get();
    const newNodes = nodes.map((node) => {
      if (node.id === nodeId) {
        // Deep clone to avoid React Flow immutability issues
        const updatedNode = {
          ...node,
          ...updates,
          // Ensure measured properties are properly cloned if they exist
          ...(node.measured && {
            measured: { ...node.measured },
          }),
          // Ensure style properties are properly cloned if they exist
          ...(node.style && {
            style: { ...node.style, ...(updates.style || {}) },
          }),
          // Ensure data properties are properly cloned
          data: {
            ...node.data,
            ...(updates.data || {}),
          },
        };
        return updatedNode;
      }
      return node;
    });
    set(() => ({ nodes: newNodes }));
    // Throttle history updates to prevent excessive calls
    setTimeout(() => addToHistory(newNodes, edges), 0);
  },

  removeNode: (nodeId: string) => {
    const { nodes, edges, addToHistory, setSelectedNode } = get();
    const newNodes = nodes.filter((node) => node.id !== nodeId);
    // Also remove any connected edges
    const newEdges = edges.filter(
      (edge) => edge.source !== nodeId && edge.target !== nodeId
    );
    set(() => ({
      nodes: newNodes,
      edges: newEdges,
      selectedNode: null,
    }));
    setSelectedNode(null);
    addToHistory(newNodes, newEdges);
  },

  addEdge: (edge: Edge) => {
    const { edges, addToHistory, nodes } = get();
    const newEdge = {
      ...edge,
      id: edge.id || `edge-${nanoid(6)}`,
      type: edge.type || "custom",
    };
    const newEdges = [...edges, newEdge];
    set(() => ({ edges: newEdges }));
    addToHistory(nodes, newEdges);
  },

  updateEdge: (edgeId: string, updates: Partial<Edge>) => {
    const { edges, addToHistory, nodes } = get();
    const newEdges = edges.map((edge) =>
      edge.id === edgeId ? { ...edge, ...updates } : edge
    );
    set(() => ({ edges: newEdges }));
    addToHistory(nodes, newEdges);
  },

  removeEdge: (edgeId: string) => {
    const { edges, addToHistory, nodes, setSelectedEdge } = get();
    const newEdges = edges.filter((edge) => edge.id !== edgeId);
    set(() => ({
      edges: newEdges,
      selectedEdge: null,
    }));
    setSelectedEdge(null);
    addToHistory(nodes, newEdges);
  },

  setSelectedNode: (node: Node | null) => {
    set(() => ({ selectedNode: node }));
  },

  setSelectedEdge: (edge: Edge | null) => {
    set(() => ({ selectedEdge: edge }));
  },

  setShowConfigPanel: (show: boolean) => {
    set(() => ({ showConfigPanel: show }));
  },

  setShowEdgeConfigPanel: (show: boolean) => {
    set(() => ({ showEdgeConfigPanel: show }));
  },

  setGridVisible: (visible: boolean) => {
    set(() => ({ isGridVisible: visible }));
  },

  setPanning: (isPanning: boolean) => {
    set(() => ({ isPanning }));
  },

  setReactFlowInstance: (instance: React.MutableRefObject<any> | null) => {
    set(() => ({ reactFlowInstance: instance }));
  },
});
