import { z } from "zod";
import { BlockType } from "./block-types";

/**
 * SCHEMA APPROACH: Use Zod for validation and type inference
 * This ensures type safety and automatic validation at runtime
 */

// Base schemas
export const PositionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const BlockTypeSchema = z.nativeEnum(BlockType);
export const NodeTypeSchema = z.enum(["TRIGGER", "ACTION", "LOGIC"]);

// Core workflow node data schema (backend requirements)
export const WorkflowNodeDataSchema = z
  .object({
    blockType: BlockTypeSchema,
    label: z.string().min(1),
    nodeType: NodeTypeSchema,
    iconName: z.string(),
    isEnabled: z.boolean().default(true),
    description: z.string().optional(),
    config: z.record(z.string(), z.unknown()).default({}),
    inputs: z.array(z.unknown()).default([]),
    outputs: z.array(z.unknown()).default([]),
    // Allow additional properties for React Flow
  })
  .passthrough();

// Full workflow node schema
export const WorkflowNodeSchema = z
  .object({
    id: z.string().min(1),
    type: z.string().default("default"),
    position: PositionSchema,
    data: WorkflowNodeDataSchema,
    // React Flow specific properties (optional)
    dragHandle: z.string().optional(),
    connectable: z.boolean().optional(),
    selected: z.boolean().optional(),
    dragging: z.boolean().optional(),
  })
  .passthrough(); // Allow additional React Flow properties

// Workflow edge schema
export const WorkflowEdgeSchema = z
  .object({
    id: z.string().min(1),
    source: z.string().min(1),
    target: z.string().min(1),
    sourceHandle: z.string().optional(),
    targetHandle: z.string().optional(),
    type: z.string().optional(),
    animated: z.boolean().default(false),
    // React Flow specific properties (optional)
    selected: z.boolean().optional(),
  })
  .passthrough(); // Allow additional React Flow properties

// Array schemas
export const WorkflowNodesSchema = z.array(WorkflowNodeSchema);
export const WorkflowEdgesSchema = z.array(WorkflowEdgeSchema);

// Full workflow schema
export const WorkflowSchema = z.object({
  nodes: WorkflowNodesSchema,
  edges: WorkflowEdgesSchema,
});

// Infer TypeScript types from schemas
export type WorkflowNodeData = z.infer<typeof WorkflowNodeDataSchema>;
export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;
export type WorkflowEdge = z.infer<typeof WorkflowEdgeSchema>;
export type Workflow = z.infer<typeof WorkflowSchema>;

/**
 * Validation and transformation functions
 */
export function validateWorkflowNode(
  node: unknown
):
  | { success: true; data: WorkflowNode }
  | { success: false; error: z.ZodError } {
  const result = WorkflowNodeSchema.safeParse(node);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
}

export function validateWorkflowEdge(
  edge: unknown
):
  | { success: true; data: WorkflowEdge }
  | { success: false; error: z.ZodError } {
  const result = WorkflowEdgeSchema.safeParse(edge);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
}

export function validateWorkflow(
  workflow: unknown
): { success: true; data: Workflow } | { success: false; error: z.ZodError } {
  const result = WorkflowSchema.safeParse(workflow);
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, error: result.error };
  }
}

/**
 * Transform and validate arrays of nodes/edges
 */
export function sanitizeNodesForApi(nodes: unknown[]): WorkflowNode[] {
  return nodes
    .map((node) => {
      const result = validateWorkflowNode(node);
      return result.success ? result.data : null;
    })
    .filter((node): node is WorkflowNode => node !== null);
}

export function sanitizeEdgesForApi(edges: unknown[]): WorkflowEdge[] {
  return edges
    .map((edge) => {
      const result = validateWorkflowEdge(edge);
      return result.success ? result.data : null;
    })
    .filter((edge): edge is WorkflowEdge => edge !== null);
}

/**
 * Create node with defaults and validation
 */
export function createValidatedNode(
  blockType: BlockType,
  position: { x: number; y: number },
  overrides?: Partial<WorkflowNodeData>
): WorkflowNode {
  const metadata = getBlockMetadata(blockType);

  const nodeData: WorkflowNodeData = {
    blockType,
    label: metadata.label,
    nodeType: metadata.nodeType,
    iconName: metadata.iconName,
    isEnabled: true,
    config: {},
    inputs: [],
    outputs: [],
    ...overrides,
  };

  const node: WorkflowNode = {
    id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: blockType,
    position,
    data: nodeData,
    dragHandle: ".custom-drag-handle",
    connectable: true,
  };

  // Validate the created node
  const validation = validateWorkflowNode(node);
  if (!validation.success) {
    throw new Error(`Failed to create valid node: ${validation.error.message}`);
  }

  return validation.data;
}

function getBlockMetadata(blockType: BlockType): {
  nodeType: "TRIGGER" | "ACTION" | "LOGIC";
  iconName: string;
  label: string;
} {
  switch (blockType) {
    case BlockType.WEBHOOK:
    case BlockType.SCHEDULE:
    case BlockType.PRICE_MONITOR:
    case BlockType.WALLET_LISTEN:
      return {
        nodeType: "TRIGGER",
        iconName: "play",
        label: `${blockType} Trigger`,
      };

    case BlockType.HTTP_REQUEST:
    case BlockType.EMAIL:
    case BlockType.NOTIFICATION:
      // Sei blockchain operations now available through @sei-js/mcp-server via AI_AGENT blocks
      return {
        nodeType: "ACTION",
        iconName: "zap",
        label: `${blockType} Action`,
      };

    case BlockType.CONDITION:
    case BlockType.DATA_TRANSFORM:
    case BlockType.CUSTOM:
      return {
        nodeType: "LOGIC",
        iconName: "settings",
        label: `${blockType} Logic`,
      };

    default:
      return { nodeType: "ACTION", iconName: "box", label: "Unknown Block" };
  }
}
