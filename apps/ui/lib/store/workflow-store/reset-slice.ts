"use client";

import { StateCreator } from "zustand";
import { ResetActions, WorkflowStore } from "./types";
import { nanoid } from "nanoid";
import { DraftManager } from "@/lib/utils/draft-manager";

// Reset slice for clean canvas and full app reset
export const createResetSlice: StateCreator<
  WorkflowStore,
  [],
  [],
  ResetActions
> = (set, get) => ({
  resetCanvas: () => {
    const {
      setNodes,
      setEdges,
      resetHistory,
      setSelectedNode,
      setSelectedEdge,
    } = get();

    // Reset canvas elements
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    setSelectedEdge(null);

    // Reset history
    resetHistory();

    // Mark as having unsaved changes
    set((state) => ({
      hasUnsavedChanges: state.workflowId !== undefined,
    }));
  },

  resetFlow: () => {
    const { resetCanvas } = get();

    // First reset the canvas
    resetCanvas();

    // Then reset all other state
    set(() => ({
      workflowId: undefined,
      workflowName: "Untitled Workflow",
      workflowDescription: "",
      tags: [],
      hasUnsavedChanges: false,
      executionId: null,

      // Reset UI state
      isSaveDialogOpen: false,
      isExitDialogOpen: false,
      isDeleteDialogOpen: false,
      isExecuting: false,
      isRedirecting: false,
      isPreviewMode: false,
      isGenerating: false,
      isRefining: false,

      // Reset AI generation state
      nlPrompt: "",
      generationStatus: { status: "idle", progress: 0, error: "" },
      partialNodes: [],
      isRefinementOpen: false,
    }));

    // Also clear any workflow draft from localStorage
    if (typeof window !== "undefined") {
      try {
        DraftManager.clearTempDrafts();
      } catch (e) {
        console.error("Failed to clear workflow drafts from localStorage:", e);
      }
    }
  },
});
