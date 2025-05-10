"use client";

import { useEffect } from "react";
import { useFlowStore } from "@/lib/store/flow-store";
import { useWorkflowStore } from "@/lib/store/workflow-store";

/**
 * This utility hook synchronizes the old flow-store with the new workflow-store
 * to ensure a smooth transition without breaking changes
 */
export function useSyncStores() {
  const flowStore = useFlowStore();
  const workflowStore = useWorkflowStore();
  
  // Sync flow-store to workflow-store on mount and when flow-store changes
  useEffect(() => {
    const unsubscribe = useFlowStore.subscribe(
      // Select specific state to watch for changes
      (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        workflowId: state.workflowId,
        workflowName: state.workflowName,
        workflowDescription: state.workflowDescription,
        tags: state.tags,
        hasUnsavedChanges: state.hasUnsavedChanges,
      }),
      // Callback when selected state changes
      (flowState) => {
        // Update workflow-store with flow-store values
        workflowStore.setNodes(flowState.nodes);
        workflowStore.setEdges(flowState.edges);
        workflowStore.setWorkflowId(flowState.workflowId);
        workflowStore.setWorkflowName(flowState.workflowName);
        workflowStore.setWorkflowDescription(flowState.workflowDescription);
        workflowStore.setTags(flowState.tags);
        workflowStore.setHasUnsavedChanges(flowState.hasUnsavedChanges);
      },
      // Options
      { equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) }
    );
    
    return unsubscribe;
  }, [workflowStore]);
  
  // Sync workflow-store back to flow-store (two-way sync)
  useEffect(() => {
    const unsubscribe = useWorkflowStore.subscribe(
      // Select specific state to watch for changes
      (state) => ({
        nodes: state.nodes,
        edges: state.edges,
        workflowId: state.workflowId,
        workflowName: state.workflowName,
        workflowDescription: state.workflowDescription,
        tags: state.tags,
        hasUnsavedChanges: state.hasUnsavedChanges,
      }),
      // Callback when selected state changes
      (workflowState) => {
        // Only update if values actually differ to avoid loops
        if (JSON.stringify(workflowState.nodes) !== JSON.stringify(flowStore.nodes)) {
          flowStore.setNodes(workflowState.nodes);
        }
        if (JSON.stringify(workflowState.edges) !== JSON.stringify(flowStore.edges)) {
          flowStore.setEdges(workflowState.edges);
        }
        if (workflowState.workflowId !== flowStore.workflowId) {
          flowStore.setWorkflowId(workflowState.workflowId);
        }
        if (workflowState.workflowName !== flowStore.workflowName) {
          flowStore.setWorkflowName(workflowState.workflowName);
        }
        if (workflowState.workflowDescription !== flowStore.workflowDescription) {
          flowStore.setWorkflowDescription(workflowState.workflowDescription);
        }
        if (JSON.stringify(workflowState.tags) !== JSON.stringify(flowStore.tags)) {
          flowStore.setTags(workflowState.tags);
        }
        if (workflowState.hasUnsavedChanges !== flowStore.hasUnsavedChanges) {
          flowStore.setHasUnsavedChanges(workflowState.hasUnsavedChanges);
        }
      },
      // Options
      { equalityFn: (a, b) => JSON.stringify(a) === JSON.stringify(b) }
    );
    
    return unsubscribe;
  }, [flowStore]);
}

/**
 * Create a HOC to provide store migration/synchronization to components
 */
export function withStoreMigration<T extends object>(
  Component: React.ComponentType<T>
): React.FC<T> {
  const WithStoreMigration: React.FC<T> = (props) => {
    useSyncStores();
    
    return <Component {...props} />;
  };
  
  WithStoreMigration.displayName = `WithStoreMigration(${
    Component.displayName || Component.name || "Component"
  })`;
  
  return WithStoreMigration;
}
