import type { Node, Edge } from "@/components/flow-canvas";

interface AIGenerationResult {
  nodes: Node[];
  edges: Edge[];
}

interface AICustomBlockData {
  name: string;
  description: string;
  category: string;
  code: string;
  inputs: Array<{
    name: string;
    dataType: string;
    required?: boolean;
    description?: string;
    defaultValue?: unknown;
  }>;
  outputs: Array<{
    name: string;
    dataType: string;
    required?: boolean;
    description?: string;
  }>;
  configFields: Array<{
    name: string;
    label: string;
    type: string;
    required?: boolean;
    description?: string;
    defaultValue?: unknown;
  }>;
}

/**
 * Generate workflow using the backend API
 */
export async function generateFlowWithAI(
  prompt: string,
  userId: string,
  existingNodes: Node[] = [],
  existingEdges: Edge[] = []
): Promise<AIGenerationResult> {
  try {
    const response = await fetch("/api/ai/generate-workflow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        description: prompt,
        options: {
          detailedMode: true,
          prefillConfig: true,
        },
        existingNodes,
        existingEdges,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI generation failed: ${response.statusText}`);
    }

    const result = await response.json();

    // Validate the result
    if (!result || !result.nodes || !result.edges) {
      throw new Error("AI provider returned invalid flow data");
    }

    return {
      nodes: result.nodes,
      edges: result.edges,
    };
  } catch (error) {
    console.error("Error generating flow with AI:", error);
    throw error;
  }
}

/**
 * Generate custom block using the backend API
 */
export async function generateCustomBlock(
  prompt: string,
  userId: string
): Promise<AICustomBlockData> {
  try {
    const response = await fetch("/api/ai/generate-block", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
      }),
    });

    if (!response.ok) {
      throw new Error(`Block generation failed: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result || !result.block) {
      throw new Error("AI provider returned invalid block data");
    }

    return result.block;
  } catch (error) {
    console.error("Error generating custom block with AI:", error);
    throw error;
  }
}

/**
 * Refine existing workflow using the backend API
 */
export async function refineFlowWithAI(
  prompt: string,
  nodes: Node[],
  edges: Edge[],
  options: {
    preserveConnections?: boolean;
    focusArea?: string;
    intensity?: "light" | "medium" | "heavy";
  } = {}
): Promise<AIGenerationResult> {
  try {
    const response = await fetch("/api/ai/refine-workflow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        options,
        nodes,
        edges,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI refinement failed: ${response.statusText}`);
    }

    const result = await response.json();

    // Validate the result
    if (!result || !result.nodes || !result.edges) {
      throw new Error("AI provider returned invalid refinement data");
    }

    return {
      nodes: result.nodes,
      edges: result.edges,
    };
  } catch (error) {
    console.error("Error refining flow with AI:", error);
    throw error;
  }
}
