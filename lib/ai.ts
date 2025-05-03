import type { AIProvider } from "@/lib/ai-provider";
import { OpenRouterProvider } from "@/lib/ai-providers/openrouter";
import type { Node, Edge } from "@/components/flow-canvas";

// Update the getAIProvider function to check for environment variables
export function getAIProvider(): AIProvider {
  // Check for environment variables to determine which provider to use
  const aiProvider = process.env.AI_PROVIDER?.toLowerCase() || "openrouter";

  // Select provider based on configuration
  switch (aiProvider) {
    case "openrouter":
      return new OpenRouterProvider();
    // Add other providers here as needed
    default:
      return new OpenRouterProvider(); // Default to OpenRouter
  }
}

export async function generateFlowWithAI(
  prompt: string,
  userId: string,
  existingNodes: Node[],
  existingEdges: Edge[]
) {
  try {
    const provider = getAIProvider();

    // Generate a flow using the AI provider
    const result = await provider.generateFlow(
      prompt,
      userId,
      existingNodes,
      existingEdges
    );

    // Validate the result
    if (!result || !result.nodes || !result.edges) {
      throw new Error("AI provider returned invalid flow data");
    }

    // Return the generated flow data
    return result;
  } catch (error) {
    console.error("Error generating flow with AI:", error);
    throw error;
  }
}
