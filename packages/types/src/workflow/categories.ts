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
  FINANCE = "finance",
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
    case NodeCategory.FINANCE:
      return "amber";
    default:
      return "gray";
  }
}
