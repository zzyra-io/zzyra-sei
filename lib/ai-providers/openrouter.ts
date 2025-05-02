import type { AIProvider } from "@/lib/ai-provider";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { z } from "zod";

// Define the schema for the workflow response
const WorkflowResponseSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      type: z.string(),
      position: z.object({
        x: z.number(),
        y: z.number(),
      }),
      data: z.object({
        blockType: z.string(),
        label: z.string(),
        description: z.string().optional(),
        nodeType: z.string(),
        iconName: z.string(),
        isEnabled: z.boolean().optional().default(true),
        config: z.record(z.any()).optional().default({}),
        style: z
          .object({
            backgroundColor: z.string().optional(),
            borderColor: z.string().optional(),
            textColor: z.string().optional(),
            accentColor: z.string().optional(),
            width: z.number().optional(),
          })
          .optional(),
      }),
    })
  ),
  edges: z.array(
    z.object({
      id: z.string().optional(),
      type: z.string().optional().default("custom"),
      source: z.string(),
      sourceHandle: z.string().optional(),
      target: z.string(),
      targetHandle: z.string().optional(),
      animated: z.boolean().optional(),
      style: z
        .object({
          stroke: z.string().optional(),
        })
        .optional(),
      data: z
        .object({
          type: z.string().optional(),
        })
        .optional(),
    })
  ),
});

export class OpenRouterProvider implements AIProvider {
  private openrouter: ReturnType<typeof createOpenRouter>;
  private modelName: string;

  constructor() {
    // Get API key from environment variables
    const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
    if (!apiKey) {
      throw new Error(
        "NEXT_PUBLIC_OPENROUTER_API_KEY environment variable is not set"
      );
    }

    // Initialize OpenRouter client using the SDK
    this.openrouter = createOpenRouter({
      apiKey,
    });

    // Set default model or use environment variable
    this.modelName = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
  }
  
  /**
   * Generate a custom block definition based on a prompt
   */
  async generateCustomBlock(prompt: string, systemPrompt: string, userId: string) {
    try {
      // Use the AI SDK's generateText function with OpenRouter
      const { text } = await generateText({
        model: this.openrouter("openai/gpt-4o-mini"),
        system: systemPrompt,
        prompt: prompt,
        temperature: 0.2, // Lower temperature for more consistent outputs
      });

      // Parse the JSON response
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(text);
      } catch (error) {
        console.error("Failed to parse AI response as JSON:", text);
        throw new Error("AI returned invalid JSON");
      }

      // Return the parsed response
      return parsedResponse;
    } catch (error) {
      console.error("OpenRouter AI provider error:", error);
      throw error;
    }
  }

  async generateFlow(prompt: string, userId: string) {
    try {
      // Create a system prompt that explains how to generate workflow nodes and edges
      const systemPrompt = `You are a workflow automation expert. Your task is to convert natural language instructions into a workflow represented as nodes and edges.

INSTRUCTIONS:
1. Analyze the user's request and identify the key components needed for the workflow.
2. Generate a JSON object with 'nodes' and 'edges' arrays that represent the workflow.
3. Each node should have:
   - A unique 'id' (format: "{blockType}-{timestamp}")
   - A 'type' (usually "custom")
   - A 'position' object with x and y coordinates
   - A 'data' object containing:
     - 'blockType': The type of block (e.g., "email", "price-monitor", "webhook", "schedule")
     - 'label': A short, descriptive name
     - 'description': A brief explanation of what the node does
     - 'nodeType': Either "trigger" (starts workflow) or "action" (performs task)
     - 'iconName': Icon to display (e.g., "email", "price-monitor")
     - 'isEnabled': Boolean, default true
     - 'config': Object with configuration specific to the block type
     - 'style': Visual styling options

4. Each edge should have:
   - A 'source' (ID of source node)
   - A 'target' (ID of target node)
   - Optional 'sourceHandle' and 'targetHandle' (usually "output-1" and "input-1")
   - 'animated' (boolean)
   - Optional 'style' object

5. Available block types:
   - price-monitor: Monitors cryptocurrency prices (nodeType: trigger)
     - config: { asset: string, condition: "above" | "below", targetPrice: string, checkInterval: string }
   - email: Sends email notifications (nodeType: action)
     - config: { to: string, subject: string, body: string }
   - webhook: Triggers on HTTP requests (nodeType: trigger)
     - config: { url: string, method: string }
   - schedule: Runs on a schedule (nodeType: trigger)
     - config: { cron: string, timezone: string }
   - discord: Sends Discord messages (nodeType: action)
     - config: { webhookUrl: string, message: string }
   - telegram: Sends Telegram messages (nodeType: action)
     - config: { botToken: string, chatId: string, message: string }
   - sms: Sends SMS messages (nodeType: action)
     - config: { to: string, message: string }
   - condition: Evaluates conditions (nodeType: action)
     - config: { condition: string }
   - delay: Adds a time delay (nodeType: action)
     - config: { delayMinutes: number }
   - api: Makes API calls (nodeType: action)
     - config: { url: string, method: string, headers: object, body: string }

6. Position nodes in a logical flow from left to right, with triggers on the left.
7. Connect nodes with edges in the order they should execute.
8. Ensure all nodes have appropriate configuration based on their type.

RESPONSE FORMAT:
Return ONLY a valid JSON object with 'nodes' and 'edges' arrays. Do not include any explanations or markdown formatting.`;

      // Use the AI SDK's generateText function with OpenRouter
      const { text } = await generateText({
        model: this.openrouter("openai/gpt-4o-mini"),
        system: systemPrompt,
        prompt: `Create a workflow for: ${prompt}`,
        temperature: 0.2, // Lower temperature for more consistent outputs
        onStepFinish: (result) => {
          console.log("result", result);
        },
        // format: "json",
      });

      // Parse the JSON response
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(text);
      } catch (error) {
        console.error("Failed to parse AI response as JSON:", text);
        throw new Error("AI returned invalid JSON");
      }

      // Validate the response against our schema
      const validationResult = WorkflowResponseSchema.safeParse(parsedResponse);
      if (!validationResult.success) {
        console.error("AI response validation failed:", validationResult.error);
        throw new Error("AI response did not match expected schema");
      }

      // Return the validated workflow data
      return validationResult.data;
    } catch (error) {
      console.error("OpenRouter AI provider error:", error);
      throw error;
    }
  }
}
