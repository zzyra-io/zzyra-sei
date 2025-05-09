"use client";

import { useEffect } from "react";
import { useFlowStore } from "./flow-store";
import { useWorkflowStore } from "./workflow-store";

/**
 * Hook to sync between the original flow-store and new workflow-store
 * This ensures a smooth transition without breaking existing functionality
 */
export function useSyncStores() {
  // Get state and actions from both stores
  const flowState = useFlowStore();
  const workflowStore = useWorkflowStore();
  
  // Sync flow-store to workflow-store when flow-store changes
  useEffect(() => {
    const unsubscribe = useFlowStore.subscribe(
      // Select the most important data to watch
      (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        selectedNode: state.selectedNode,
        selectedEdge: state.selectedEdge,
        workflowId: state.workflowId,
        workflowName: state.workflowName,
        workflowDescription: state.workflowDescription,
        tags: state.tags,
        hasUnsavedChanges: state.hasUnsavedChanges,
      }),
      // Update workflow-store when flow-store changes
      (currentState) => {
        workflowStore.setNodes(currentState.nodes);
        workflowStore.setEdges(currentState.edges);
        if (currentState.selectedNode !== workflowStore.getState().selectedNode) {
          workflowStore.setSelectedNode(currentState.selectedNode);
        }
        if (currentState.selectedEdge !== workflowStore.getState().selectedEdge) {
          workflowStore.setSelectedEdge(currentState.selectedEdge);
        }
        workflowStore.setWorkflowId(currentState.workflowId);
        workflowStore.setWorkflowName(currentState.workflowName);
        workflowStore.setWorkflowDescription(currentState.workflowDescription);
        workflowStore.setTags(currentState.tags);
        workflowStore.setHasUnsavedChanges(currentState.hasUnsavedChanges);
      }
    );
    
    return unsubscribe;
  }, [flowState, workflowStore]);
  
  // Sync workflow-store back to flow-store
  useEffect(() => {
    const unsubscribe = useWorkflowStore.subscribe(
      // Select state to watch
      (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        selectedNode: state.selectedNode,
        selectedEdge: state.selectedEdge,
        workflowId: state.workflowId,
        workflowName: state.workflowName,
        workflowDescription: state.workflowDescription,
        tags: state.tags,
        hasUnsavedChanges: state.hasUnsavedChanges,
      }),
      // Update flow-store when workflow-store changes
      (currentState) => {
        // Only update if values are different, to prevent loops
        if (JSON.stringify(currentState.nodes) !== JSON.stringify(flowState.nodes)) {
          flowState.setNodes(currentState.nodes);
        }
        if (JSON.stringify(currentState.edges) !== JSON.stringify(flowState.edges)) {
          flowState.setEdges(currentState.edges);
        }
        if (currentState.selectedNode !== flowState.selectedNode) {
          flowState.setSelectedNode(currentState.selectedNode);
        }
        if (currentState.selectedEdge !== flowState.selectedEdge) {
          flowState.setSelectedEdge(currentState.selectedEdge);
        }
        if (currentState.workflowId !== flowState.workflowId) {
          flowState.setWorkflowId(currentState.workflowId);
        }
        if (currentState.workflowName !== flowState.workflowName) {
          flowState.setWorkflowName(currentState.workflowName);
        }
        if (currentState.workflowDescription !== flowState.workflowDescription) {
          flowState.setWorkflowDescription(currentState.workflowDescription);
        }
        if (JSON.stringify(currentState.tags) !== JSON.stringify(flowState.tags)) {
          flowState.setTags(currentState.tags);
        }
        if (currentState.hasUnsavedChanges !== flowState.hasUnsavedChanges) {
          flowState.setHasUnsavedChanges(currentState.hasUnsavedChanges);
        }
      }
    );
    
    return unsubscribe;
  }, [flowState, workflowStore]);
}

/**
 * HOC to wrap components with store synchronization
 */
export function withStoreBridge<T extends object>(
  Component: React.ComponentType<T>
): React.FC<T> {
  const WithStoreBridge: React.FC<T> = (props) => {
    useSyncStores();
    return <Component {...props} />;
  };
  
  WithStoreBridge.displayName = `WithStoreBridge(${
    Component.displayName || Component.name || "Component"
  })`;
  
  return WithStoreBridge;
}
