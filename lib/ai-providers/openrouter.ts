import type { AIProvider } from "@/lib/ai-provider";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { z } from "zod";
import type { Node, Edge } from "@/components/flow-canvas"; // Add this import

// Define the schema for the workflow response
const WorkflowResponseSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      type: z.string().optional().default("custom"), // Ensure type defaults if missing
      position: z.object({
        x: z.number(),
        y: z.number(),
      }),
      data: z.object({
        blockType: z.string(),
        label: z.string(),
        description: z.string().optional(),
        nodeType: z.string(), // Should match 'type' above, consider consolidation
        iconName: z.string(),
        isEnabled: z.boolean().optional().default(true),
        config: z.record(z.any()).optional(),
        inputs: z.array(z.any()).optional(), // Define input/output schema if possible
        outputs: z.array(z.any()).optional(),
      }),
    })
  ),
  edges: z.array(
    z.object({
      id: z.string(),
      source: z.string(),
      target: z.string(),
      sourceHandle: z.string().optional(),
      targetHandle: z.string().optional(),
      type: z.string().optional().default("custom"), // Default edge type
      animated: z.boolean().optional().default(false),
    })
  ),
});

// Define schema for custom block definition response
const CustomBlockResponseSchema = z.object({
  name: z.string(),
  description: z.string(),
  category: z.string(),
  inputs: z.array(z.object({ name: z.string(), type: z.string() })),
  outputs: z.array(z.object({ name: z.string(), type: z.string() })),
  code: z.string(), // Consider validating code structure if possible
});

const openrouter = createOpenRouter({
  apiKey: process.env.NEXT_PUBLIC_OPENROUTER_API_KEY,
});

export class OpenRouterProvider implements AIProvider {
  private model = openrouter("openai/gpt-4o"); // Or allow model selection

  // Updated generateFlow method
  async generateFlow(
    prompt: string,
    userId: string, // userId might be used for context/personalization later
    existingNodes: Node[],
    existingEdges: Edge[]
  ): Promise<{ nodes: Node[]; edges: Edge[] }> {
    try {
      // Serialize existing workflow for context
      const context =
        existingNodes.length > 0 || existingEdges.length > 0
          ? `
Existing Workflow Context:
Nodes: ${JSON.stringify(existingNodes.map(n => ({id: n.id, type: n.data.blockType, label: n.data.label})), null, 2)} // Simplified node context
Edges: ${JSON.stringify(existingEdges.map(e => ({source: e.source, target: e.target})), null, 2)} // Simplified edge context

Instructions: Based on the user prompt below, enhance or add to the existing workflow. If adding nodes, try to connect them logically to the existing ones if appropriate. Generate unique IDs for new nodes/edges. Ensure the output adheres strictly to the JSON schema.
`
          : "Instructions: Based on the user prompt below, create a new workflow. Ensure the output adheres strictly to the JSON schema.";

      const systemPrompt = `
You are an AI assistant designed to generate workflow diagrams based on user prompts for the Zyra platform.
Your output MUST be a JSON object containing 'nodes' and 'edges' arrays, strictly adhering to the provided schema.

Schema Details:
- Nodes: Require id, type ('custom'), position {x, y}, and data {blockType, label, description, nodeType, iconName, config, inputs, outputs}.
- Edges: Require id, source, target, and optionally sourceHandle/targetHandle, type ('custom'), animated.
- 'blockType' must be a known type (e.g., 'TRIGGER_TIMER', 'ACTION_EMAIL', 'LOGIC_FILTER', 'CRYPTO_PRICE_CHECK', 'AI_BLOCKCHAIN').
- 'nodeType' in data must match the main 'type' field ('custom').

IMPORTANT: Pre-fill Node Configuration:
- Analyze the user prompt for specific configuration details (e.g., email addresses, URLs, price targets, cron schedules, specific text for messages).
- Populate the 'data.config' object for each relevant node with these extracted details.
- Example 1: If prompt is "Send an email to team@example.com with subject 'Update'", the ACTION_EMAIL node's config should be { "to": "team@example.com", "subject": "Update", "body": "" } (infer body if not specified).
- Example 2: If prompt is "Check if BTC price is above $60000 every 5 minutes", the CRYPTO_PRICE_CHECK node's config should be { "asset": "BTC", "condition": "above", "targetPrice": "60000", "checkInterval": "5m" }.
- Example 3: If prompt is "Trigger every day at 9 AM UTC", the TRIGGER_TIMER node's config should be { "cron": "0 9 * * *", "timezone": "UTC" }.
- If details are missing, use reasonable defaults or leave fields empty/null within the config object where appropriate (e.g., empty string for email body if unspecified).

Layout & Connection:
- Position nodes logically (e.g., left-to-right flow).
- Connect nodes with edges in the correct execution order.
- If adding to an existing workflow, try to connect new nodes to relevant existing nodes.

${context}

User Prompt:
`;

      const { text } = await generateText({
        model: this.model,
        system: systemPrompt,
        prompt: prompt,
      });

      // Attempt to parse the response
      let parsedResponse;
      try {
        // Clean potential markdown code fences
        const cleanedText = text.replace(/```json\n?|\n?```/g, "").trim();
        parsedResponse = JSON.parse(cleanedText);
      } catch (parseError) {
        console.error(
          "Failed to parse AI response JSON:",
          parseError,
          "Raw text:",
          text
        );
        throw new Error("AI returned invalid JSON format.");
      }

      // Validate the parsed response against the Zod schema
      const validationResult = WorkflowResponseSchema.safeParse(parsedResponse);

      if (!validationResult.success) {
        console.error(
          "AI response failed schema validation:",
          validationResult.error.errors
        );
        console.error("Invalid Response Data:", parsedResponse);
        throw new Error(
          `AI response did not match the required format: ${validationResult.error.message}`
        );
      }

      // Return the validated data, explicitly casting to ensure type safety
      return validationResult.data as { nodes: Node[]; edges: Edge[] };
    } catch (error) {
      console.error("Error generating flow with OpenRouter:", error);
      // Re-throw a more generic error for the client
      throw new Error(
        `Failed to generate workflow: ${
          error instanceof Error ? error.message : "Unknown AI error"
        }`
      );
    }
  }

  // generateCustomBlock remains the same
  async generateCustomBlock(prompt: string, userId: string): Promise<any> {
    try {
      const systemPrompt = `
You are an AI assistant that generates custom workflow block definitions.
Output a JSON object with: name, description, category, inputs (array of {name, type}), outputs (array of {name, type}), and code (string containing JavaScript execution logic).
The code should be a self-contained function that takes 'inputs' object and 'context' object, and returns an 'outputs' object.
Example Input: { name: "price", type: "number" }
Example Output: { name: "result", type: "boolean" }
Example Code: "async function execute(inputs, context) { return { result: inputs.price > 50000 }; }"
Ensure the output strictly adheres to the JSON schema.
`;

      const { text } = await generateText({
        model: this.model,
        system: systemPrompt,
        prompt: prompt,
      });

      let parsedResponse;
      try {
        const cleanedText = text.replace(/```json\n?|\n?```/g, "").trim();
        parsedResponse = JSON.parse(cleanedText);
      } catch (parseError) {
        console.error(
          "Failed to parse AI response JSON for custom block:",
          parseError,
          "Raw text:",
          text
        );
        throw new Error("AI returned invalid JSON format for custom block.");
      }

      const validationResult =
        CustomBlockResponseSchema.safeParse(parsedResponse);

      if (!validationResult.success) {
        console.error(
          "Custom block AI response failed schema validation:",
          validationResult.error.errors
        );
        console.error("Invalid Response Data:", parsedResponse);
        throw new Error(
          `Custom block AI response did not match the required format: ${validationResult.error.message}`
        );
      }

      return validationResult.data;
    } catch (error) {
      console.error("Error generating custom block with OpenRouter:", error);
      throw new Error(
        `Failed to generate custom block: ${
          error instanceof Error ? error.message : "Unknown AI error"
        }`
      );
    }
  }

  // generateContent remains the same
  async generateContent(
    prompt: string,
    userId: string,
    context?: string
  ): Promise<string> {
    try {
      const systemPrompt = `You are a helpful AI assistant. ${context ? `\nContext: ${context}` : ""}`;
      const { text } = await generateText({
        model: this.model,
        system: systemPrompt,
        prompt: prompt,
      });
      return text;
    } catch (error) {
      console.error("Error generating content with OpenRouter:", error);
      throw new Error(
        `Failed to generate content: ${
          error instanceof Error ? error.message : "Unknown AI error"
        }`
      );
    }
  }
}
