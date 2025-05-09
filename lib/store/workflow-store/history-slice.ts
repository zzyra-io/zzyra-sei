"use client";

import { StateCreator } from "zustand";
import type { Node, Edge } from "@xyflow/react";
import { HistoryState, HistoryActions, WorkflowStore } from "./types";

// Maximum history entries to prevent memory issues
const MAX_HISTORY_SIZE = 50;

// Initial history state
const initialHistoryState: HistoryState = {
  canUndo: false,
  canRedo: false,
  history: [],
  historyIndex: -1,
};

// Optimized history slice with memory considerations
export const createHistorySlice: StateCreator<
  WorkflowStore,
  [],
  [],
  HistoryState & HistoryActions
> = (set, get) => ({
  ...initialHistoryState,

  // Enhanced history management with memory optimization
  addToHistory: (nodes: Node[], edges: Edge[]) => {
    const { history, historyIndex } = get();
    
    // Create a deep copy to avoid reference issues
    const historyCopy = JSON.parse(JSON.stringify({ nodes, edges }));
    
    // If we're not at the end of history, truncate it
    const newHistory = history.slice(0, historyIndex + 1);
    
    // Add new state to history
    newHistory.push(historyCopy);
    
    // Limit history size to prevent memory issues
    if (newHistory.length > MAX_HISTORY_SIZE) {
      newHistory.shift();
    }
    
    const newIndex = newHistory.length - 1;
    
    set(() => ({
      history: newHistory,
      historyIndex: newIndex,
      canUndo: newIndex > 0,
      canRedo: false,
    }));
  },

  undo: () => {
    const { history, historyIndex, setNodes, setEdges } = get();
    
    if (historyIndex <= 0) return;
    
    const newIndex = historyIndex - 1;
    const previousState = history[newIndex];
    
    setNodes(previousState.nodes);
    setEdges(previousState.edges);
    
    set(() => ({
      historyIndex: newIndex,
      canUndo: newIndex > 0,
      canRedo: true,
    }));
  },

  redo: () => {
    const { history, historyIndex, setNodes, setEdges } = get();
    
    if (historyIndex >= history.length - 1) return;
    
    const newIndex = historyIndex + 1;
    const nextState = history[newIndex];
    
    setNodes(nextState.nodes);
    setEdges(nextState.edges);
    
    set(() => ({
      historyIndex: newIndex,
      canUndo: true,
      canRedo: newIndex < history.length - 1,
    }));
  },

  resetHistory: () => {
    set(() => ({
      ...initialHistoryState,
    }));
  },
});
