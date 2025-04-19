import type { AIProvider } from "@/lib/ai-provider"
import { OllamaProvider } from "@/lib/ai-providers/ollama"

// Update the getAIProvider function to check for environment variables
export function getAIProvider(): AIProvider {
  // Check if Ollama environment variables are set
  const ollamaApiUrl = process.env.OLLAMA_API_URL
  const ollamaModel = process.env.OLLAMA_MODEL

  // Default to Ollama provider, but could be switched based on env vars or config
  return new OllamaProvider(ollamaApiUrl, ollamaModel)
}

export async function generateFlowWithAI(prompt: string, userId: string) {
  try {
    const provider = getAIProvider()

    // Generate a flow using the AI provider
    const result = await provider.generateFlow(prompt, userId)

    // Validate the result
    if (!result || !result.nodes || !result.edges) {
      throw new Error("AI provider returned invalid flow data")
    }

    // Return the generated flow data
    return result
  } catch (error) {
    console.error("Error generating flow with AI:", error)
    throw error
  }
}
