import type { Node, Edge } from "@/components/flow-canvas";
import type { CustomBlockDefinition, AICustomBlockData } from "@/types/custom-block";

// Define the AIProvider interface
export interface AIProvider {
  /**
   * Generate a workflow flow with nodes and edges
   */
  generateFlow(
    prompt: string,
    userId: string,
    existingNodes: Node[],
    existingEdges: Edge[]
  ): Promise<{
    nodes: Node[];
    edges: Edge[];
  }>;

  /**
   * Generate a custom block definition or partial definition
   */
  generateCustomBlock(
    prompt: string,
    userId: string
  ): Promise<AICustomBlockData>;

  /**
   * Generate generic text content based on a prompt and optional context
   */
  generateContent(
    prompt: string,
    userId: string,
    context?: string
  ): Promise<string>;
}
