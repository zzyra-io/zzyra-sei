/**
 * Shared node type categories for workflow blocks
 * Used by both UI and worker components
 */

/**
 * Standard node categories that all workflow blocks fall into
 */
export enum NodeCategory {
  TRIGGER = "trigger",
  ACTION = "action",
  LOGIC = "logic",
  DATA_PROCESSING = "data_processing", // New category for data transformation
}

/**
 * Get the UI display color for a node category
 */
export function getCategoryColor(category: NodeCategory): string {
  switch (category) {
    case NodeCategory.TRIGGER:
      return "blue";
    case NodeCategory.ACTION:
      return "green";
    case NodeCategory.LOGIC:
      return "purple";
    case NodeCategory.DATA_PROCESSING:
      return "purple"; // Purple for data processing
    default:
      return "gray";
  }
}
