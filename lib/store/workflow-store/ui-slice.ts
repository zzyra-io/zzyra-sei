"use client";

import { StateCreator } from "zustand";
import { UIState, UIActions, WorkflowStore } from "./types";

// Initial UI state
const initialUIState: UIState = {
  isSaveDialogOpen: false,
  isExitDialogOpen: false,
  isDeleteDialogOpen: false,
  isExecuting: false,
  isRedirecting: false,
  isPreviewMode: false,
  isGenerating: false,
  isRefining: false,
  isLoading: false,
  catalogTab: "blocks",
};

// UI slice with improved action response
export const createUISlice: StateCreator<
  WorkflowStore,
  [],
  [],
  UIState & UIActions
> = (set) => ({
  ...initialUIState,

  setSaveDialogOpen: (isOpen: boolean) => {
    set(() => ({ isSaveDialogOpen: isOpen }));
  },

  setExitDialogOpen: (isOpen: boolean) => {
    set(() => ({ isExitDialogOpen: isOpen }));
  },

  setDeleteDialogOpen: (isOpen: boolean) => {
    set(() => ({ isDeleteDialogOpen: isOpen }));
  },

  setExecuting: (isExecuting: boolean) => {
    set(() => ({ isExecuting }));
  },

  setRedirecting: (isRedirecting: boolean) => {
    set(() => ({ isRedirecting }));
  },

  setPreviewMode: (isPreviewMode: boolean) => {
    set(() => ({ isPreviewMode }));
  },

  setGenerating: (isGenerating: boolean) => {
    set(() => ({ isGenerating }));
  },

  setRefining: (isRefining: boolean) => {
    set(() => ({ isRefining }));
  },

  setLoading: (isLoading: boolean) => {
    set(() => ({ isLoading }));
  },

  setCatalogTab: (tab: string) => {
    set(() => ({ catalogTab: tab }));
  },
});
