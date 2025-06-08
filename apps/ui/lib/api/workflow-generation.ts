import { generateFlowWithAI } from "@/lib/ai";
import type { Node, Edge } from "@/components/flow-canvas";
import type { GenerationOptions } from "@/components/workflow-prompt";
import type { RefinementOptions } from "@/components/workflow-refinement";
import { getTemplateById } from "@/lib/workflow/templates";

// Cache for semantic similarity matching
const promptCache = new Map<
  string,
  {
    result: { nodes: Node[]; edges: Edge[] };
    timestamp: number;
    hash: string;
  }
>();

// Function to create a simple hash for caching
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

// Check if two prompts are semantically similar (simple implementation)
function isPromptSimilar(prompt1: string, prompt2: string): boolean {
  // Normalize prompts
  const norm1 = prompt1.toLowerCase().trim();
  const norm2 = prompt2.toLowerCase().trim();

  // Very simple similarity check - production would use embeddings
  if (norm1 === norm2) return true;

  // Check if one is a subset of the other
  if (norm1.includes(norm2) || norm2.includes(norm1)) return true;

  // Count shared words (very basic approach)
  const words1 = new Set(norm1.split(/\s+/));
  const words2 = new Set(norm2.split(/\s+/));
  const sharedWords = [...words1].filter((word) => words2.has(word));

  // If 80% of words are shared, consider similar
  return sharedWords.length >= Math.min(words1.size, words2.size) * 0.8;
}

// Find similar prompt in cache
function findSimilarPrompt(
  prompt: string
): { nodes: Node[]; edges: Edge[] } | null {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;

  for (const [cachedPrompt, entry] of promptCache.entries()) {
    // Skip entries older than 1 hour
    if (now - entry.timestamp > ONE_HOUR) {
      promptCache.delete(cachedPrompt);
      continue;
    }

    if (isPromptSimilar(prompt, cachedPrompt)) {
      return entry.result;
    }
  }

  return null;
}

// Generate a workflow from a natural language prompt
export async function generateWorkflow(
  prompt: string,
  options: GenerationOptions,
  existingNodes: Node[] = [],
  existingEdges: Edge[] = [],
  onProgress?: (
    status: string,
    progress: number,
    partialNodes?: Partial<Node>[]
  ) => void
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  try {
    // Update progress
    onProgress?.("preparing", 10);

    // Check cache for similar prompts
    const cachedResult = findSimilarPrompt(prompt);
    if (cachedResult && existingNodes.length === 0 && !options.detailedMode) {
      // Simulate progress for better UX even when using cache
      onProgress?.("generating", 50);
      await new Promise((resolve) => setTimeout(resolve, 500));
      onProgress?.("finalizing", 90, cachedResult.nodes as Partial<Node>[]);
      await new Promise((resolve) => setTimeout(resolve, 300));
      onProgress?.("complete", 100);

      return cachedResult;
    }

    // Enhance the prompt based on options
    let enhancedPrompt = prompt;

    if (options.detailedMode) {
      enhancedPrompt +=
        "\n\nPlease provide detailed configuration for all blocks and include proper error handling.";
    }

    if (options.prefillConfig) {
      enhancedPrompt +=
        "\n\nPre-fill configuration values based on the prompt where possible.";
    }

    if (options.domainHint) {
      enhancedPrompt += `\n\nThis workflow is related to ${options.domainHint} operations.`;
    }

    // Check if we should use a template or specialized generator
    if (options.templateId) {
      onProgress?.("preparing", 20, []);
      const template = getTemplateById(options.templateId);

      if (template) {
        onProgress?.("generating", 50, []);
        const result = template.createTemplate(options.userId || "");
        onProgress?.("finalizing", 90, result.nodes as Partial<Node>[]);
        onProgress?.("complete", 100);
        return result;
      }
    }

    // Use specialized DeFi workflow generator for DeFi prompts
    if (
      options.domainHint === "defi" ||
      prompt.toLowerCase().includes("defi") ||
      prompt.toLowerCase().includes("portfolio") ||
      prompt.toLowerCase().includes("base sepolia")
    ) {
      onProgress?.("preparing", 20, []);
      onProgress?.("generating", 50, []);

      const result = await generateDefiWorkflow(prompt, options.userId);

      onProgress?.("finalizing", 90, result.nodes as Partial<Node>[]);
      onProgress?.("complete", 100);

      return result;
    }

    // Update progress
    onProgress?.("generating", 30);

    // Make the API call
    const result = await generateFlowWithAI(
      enhancedPrompt,
      "", // userId
      existingNodes,
      existingEdges
    );

    // Update progress with partial results
    if (result.nodes.length > 0) {
      onProgress?.("finalizing", 80, result.nodes);
    }

    // Cache the result
    const promptHash = simpleHash(prompt);
    promptCache.set(prompt, {
      result,
      timestamp: Date.now(),
      hash: promptHash,
    });

    // Final progress update
    onProgress?.("complete", 100);

    return result;
  } catch (error) {
    console.error("Error generating workflow:", error);
    throw error;
  }
}

// Refine an existing workflow
export async function refineWorkflow(
  prompt: string,
  options: RefinementOptions,
  existingNodes: Node[],
  existingEdges: Edge[],
  onProgress?: (
    status: string,
    progress: number,
    partialNodes?: Partial<Node>[]
  ) => void
): Promise<{ nodes: Node[]; edges: Edge[] }> {
  try {
    // Update progress
    onProgress?.("preparing", 10);

    let enhancedPrompt = "";

    // Create refinement prompt based on mode
    if (options.mode === "all") {
      enhancedPrompt = `Refine this entire workflow: ${prompt}\n\nMake targeted improvements while preserving the overall workflow structure.`;
    } else if (options.mode === "selected") {
      // Filter to get only selected nodes
      const selectedNodesData = existingNodes
        .filter((node) => options.selectedNodes.includes(node.id))
        .map((node) => ({
          id: node.id,
          type: node.data.blockType,
          label: node.data.label,
        }));

      enhancedPrompt = `Refine ONLY these specific nodes in the workflow: ${JSON.stringify(selectedNodesData)}\n\nThe refinement needed is: ${prompt}\n\n${
        options.preserveConnections
          ? "IMPORTANT: Preserve all connections to and from these nodes."
          : "You may modify connections if needed."
      }`;
    } else if (options.mode === "missing") {
      enhancedPrompt = `The current workflow is missing some functionality. Please add components to address: ${prompt}\n\nPreserve all existing nodes and their configurations, just add what's missing and connect appropriately.`;
    }

    // Update progress
    onProgress?.("generating", 40);

    // Make the API call
    const result = await generateFlowWithAI(
      enhancedPrompt,
      "", // userId
      existingNodes,
      existingEdges
    );

    // Update progress with partial results
    onProgress?.("finalizing", 85, result.nodes);

    // Final progress update
    onProgress?.("complete", 100);

    return result;
  } catch (error) {
    console.error("Error refining workflow:", error);
    throw error;
  }
}
