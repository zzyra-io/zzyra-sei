/**
 * Workflow Generation API
 *
 * Functions for AI-powered workflow generation and refinement
 */

import api from "../services/api";

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

interface GenerationOptions {
  detailedMode: boolean;
  prefillConfig: boolean;
  domainHint?: string;
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

    // Prepare the request payload - send fields directly, not wrapped in payload
    const requestData = {
      prompt,
      options,
      nodes,
      edges,
    };

    onStatusUpdate?.("Processing refinement...", 30);

    // Make API call to backend for workflow refinement
    const response = await api.post("/ai/refine-workflow", requestData);

    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`Refinement failed: ${response.statusText}`);
    }

    onStatusUpdate?.("Generating refined workflow...", 70);

    const result = response.data;

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
  options: GenerationOptions = { detailedMode: true, prefillConfig: true },
  existingNodes: WorkflowNode[] = [],
  existingEdges: WorkflowEdge[] = [],
  onStatusUpdate?: StatusCallback
): Promise<RefinementResult> => {
  try {
    // Debug logging to identify the issue
    console.log("generateWorkflow called with params:", {
      description: typeof description,
      options: typeof options,
      existingNodes: typeof existingNodes,
      existingEdges: typeof existingEdges,
      onStatusUpdate: typeof onStatusUpdate,
      parametersReceived: [
        description,
        options,
        existingNodes,
        existingEdges,
        onStatusUpdate,
      ].length,
    });

    if (typeof onStatusUpdate !== "function" && onStatusUpdate !== undefined) {
      console.error("onStatusUpdate is not a function:", onStatusUpdate);
      throw new Error(
        "onStatusUpdate parameter must be a function or undefined"
      );
    }

    onStatusUpdate?.("Understanding requirements...", 10);

    // Prepare the request data - send fields directly, not wrapped in payload
    const requestData = {
      description,
      options,
      existingNodes,
      existingEdges,
    };

    onStatusUpdate?.("Designing workflow structure...", 30);

    const response = await api.post("/ai/generate-workflow", requestData);

    if (response.status !== 200 && response.status !== 201) {
      throw new Error(`Generation failed: ${response.statusText}`);
    }

    onStatusUpdate?.("Creating components...", 70);

    const result = response.data;

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
