import { create } from 'zustand';
import { nanoid } from 'nanoid';

export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label?: string;
    [key: string]: any;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  animated?: boolean;
  style?: Record<string, any>;
}

export interface WorkflowStoreState {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  workflowName: string;
  workflowDescription: string;
  isDirty: boolean;
  isExecuting: boolean;
  
  // Actions
  addNode: (node: Omit<WorkflowNode, 'id'> & { id?: string }) => void;
  updateNode: (node: Partial<WorkflowNode> & { id: string }) => void;
  removeNode: (nodeId: string) => void;
  addEdge: (edge: Omit<WorkflowEdge, 'id'> & { id?: string }) => void;
  updateEdge: (edge: Partial<WorkflowEdge> & { id: string }) => void;
  removeEdge: (edgeId: string) => void;
  setSelectedNode: (nodeId: string | null) => void;
  setSelectedEdge: (edgeId: string | null) => void;
  updateWorkflowDetails: (details: { name?: string; description?: string }) => void;
  clearWorkflow: () => void;
  setDirty: (isDirty: boolean) => void;
  setExecuting: (isExecuting: boolean) => void;
}

export const useWorkflowStore = create<WorkflowStoreState>((set) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  selectedEdgeId: null,
  workflowName: 'Untitled Workflow',
  workflowDescription: '',
  isDirty: false,
  isExecuting: false,
  
  // Node actions
  addNode: (node) => {
    const nodeId = node.id || nanoid();
    set((state) => ({
      nodes: [
        ...state.nodes,
        { ...node, id: nodeId },
      ],
      isDirty: true,
    }));
    return nodeId;
  },
  
  updateNode: (updatedNode) => {
    set((state) => ({
      nodes: state.nodes.map(node => 
        node.id === updatedNode.id ? { ...node, ...updatedNode } : node
      ),
      isDirty: true,
    }));
  },
  
  removeNode: (nodeId) => {
    set((state) => ({
      nodes: state.nodes.filter(node => node.id !== nodeId),
      edges: state.edges.filter(edge => 
        edge.source !== nodeId && edge.target !== nodeId
      ),
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
      isDirty: true,
    }));
  },
  
  // Edge actions
  addEdge: (edge) => {
    const edgeId = edge.id || `e${nanoid()}`;
    set((state) => ({
      edges: [
        ...state.edges,
        { ...edge, id: edgeId },
      ],
      isDirty: true,
    }));
    return edgeId;
  },
  
  updateEdge: (updatedEdge) => {
    set((state) => ({
      edges: state.edges.map(edge => 
        edge.id === updatedEdge.id ? { ...edge, ...updatedEdge } : edge
      ),
      isDirty: true,
    }));
  },
  
  removeEdge: (edgeId) => {
    set((state) => ({
      edges: state.edges.filter(edge => edge.id !== edgeId),
      selectedEdgeId: state.selectedEdgeId === edgeId ? null : state.selectedEdgeId,
      isDirty: true,
    }));
  },
  
  // Selection actions
  setSelectedNode: (nodeId) => {
    set({
      selectedNodeId: nodeId,
      selectedEdgeId: null, // Clear edge selection when selecting a node
    });
  },
  
  setSelectedEdge: (edgeId) => {
    set({
      selectedEdgeId: edgeId,
      selectedNodeId: null, // Clear node selection when selecting an edge
    });
  },
  
  // Workflow actions
  updateWorkflowDetails: (details) => {
    set((state) => ({
      workflowName: details.name ?? state.workflowName,
      workflowDescription: details.description ?? state.workflowDescription,
      isDirty: true,
    }));
  },
  
  clearWorkflow: () => {
    set({
      nodes: [],
      edges: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      workflowName: 'Untitled Workflow',
      workflowDescription: '',
      isDirty: false,
    });
  },
  
  setDirty: (isDirty) => {
    set({ isDirty });
  },
  
  setExecuting: (isExecuting) => {
    set({ isExecuting });
  },
}));
