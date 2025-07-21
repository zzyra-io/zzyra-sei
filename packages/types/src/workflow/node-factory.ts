import { BlockType } from "./block-types";

/**
 * FACTORY APPROACH: Generate nodes in the correct format from the start
 * This prevents the need for conversion by creating the right type initially
 */

export interface NodeCreationOptions {
  blockType: BlockType;
  position: { x: number; y: number };
  label?: string;
  config?: Record<string, unknown>;
  description?: string;
}

export interface EdgeCreationOptions {
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  animated?: boolean;
}

/**
 * Node Factory - creates properly formatted nodes for any context
 */
export class WorkflowNodeFactory {
  private static getBlockMetadata(blockType: BlockType) {
    switch (blockType) {
      case BlockType.WEBHOOK:
      case BlockType.SCHEDULE:
      case BlockType.PRICE_MONITOR:
      case BlockType.WALLET_LISTEN:
      case BlockType.SEI_CONTRACT_CALL:
        return {
          nodeType: "TRIGGER" as const,
          iconName: "play",
          defaultLabel: `${blockType} Trigger`,
        };

      case BlockType.HTTP_REQUEST:
      case BlockType.EMAIL:
      case BlockType.NOTIFICATION:
      case BlockType.SEI_PAYMENT:
      case BlockType.SEI_NFT:
      case BlockType.SEI_CONTRACT_CALL:
        return {
          nodeType: "ACTION" as const,
          iconName: "zap",
          defaultLabel: `${blockType} Action`,
        };

      case BlockType.CONDITION:
      case BlockType.DATA_TRANSFORM:
      case BlockType.CUSTOM:
        return {
          nodeType: "LOGIC" as const,
          iconName: "settings",
          defaultLabel: `${blockType} Logic`,
        };

      default:
        return {
          nodeType: "ACTION" as const,
          iconName: "box",
          defaultLabel: "Unknown Block",
        };
    }
  }

  /**
   * Create a node with all required fields for both React Flow and API
   */
  static createNode(options: NodeCreationOptions) {
    const metadata = this.getBlockMetadata(options.blockType);
    const id = `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      id,
      type: options.blockType, // React Flow uses this for component rendering
      position: options.position,
      data: {
        // Backend required fields
        blockType: options.blockType,
        label: options.label || metadata.defaultLabel,
        nodeType: metadata.nodeType,
        iconName: metadata.iconName,
        isEnabled: true,
        description: options.description,
        config: options.config || {},
        inputs: [],
        outputs: [],
      },
      // React Flow specific
      dragHandle: ".custom-drag-handle",
      connectable: true,
    };
  }

  /**
   * Create an edge with all required fields
   */
  static createEdge(options: EdgeCreationOptions) {
    const id = `edge-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    return {
      id,
      source: options.source,
      target: options.target,
      sourceHandle: options.sourceHandle,
      targetHandle: options.targetHandle,
      type: "smoothstep", // React Flow edge type
      animated: options.animated || false,
    };
  }

  /**
   * Batch create multiple nodes
   */
  static createNodes(nodeOptions: NodeCreationOptions[]) {
    return nodeOptions.map((options) => this.createNode(options));
  }

  /**
   * Batch create multiple edges
   */
  static createEdges(edgeOptions: EdgeCreationOptions[]) {
    return edgeOptions.map((options) => this.createEdge(options));
  }
}

/**
 * Convenience functions for common operations
 */
export const createWorkflowNode = WorkflowNodeFactory.createNode;
export const createWorkflowEdge = WorkflowNodeFactory.createEdge;
export const createWorkflowNodes = WorkflowNodeFactory.createNodes;
export const createWorkflowEdges = WorkflowNodeFactory.createEdges;
