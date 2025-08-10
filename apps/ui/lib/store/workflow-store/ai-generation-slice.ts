"use client";

import { StateCreator } from "zustand";
import { Node } from "@xyflow/react";
import { AIGenerationState, AIGenerationActions, WorkflowStore } from "./types";

// Initial AI generation state
const initialAIGenerationState: AIGenerationState = {
  nlPrompt: "",
  generationStatus: { status: "idle", progress: 0, error: "" },
  partialNodes: [],
  isRefinementOpen: false,
  showExamples: false,
  recentPrompts: [],
};

// AI Generation slice with debounced operations
export const createAIGenerationSlice: StateCreator<
  WorkflowStore,
  [],
  [],
  AIGenerationState & AIGenerationActions
> = (set, get) => {
  // Implementation of debounce for prompt-related operations
  const debounce = <T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): T => {
    let timeout: ReturnType<typeof setTimeout>;
    return ((...args: Parameters<T>): ReturnType<T> => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), wait);
      return undefined as unknown as ReturnType<T>;
    }) as T;
  };

  // Debounced prompt setter to avoid excessive UI updates
  const debouncedSetPrompt = debounce((prompt: string) => {
    set(() => ({ nlPrompt: prompt }));
  }, 300);

  return {
    ...initialAIGenerationState,

    setNlPrompt: (prompt: string) => {
      debouncedSetPrompt(prompt);
    },

    setGenerationStatus: (status: { status: string; progress: number; error: string }) => {
      set(() => ({ generationStatus: status }));
    },

    setPartialNodes: (nodes: Partial<Node>[]) => {
      set(() => ({ partialNodes: nodes }));
    },

    setIsRefinementOpen: (isOpen: boolean) => {
      set(() => ({ isRefinementOpen: isOpen }));
    },

    setShowExamples: (show: boolean) => {
      set(() => ({ showExamples: show }));
    },

    setRecentPrompts: (prompts: string[]) => {
      set(() => ({ recentPrompts: prompts }));

      // Store recent prompts in localStorage for persistence
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('zzyra-recent-prompts', JSON.stringify(prompts));
        } catch (e) {
          console.error('Failed to store recent prompts in localStorage:', e);
        }
      }
    },
  };
};
