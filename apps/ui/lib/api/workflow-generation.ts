/**
 * Workflow Generation API
 *
 * Functions for AI-powered workflow generation and refinement
 */

interface RefinementOptions {
  preserveConnections?: boolean;
  focusArea?: string;
  intensity?: "light" | "medium" | "heavy";
}

interface WorkflowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

interface RefinementResult {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

type StatusCallback = (
  status: string,
  progress?: number,
  partial?: WorkflowNode[]
) => void;

/**
 * Refine an existing workflow based on natural language prompt
 */
export const refineWorkflow = async (
  prompt: string,
  options: RefinementOptions = {},
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  onStatusUpdate?: StatusCallback
): Promise<RefinementResult> => {
  try {
    // Update status
    onStatusUpdate?.("Analyzing workflow...", 10);

    // Prepare the request payload
    const payload = {
      prompt,
      options,
      currentWorkflow: {
        nodes,
        edges,
      },
    };

    onStatusUpdate?.("Processing refinement...", 30);

    // Make API call to backend for workflow refinement
    const response = await fetch("/api/ai/refine-workflow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Refinement failed: ${response.statusText}`);
    }

    onStatusUpdate?.("Generating refined workflow...", 70);

    const result = await response.json();

    onStatusUpdate?.("Finalizing...", 90);

    // Validate the result
    if (!result.nodes || !Array.isArray(result.nodes)) {
      throw new Error("Invalid response: missing nodes array");
    }

    if (!result.edges || !Array.isArray(result.edges)) {
      throw new Error("Invalid response: missing edges array");
    }

    onStatusUpdate?.("Complete", 100);

    return {
      nodes: result.nodes,
      edges: result.edges,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    onStatusUpdate?.(`Error: ${errorMessage}`, 0);
    throw error;
  }
};

/**
 * Generate a workflow from scratch based on natural language description
 */
export const generateWorkflow = async (
  description: string,
  onStatusUpdate?: StatusCallback
): Promise<RefinementResult> => {
  try {
    onStatusUpdate?.("Understanding requirements...", 10);

    const payload = { description };

    onStatusUpdate?.("Designing workflow structure...", 30);

    const response = await fetch("/api/ai/generate-workflow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Generation failed: ${response.statusText}`);
    }

    onStatusUpdate?.("Creating components...", 70);

    const result = await response.json();

    if (!result.nodes || !Array.isArray(result.nodes)) {
      throw new Error("Invalid response: missing nodes array");
    }

    if (!result.edges || !Array.isArray(result.edges)) {
      throw new Error("Invalid response: missing edges array");
    }

    onStatusUpdate?.("Complete", 100);

    return {
      nodes: result.nodes,
      edges: result.edges,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";
    onStatusUpdate?.(`Error: ${errorMessage}`, 0);
    throw error;
  }
};
