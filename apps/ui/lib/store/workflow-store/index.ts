"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import { persist, createJSONStorage } from "zustand/middleware";
import { subscribeWithSelector } from "zustand/middleware";
import { nanoid } from "nanoid";

import { WorkflowStore } from "./types";
import { createCanvasSlice } from "./canvas-slice";
import { createHistorySlice } from "./history-slice";
import { createMetadataSlice } from "./metadata-slice";
import { createUISlice } from "./ui-slice";
import { createAIGenerationSlice } from "./ai-generation-slice";
import { createResetSlice } from "./reset-slice";

// Error handling utility for store operations
class StoreError extends Error {
  constructor(
    message: string,
    public operation: string,
    public data?: unknown
  ) {
    super(message);
    this.name = "StoreError";

    // Log errors to monitoring service in production
    if (process.env.NODE_ENV === "production") {
      console.error(`[StoreError] ${operation}: ${message}`, data);
      // TODO: Send to monitoring service
    }
  }
}

// Create the optimized workflow store with all slices
export const useWorkflowStore = create<WorkflowStore>()(
  subscribeWithSelector(
    persist(
      immer(
        devtools(
          (...a) => ({
            ...createCanvasSlice(...a),
            ...createHistorySlice(...a),
            ...createMetadataSlice(...a),
            ...createUISlice(...a),
            ...createAIGenerationSlice(...a),
            ...createResetSlice(...a),
          }),
          { name: "zzyra-workflow-store" }
        )
      ),
      {
        name: "zzyra-workflow-storage",
        storage:
          typeof window !== "undefined"
            ? createJSONStorage(() => localStorage)
            : undefined,
        partialize: (state) => ({
          // Only persist essential data
          workflowId: state.workflowId,
          workflowName: state.workflowName,
          workflowDescription: state.workflowDescription,
          tags: state.tags,
          isGridVisible: state.isGridVisible,
          catalogTab: state.catalogTab,
          recentPrompts: state.recentPrompts,

          // Conditionally persist nodes/edges if there are unsaved changes
          ...(state.hasUnsavedChanges && {
            nodes: state.nodes,
            edges: state.edges,
          }),
        }),
        // Handle errors during storage operations
      }
    )
  )
);

// // Hooks for specific slices to optimize re-renders
// export const useCanvasState = () => {
//   // Using a stable selector to fix SSR issues and prevent infinite loops
//   return useWorkflowStore((state) => ({
//     nodes: state.nodes,
//     edges: state.edges,
//     selectedNode: state.selectedNode,
//     selectedEdge: state.selectedEdge,
//     showConfigPanel: state.showConfigPanel,
//     showEdgeConfigPanel: state.showEdgeConfigPanel,
//     isGridVisible: state.isGridVisible,
//     isPanning: state.isPanning,
//     reactFlowInstance: state.reactFlowInstance,
//     // Actions
//     setNodes: state.setNodes,
//     setEdges: state.setEdges,
//     addNode: state.addNode,
//     updateNode: state.updateNode,
//     removeNode: state.removeNode,
//     addEdge: state.addEdge,
//     updateEdge: state.updateEdge,
//     removeEdge: state.removeEdge,
//     setSelectedNode: state.setSelectedNode,
//     setSelectedEdge: state.setSelectedEdge,
//     setShowConfigPanel: state.setShowConfigPanel,
//     setShowEdgeConfigPanel: state.setShowEdgeConfigPanel,
//     setGridVisible: state.setGridVisible,
//     setPanning: state.setPanning,
//     setReactFlowInstance: state.setReactFlowInstance,
//   }));
// };

// export const useMetadataState = () => {
//   // Using a stable selector to fix SSR issues
//   return useWorkflowStore((state) => ({
//     workflowId: state.workflowId,
//     workflowName: state.workflowName,
//     workflowDescription: state.workflowDescription,
//     tags: state.tags,
//     hasUnsavedChanges: state.hasUnsavedChanges,
//     executionId: state.executionId,
//     // Actions
//     setWorkflowId: state.setWorkflowId,
//     setWorkflowName: state.setWorkflowName,
//     setWorkflowDescription: state.setWorkflowDescription,
//     setTags: state.setTags,
//     setHasUnsavedChanges: state.setHasUnsavedChanges,
//     setExecutionId: state.setExecutionId,
//   }));
// };

// export const useHistoryState = () => {
//   // Using stable selector to prevent infinite loops in SSR
//   return useWorkflowStore((state) => ({
//     canUndo: state.canUndo,
//     canRedo: state.canRedo,
//     undo: state.undo,
//     redo: state.redo,
//     addToHistory: state.addToHistory,
//     resetHistory: state.resetHistory,
//   }));
// };

// export const useUIState = () => {
//   // Using stable selector to prevent infinite loops in SSR
//   return useWorkflowStore((state) => ({
//     isSaveDialogOpen: state.isSaveDialogOpen,
//     isExitDialogOpen: state.isExitDialogOpen,
//     isDeleteDialogOpen: state.isDeleteDialogOpen,
//     isExecuting: state.isExecuting,
//     isRedirecting: state.isRedirecting,
//     isPreviewMode: state.isPreviewMode,
//     isGenerating: state.isGenerating,
//     isRefining: state.isRefining,
//     isLoading: state.isLoading,
//     catalogTab: state.catalogTab,
//     // Actions
//     setSaveDialogOpen: state.setSaveDialogOpen,
//     setExitDialogOpen: state.setExitDialogOpen,
//     setDeleteDialogOpen: state.setDeleteDialogOpen,
//     setExecuting: state.setExecuting,
//     setRedirecting: state.setRedirecting,
//     setPreviewMode: state.setPreviewMode,
//     setGenerating: state.setGenerating,
//     setRefining: state.setRefining,
//     setLoading: state.setLoading,
//     setCatalogTab: state.setCatalogTab,
//   }));
// };

// export const useAIGenerationState = () => {
//   // Using stable selector to prevent infinite loops in SSR
//   return useWorkflowStore((state) => ({
//     nlPrompt: state.nlPrompt,
//     generationStatus: state.generationStatus,
//     partialNodes: state.partialNodes,
//     isRefinementOpen: state.isRefinementOpen,
//     showExamples: state.showExamples,
//     recentPrompts: state.recentPrompts,
//     // Actions
//     setNlPrompt: state.setNlPrompt,
//     setGenerationStatus: state.setGenerationStatus,
//     setPartialNodes: state.setPartialNodes,
//     setIsRefinementOpen: state.setIsRefinementOpen,
//     setShowExamples: state.setShowExamples,
//     setRecentPrompts: state.setRecentPrompts,
//   }));
// };

// export const useResetActions = () => {
//   // Using stable selector to prevent infinite loops in SSR
//   return useWorkflowStore((state) => ({
//     resetCanvas: state.resetCanvas,
//     resetFlow: state.resetFlow,
//   }));
// };

// // Backward compatibility layer for smooth migration
// export const useFlowStore = useWorkflowStore;

// FlowToolbar hook for component optimization
export function useFlowToolbar() {
  const {
    undo,
    redo,
    canUndo,
    canRedo,
    resetCanvas,
    isGridVisible,
    setGridVisible,
    reactFlowInstance,
    nodes,
    edges,
    setNodes,
    addToHistory,
    selectedNode,
    selectedEdge,
    removeNode,
    removeEdge,
    addNode,
  } = useWorkflowStore();

  return {
    canUndo,
    canRedo,
    isGridVisible,
    undo,
    redo,
    zoomIn: () => reactFlowInstance?.zoomIn(),
    zoomOut: () => reactFlowInstance?.zoomOut(),
    fitView: () => reactFlowInstance?.fitView(),
    toggleGrid: () => setGridVisible(!isGridVisible),
    delete: () => {
      if (selectedNode) removeNode(selectedNode.id);
      if (selectedEdge) removeEdge(selectedEdge.id);
    },
    copy: () => {
      if (selectedNode) {
        try {
          const newNode = {
            ...JSON.parse(JSON.stringify(selectedNode)),
            id: `${selectedNode.type}-${nanoid(6)}`,
            position: {
              x: selectedNode.position.x + 20,
              y: selectedNode.position.y + 20,
            },
            selected: false,
          };
          addNode(newNode);
          addToHistory([...nodes, newNode], edges);
        } catch (error) {
          console.error("Failed to duplicate node:", error);
          throw new StoreError(
            "Failed to duplicate node",
            "duplicateSelected",
            {
              nodeId: selectedNode.id,
            }
          );
        }
      }
    },
    alignHorizontal: (alignment: "left" | "center" | "right") => {
      try {
        const selectedNodes = nodes.filter((n) => n.selected);
        if (selectedNodes.length <= 1) return;

        let alignTo: number;
        switch (alignment) {
          case "left":
            alignTo = Math.min(...selectedNodes.map((n) => n.position.x));
            break;
          case "right":
            alignTo = Math.max(
              ...selectedNodes.map((n) => n.position.x + (n.width || 0))
            );
            break;
          case "center":
            const xPosWithHalfWidths = selectedNodes.map(
              (n) => n.position.x + (n.width || 0) / 2
            );
            alignTo =
              xPosWithHalfWidths.reduce((sum, x) => sum + x, 0) /
              selectedNodes.length;
            break;
        }

        const updatedNodes = nodes.map((n) => {
          if (!n.selected) return n;
          let newX;
          switch (alignment) {
            case "left":
              newX = alignTo;
              break;
            case "right":
              newX = alignTo - (n.width || 0);
              break;
            case "center":
              newX = alignTo - (n.width || 0) / 2;
              break;
          }
          return { ...n, position: { ...n.position, x: newX } };
        });

        setNodes(updatedNodes);
        addToHistory(updatedNodes, edges);
      } catch (error) {
        console.error("Failed to align nodes horizontally:", error);
        throw new StoreError(
          "Failed to align nodes horizontally",
          "alignHorizontal",
          { alignment }
        );
      }
    },
    alignVertical: (alignment: "top" | "center" | "bottom") => {
      try {
        const selectedNodes = nodes.filter((n) => n.selected);
        if (selectedNodes.length <= 1) return;

        let alignTo: number;
        switch (alignment) {
          case "top":
            alignTo = Math.min(...selectedNodes.map((n) => n.position.y));
            break;
          case "bottom":
            alignTo = Math.max(
              ...selectedNodes.map((n) => n.position.y + (n.height || 0))
            );
            break;
          case "center":
            const yPosWithHalfHeights = selectedNodes.map(
              (n) => n.position.y + (n.height || 0) / 2
            );
            alignTo =
              yPosWithHalfHeights.reduce((sum, y) => sum + y, 0) /
              selectedNodes.length;
            break;
        }

        const updatedNodes = nodes.map((n) => {
          if (!n.selected) return n;
          let newY;
          switch (alignment) {
            case "top":
              newY = alignTo;
              break;
            case "bottom":
              newY = alignTo - (n.height || 0);
              break;
            case "center":
              newY = alignTo - (n.height || 0) / 2;
              break;
          }
          return { ...n, position: { ...n.position, y: newY } };
        });

        setNodes(updatedNodes);
        addToHistory(updatedNodes, edges);
      } catch (error) {
        console.error("Failed to align nodes vertically:", error);
        throw new StoreError(
          "Failed to align nodes vertically",
          "alignVertical",
          { alignment }
        );
      }
    },
    reset: resetCanvas,
  };
}
