/**
 * Draft management utilities for workflow builder
 *
 * This module provides a centralized way to manage workflow drafts in localStorage.
 * It prevents conflicts between multiple workflows by using workflow IDs as keys.
 *
 * Key Features:
 * - ID-based draft storage to prevent conflicts
 * - Support for both saved workflows and temporary drafts
 * - Automatic cleanup of temporary drafts
 * - Debugging support with console logs
 *
 * Usage:
 * - For new workflows: Drafts are saved with temp keys and loaded by most recent
 * - For existing workflows: Drafts are saved with workflow ID as key
 * - When workflows are saved, their drafts are automatically cleared
 */

interface DraftData {
  nodes: unknown[];
  edges: unknown[];
  workflowName: string;
  workflowDescription: string;
  workflowId: string | null;
  lastModified: number;
}

interface DraftsStorage {
  [key: string]: DraftData;
}

export const DraftManager = {
  /**
   * Save a draft for a workflow
   * @param workflowId - The workflow ID (undefined for new workflows)
   * @param draftData - The draft data to save
   */
  saveDraft: (
    workflowId: string | undefined,
    draftData: Partial<DraftData>
  ) => {
    const draftKey = workflowId || `temp_${Date.now()}`;
    const existingDrafts = localStorage.getItem("workflow_drafts");
    const drafts: DraftsStorage = existingDrafts
      ? JSON.parse(existingDrafts)
      : {};

    drafts[draftKey] = {
      ...draftData,
      workflowId: workflowId || null,
      lastModified: Date.now(),
    } as DraftData;

    localStorage.setItem("workflow_drafts", JSON.stringify(drafts));
    console.log(`Draft saved for key: ${draftKey}`, drafts);
  },

  /**
   * Load a draft for a workflow
   * @param workflowId - The workflow ID (undefined for new workflows)
   * @returns The draft data or null if not found
   */
  loadDraft: (workflowId: string | undefined): DraftData | null => {
    const existingDrafts = localStorage.getItem("workflow_drafts");
    if (!existingDrafts) return null;

    const drafts: DraftsStorage = JSON.parse(existingDrafts);
    console.log(`Loading draft for workflowId: ${workflowId}`, drafts);

    if (workflowId) {
      // Load specific workflow draft
      const draft = drafts[workflowId] || null;
      console.log(`Found workflow draft:`, draft);
      return draft;
    } else {
      // Load most recent temporary draft
      const tempDrafts = Object.entries(drafts)
        .filter(
          ([key, draft]: [string, DraftData]) =>
            key.startsWith("temp_") && !draft.workflowId
        )
        .sort(
          ([, a]: [string, DraftData], [, b]: [string, DraftData]) =>
            b.lastModified - a.lastModified
        );

      const draft = tempDrafts.length > 0 ? tempDrafts[0][1] : null;
      console.log(`Found temp draft:`, draft);
      return draft;
    }
  },

  /**
   * Clear a specific workflow draft
   * @param workflowId - The workflow ID to clear
   */
  clearDraft: (workflowId: string) => {
    const existingDrafts = localStorage.getItem("workflow_drafts");
    if (existingDrafts) {
      const drafts = JSON.parse(existingDrafts);
      delete drafts[workflowId];
      localStorage.setItem("workflow_drafts", JSON.stringify(drafts));
    }
  },

  /**
   * Clear all temporary drafts (for cleanup)
   */
  clearTempDrafts: () => {
    const existingDrafts = localStorage.getItem("workflow_drafts");
    if (existingDrafts) {
      const drafts = JSON.parse(existingDrafts);
      Object.keys(drafts).forEach((key) => {
        if (key.startsWith("temp_")) {
          delete drafts[key];
        }
      });
      localStorage.setItem("workflow_drafts", JSON.stringify(drafts));
    }
  },

  /**
   * Get all drafts for debugging or management
   * @returns Object containing all drafts
   */
  getAllDrafts: () => {
    const existingDrafts = localStorage.getItem("workflow_drafts");
    if (!existingDrafts) return {};
    return JSON.parse(existingDrafts);
  },

  /**
   * Clear all drafts (for cleanup)
   */
  clearAllDrafts: () => {
    localStorage.removeItem("workflow_drafts");
  },
};
