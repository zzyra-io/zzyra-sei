"use client";

import { StateCreator } from "zustand";
import { MetadataState, MetadataActions, WorkflowStore } from "./types";

// Initial metadata state
const initialMetadataState: MetadataState = {
  workflowId: undefined,
  workflowName: "Untitled Workflow",
  workflowDescription: "",
  tags: [],
  hasUnsavedChanges: false,
  executionId: null,
};

// Metadata slice implementation
export const createMetadataSlice: StateCreator<
  WorkflowStore,
  [],
  [],
  MetadataState & MetadataActions
> = (set) => ({
  ...initialMetadataState,

  setWorkflowId: (id: string | undefined) => {
    set(() => ({ workflowId: id }));
  },

  setWorkflowName: (name: string) => {
    set(() => ({ 
      workflowName: name,
      hasUnsavedChanges: true 
    }));
  },

  setWorkflowDescription: (description: string) => {
    set(() => ({ 
      workflowDescription: description,
      hasUnsavedChanges: true 
    }));
  },

  setTags: (tags: string[]) => {
    set(() => ({ 
      tags,
      hasUnsavedChanges: true
    }));
  },

  setHasUnsavedChanges: (hasChanges: boolean) => {
    set(() => ({ hasUnsavedChanges: hasChanges }));
  },

  setExecutionId: (id: string | null) => {
    set(() => ({ executionId: id }));
  },
});
