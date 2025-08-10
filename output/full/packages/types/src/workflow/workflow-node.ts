import { BlockType } from './block-types';

/**
 * Workflow Node Interface - matches backend validation schema
 * Used for API calls, workflow execution, and backend processing
 */
export interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    blockType: BlockType;
    label: string;
    description?: string;
    nodeType: "TRIGGER" | "ACTION" | "LOGIC";
    iconName: string;
    isEnabled: boolean;
    config?: Record<string, unknown>;
    inputs?: unknown[];
    outputs?: unknown[];
  };
}

/**
 * Workflow Edge Interface - matches backend validation schema
 */
export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  animated?: boolean;
}

/**
 * React Flow Node - extended from @xyflow/react Node type
 * Used for frontend display and editing
 */
export interface ReactFlowNode {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
  dragHandle?: string;
  connectable?: boolean;
  selected?: boolean;
  dragging?: boolean;
  // Add other React Flow specific properties as needed
}

/**
 * React Flow Edge - extended from @xyflow/react Edge type
 * Used for frontend display and editing
 */
export interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  animated?: boolean;
  selected?: boolean;
  // Add other React Flow specific properties as needed
}