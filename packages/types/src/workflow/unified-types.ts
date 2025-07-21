import { BlockType } from "./block-types";

/**
 * UNIFIED APPROACH: Single type that works for both React Flow and API
 * This eliminates the need for conversion utilities
 */
export interface UnifiedWorkflowNode {
  id: string;
  type?: string;
  position: { x: number; y: number };
  data: {
    // Required by backend validation
    blockType: BlockType;
    label: string;
    nodeType: "TRIGGER" | "ACTION" | "LOGIC";
    iconName: string;
    isEnabled: boolean;

    // Optional fields
    description?: string;
    config?: Record<string, unknown>;
    inputs?: unknown[];
    outputs?: unknown[];

    // React Flow specific (optional)
    selected?: boolean;
    dragging?: boolean;
  };

  // React Flow specific (optional)
  dragHandle?: string;
  connectable?: boolean;
  selected?: boolean;
  dragging?: boolean;
}

export interface UnifiedWorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  type?: string;
  animated?: boolean;

  // React Flow specific (optional)
  selected?: boolean;
}

/**
 * Type guards to check if data is properly formatted for API calls
 */
export function isValidWorkflowNode(node: UnifiedWorkflowNode): boolean {
  return !!(
    node.id &&
    node.data?.blockType &&
    node.data?.label &&
    node.data?.nodeType &&
    node.data?.iconName &&
    typeof node.data?.isEnabled === "boolean" &&
    node.position
  );
}

export function isValidWorkflowEdge(edge: UnifiedWorkflowEdge): boolean {
  return !!(edge.id && edge.source && edge.target);
}

/**
 * Ensure nodes have all required fields for API calls
 */
export function ensureValidWorkflowNode(
  node: Partial<UnifiedWorkflowNode>
): UnifiedWorkflowNode {
  const blockType = node.data?.blockType || BlockType.CUSTOM;
  const metadata = getBlockMetadata(blockType);

  return {
    id: node.id || `node-${Date.now()}`,
    type: node.type || "default",
    position: node.position || { x: 100, y: 100 },
    data: {
      blockType,
      label: node.data?.label || metadata.label,
      nodeType: node.data?.nodeType || metadata.nodeType,
      iconName: node.data?.iconName || metadata.iconName,
      isEnabled: node.data?.isEnabled ?? true,
      description: node.data?.description,
      config: node.data?.config || {},
      inputs: node.data?.inputs || [],
      outputs: node.data?.outputs || [],
      ...node.data, // Preserve any additional React Flow data
    },
    dragHandle: node.dragHandle || ".custom-drag-handle",
    connectable: node.connectable ?? true,
    ...node, // Preserve any additional React Flow properties
  };
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
    case BlockType.SEI_CONTRACT_CALL:
      return {
        nodeType: "TRIGGER",
        iconName: "play",
        label: `${blockType} Trigger`,
      };

    case BlockType.HTTP_REQUEST:
    case BlockType.EMAIL:
    case BlockType.NOTIFICATION:
    case BlockType.SEI_PAYMENT:
    case BlockType.SEI_NFT:
    case BlockType.SEI_CONTRACT_CALL:
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

/**
 * Validate and clean nodes array for API calls
 */
export function prepareNodesForApi(
  nodes: UnifiedWorkflowNode[]
): UnifiedWorkflowNode[] {
  return nodes.map(ensureValidWorkflowNode).filter(isValidWorkflowNode);
}

/**
 * Validate and clean edges array for API calls
 */
export function prepareEdgesForApi(
  edges: UnifiedWorkflowEdge[]
): UnifiedWorkflowEdge[] {
  return edges.filter(isValidWorkflowEdge);
}
