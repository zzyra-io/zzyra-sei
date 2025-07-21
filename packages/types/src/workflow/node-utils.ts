import { BlockType } from "./block-types";
import {
  WorkflowNode,
  WorkflowEdge,
  ReactFlowNode,
  ReactFlowEdge,
} from "./workflow-node";

/**
 * Get block metadata for node type conversion
 */
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
 * Convert React Flow Node to WorkflowNode for API calls
 */
export function reactFlowNodeToWorkflowNode(node: ReactFlowNode): WorkflowNode {
  // Extract blockType from node data, with fallback
  const blockType = (node.data?.blockType as BlockType) || BlockType.CUSTOM;
  const metadata = getBlockMetadata(blockType);

  return {
    id: node.id,
    type: node.type || "default",
    position: node.position,
    data: {
      blockType,
      label: (node.data?.label as string) || metadata.label,
      description: (node.data?.description as string) || undefined,
      nodeType: metadata.nodeType,
      iconName: (node.data?.iconName as string) || metadata.iconName,
      isEnabled: (node.data?.isEnabled as boolean) ?? true,
      config: (node.data?.config as Record<string, unknown>) || {},
      inputs: (node.data?.inputs as unknown[]) || [],
      outputs: (node.data?.outputs as unknown[]) || [],
    },
  };
}

/**
 * Convert WorkflowNode to React Flow Node for display
 */
export function workflowNodeToReactFlowNode(node: WorkflowNode): ReactFlowNode {
  return {
    id: node.id,
    type: node.type,
    position: node.position,
    data: {
      ...node.data,
      label: node.data.label,
      blockType: node.data.blockType,
    },
    dragHandle: ".custom-drag-handle",
    connectable: true,
  };
}

/**
 * Convert React Flow Edge to WorkflowEdge for API calls
 */
export function reactFlowEdgeToWorkflowEdge(edge: ReactFlowEdge): WorkflowEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    type: edge.type || "default",
    animated: edge.animated || false,
  };
}

/**
 * Convert WorkflowEdge to React Flow Edge for display
 */
export function workflowEdgeToReactFlowEdge(edge: WorkflowEdge): ReactFlowEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    type: edge.type,
    animated: edge.animated,
  };
}

/**
 * Convert arrays of React Flow nodes/edges to WorkflowNodes/WorkflowEdges
 */
export function convertToWorkflowData(
  reactFlowNodes: ReactFlowNode[],
  reactFlowEdges: ReactFlowEdge[]
): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
  return {
    nodes: reactFlowNodes.map(reactFlowNodeToWorkflowNode),
    edges: reactFlowEdges.map(reactFlowEdgeToWorkflowEdge),
  };
}

/**
 * Convert arrays of WorkflowNodes/WorkflowEdges to React Flow nodes/edges
 */
export function convertToReactFlowData(
  workflowNodes: WorkflowNode[],
  workflowEdges: WorkflowEdge[]
): { nodes: ReactFlowNode[]; edges: ReactFlowEdge[] } {
  return {
    nodes: workflowNodes.map(workflowNodeToReactFlowNode),
    edges: workflowEdges.map(workflowEdgeToReactFlowEdge),
  };
}

/**
 * Validate that a node has the minimum required data for backend processing
 */
export function validateWorkflowNode(node: WorkflowNode): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!node.id) errors.push("Node must have an ID");
  if (!node.data.blockType) errors.push("Node must have a blockType");
  if (!node.data.label) errors.push("Node must have a label");
  if (!node.data.nodeType) errors.push("Node must have a nodeType");
  if (!node.position) errors.push("Node must have a position");

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Create a new WorkflowNode with proper defaults
 */
export function createWorkflowNode(
  blockType: BlockType,
  position: { x: number; y: number },
  overrides?: Partial<WorkflowNode["data"]>
): WorkflowNode {
  const metadata = getBlockMetadata(blockType);
  const id = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  return {
    id,
    type: "default",
    position,
    data: {
      blockType,
      label: metadata.label,
      nodeType: metadata.nodeType,
      iconName: metadata.iconName,
      isEnabled: true,
      config: {},
      inputs: [],
      outputs: [],
      ...overrides,
    },
  };
}
