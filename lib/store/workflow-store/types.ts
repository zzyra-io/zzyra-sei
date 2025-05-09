"use client";

import type { Node, Edge, ReactFlowInstance } from "@xyflow/react";

// Canvas state
export interface CanvasState {
  nodes: Node[];
  edges: Edge[];
  selectedNode: Node | null;
  selectedEdge: Edge | null;
  showConfigPanel: boolean;
  showEdgeConfigPanel: boolean;
  isGridVisible: boolean;
  isPanning: boolean;
  reactFlowInstance: ReactFlowInstance | null;
}

// Metadata state
export interface MetadataState {
  workflowId: string | undefined;
  workflowName: string;
  workflowDescription: string;
  tags: string[];
  hasUnsavedChanges: boolean;
  executionId: string | null;
}

// History state
export interface HistoryState {
  canUndo: boolean;
  canRedo: boolean;
  history: { nodes: Node[]; edges: Edge[] }[];
  historyIndex: number;
}

// UI state
export interface UIState {
  isSaveDialogOpen: boolean;
  isExitDialogOpen: boolean;
  isDeleteDialogOpen: boolean;
  isExecuting: boolean;
  isRedirecting: boolean;
  isPreviewMode: boolean;
  isGenerating: boolean;
  isRefining: boolean;
  isLoading: boolean;
  catalogTab: string;
}

// AI Generation state
export interface AIGenerationState {
  nlPrompt: string;
  generationStatus: { status: string; progress: number; error: string };
  partialNodes: Partial<Node>[];
  isRefinementOpen: boolean;
  showExamples: boolean;
  recentPrompts: string[];
}

// Combined workflow state
export interface WorkflowState 
  extends CanvasState, 
          MetadataState, 
          HistoryState, 
          UIState, 
          AIGenerationState {}

// Actions interfaces
export interface CanvasActions {
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  addNode: (node: Node) => void;
  updateNode: (nodeId: string, updates: Partial<Node>) => void;
  removeNode: (nodeId: string) => void;
  addEdge: (edge: Edge) => void;
  updateEdge: (edgeId: string, updates: Partial<Edge>) => void;
  removeEdge: (edgeId: string) => void;
  setSelectedNode: (node: Node | null) => void;
  setSelectedEdge: (edge: Edge | null) => void;
  setShowConfigPanel: (show: boolean) => void;
  setShowEdgeConfigPanel: (show: boolean) => void;
  setGridVisible: (visible: boolean) => void;
  setPanning: (isPanning: boolean) => void;
  setReactFlowInstance: (instance: ReactFlowInstance | null) => void;
}

export interface MetadataActions {
  setWorkflowId: (id: string | undefined) => void;
  setWorkflowName: (name: string) => void;
  setWorkflowDescription: (description: string) => void;
  setTags: (tags: string[]) => void;
  setHasUnsavedChanges: (hasChanges: boolean) => void;
  setExecutionId: (id: string | null) => void;
}

export interface HistoryActions {
  undo: () => void;
  redo: () => void;
  addToHistory: (nodes: Node[], edges: Edge[]) => void;
  resetHistory: () => void;
}

export interface UIActions {
  setSaveDialogOpen: (isOpen: boolean) => void;
  setExitDialogOpen: (isOpen: boolean) => void;
  setDeleteDialogOpen: (isOpen: boolean) => void;
  setExecuting: (isExecuting: boolean) => void;
  setRedirecting: (isRedirecting: boolean) => void;
  setPreviewMode: (isPreviewMode: boolean) => void;
  setGenerating: (isGenerating: boolean) => void;
  setRefining: (isRefining: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  setCatalogTab: (tab: string) => void;
}

export interface AIGenerationActions {
  setNlPrompt: (prompt: string) => void;
  setGenerationStatus: (status: { status: string; progress: number; error: string }) => void;
  setPartialNodes: (nodes: Partial<Node>[]) => void;
  setIsRefinementOpen: (isOpen: boolean) => void;
  setShowExamples: (show: boolean) => void;
  setRecentPrompts: (prompts: string[]) => void;
}

export interface ResetActions {
  resetCanvas: () => void;
  resetFlow: () => void;
}

export interface WorkflowActions extends 
  CanvasActions, 
  MetadataActions, 
  HistoryActions, 
  UIActions, 
  AIGenerationActions,
  ResetActions {}

// Complete workflow store interface
export type WorkflowStore = WorkflowState & WorkflowActions;
