import type { AIProvider } from "@/lib/ai-provider";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { z } from "zod";
import type { Node, Edge } from "@xyflow/react";
import { DataType } from "@zyra/types";
import type { AICustomBlockData } from "@zyra/types";
import { generateDefiWorkflow } from "@/lib/workflow/defi-workflow-generator";

// Define the schema for the workflow response
const WorkflowResponseSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      type: z.string().optional().default("custom"),
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
        config: z.record(z.any()).optional(),
        inputs: z.array(z.any()).optional(),
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
      type: z.string().optional().default("custom"),
      animated: z.boolean().optional().default(false),
    })
  ),
});

// Define schema for BlockConfigField
const BlockConfigFieldSchema = z.object({
  name: z.string(),
  label: z.string(),
  type: z.enum(["string", "number", "boolean", "json", "select"]),
  defaultValue: z.any().optional(),
  options: z.array(z.string()).optional(),
  required: z.boolean().optional(),
  placeholder: z.string().optional(),
  description: z.string().optional(),
});

// Define BlockParameterAISchema Zod schema
const BlockParameterAISchema = z.object({
  name: z
    .string()
    .describe("The code-friendly name/identifier for the parameter."),
  description: z
    .string()
    .optional()
    .describe("A user-friendly description of the parameter."),
  dataType: z
    .nativeEnum(DataType)
    .describe("The data type (e.g., string, number, boolean)."),
  required: z
    .boolean()
    .optional()
    .default(true)
    .describe("Whether the parameter is required."),
  defaultValue: z
    .any()
    .optional()
    .describe("An optional default value for the parameter."),
});

// Define schema for custom block definition response
const CustomBlockResponseSchema = z.object({
  name: z.string(),
  description: z.string(),
  category: z.string(),
  inputs: z
    .array(BlockParameterAISchema)
    .optional()
    .default([])
    .describe("Array of input parameters."),
  outputs: z
    .array(BlockParameterAISchema)
    .optional()
    .default([])
    .describe("Array of output parameters."),
  configFields: z.array(BlockConfigFieldSchema).optional().default([]),
  code: z.string(),
});

const openrouter = createOpenRouter({
  apiKey: process.env.NEXT_PUBLIC_OPENROUTER_API_KEY,
});

export class OpenRouterProvider implements AIProvider {
  private model = openrouter("openai/gpt-4o");

  // Method for generating any block type
  async generateBlock({
    blockType,
    category,
    name,
    description,
    additionalContext,
    userId,
  }: {
    blockType: string;
    category: string;
    name: string;
    description: string;
    additionalContext?: string;
    userId: string;
  }): Promise<AICustomBlockData> {
    try {
      const systemPrompt = `
You are an AI assistant specializing in workflow automation. Generate a custom block definition in JSON format.

The block type requested is: ${blockType}
The category is: ${category}
The name is: ${name}
The description is: ${description}

Output a JSON object adhering strictly to this structure:
{
  "name": "${name}",
  "description": "${description}",
  "category": "${category}", 
  "inputs": [ 
    {
      "name": "input_param_name", 
      "description": "What this input is for", 
      "dataType": "string" | "number" | "boolean" | "object" | "array" | "any", 
      "required": true, 
      "defaultValue": null 
    },
    ...
  ],
  "outputs": [ 
    {
      "name": "output_param_name",
      "description": "What this output represents",
      "dataType": "string", 
      "required": true
    },
    ...
  ],
  "configFields": [ 
    {
      "name": "config_field_name",
      "label": "UI Label",
      "type": "string" | "number" | "boolean" | "json" | "select",
      "defaultValue": "default value",
      "options": ["option1", "option2"], 
      "required": false,
      "placeholder": "Placeholder text",
      "description": "Help text for the config field."
    },
    ...
  ],
  "code": "async function execute(inputs, context) { /* JavaScript logic using inputs and context.config.config_field_name */ return { output_param_name: result }; }"
}

Example Input: { "name": "inputValue", "description": "Input parameter", "dataType": "string", "required": true }
Example Output: { "name": "result", "description": "Operation result", "dataType": "number" }
Example Config: { "name": "configuration", "label": "Configuration", "type": "string", "defaultValue": "default", "required": false }

Ensure the output is ONLY the JSON object, without any extra text or markdown formatting.
Base the generated fields (inputs, outputs, configFields, code) on the user's request: "${additionalContext || description}"
`;

      const { text } = await generateText({
        model: this.model,
        system: systemPrompt,
        prompt: additionalContext || description,
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

      // Return type now matches AICustomBlockData thanks to schema alignment
      return validationResult.data as AICustomBlockData;
    } catch (error) {
      console.error("Error generating custom block with OpenRouter:", error);
      throw new Error(
        `Failed to generate custom block: ${
          error instanceof Error ? error.message : "Unknown AI error"
        }`
      );
    }
  }
  // Method for compatibility - deprecated in favor of generateBlock

  // Method specifically for generating DeFi block definitions
  async generateDefiBlock(
    prompt: string,
    blockType: string,
    userId: string
  ): Promise<AICustomBlockData> {
    try {
      const systemPrompt = `
You are an AI assistant specializing in DeFi (Decentralized Finance) integrations. Generate a custom DeFi workflow block definition in JSON format.

The block type requested is: ${blockType}

Output a JSON object adhering strictly to this structure:
{
  "name": "DeFi Block Name",
  "description": "Detailed description of what this DeFi block does",
  "category": "FINANCE", 
  "inputs": [ 
    {
      "name": "input_param_name", 
      "description": "What this input is for", 
      "dataType": "string" | "number" | "boolean" | "object" | "array" | "any", 
      "required": true, 
      "defaultValue": null 
    },
    ...
  ],
  "outputs": [ 
    {
      "name": "output_param_name",
      "description": "What this output represents",
      "dataType": "string", 
      "required": true
    },
    ...
  ],
  "configFields": [ 
    {
      "name": "config_field_name",
      "label": "UI Label",
      "type": "string" | "number" | "boolean" | "json" | "select",
      "defaultValue": "default value",
      "options": ["option1", "option2"], 
      "required": false,
      "placeholder": "Placeholder text",
      "description": "Help text for the config field."
    },
    ...
  ],
  "code": "async function execute(inputs, context) {\n  // Advanced DeFi logic\n  // For Web3 interactions, use ethers.js library which is available\n  // Handle proper error cases\n  // Interact with blockchain networks securely\n  // Example:\n  // const provider = new ethers.providers.JsonRpcProvider(context.config.rpcUrl);\n  // const contract = new ethers.Contract(context.config.contractAddress, ABI, provider);\n  // const result = await contract.someMethod();\n  \n  return { output_param_name: result };\n}"
}

Ensure your generated code is secure and follows Web3 best practices:
- Proper error handling for blockchain interactions
- Input validation
- Gas optimization techniques when relevant
- Protection against common DeFi vulnerabilities
- Safe handling of private keys and credentials

Ensure the output is ONLY the JSON object, without any extra text or markdown formatting.
Create the block based on this user request: "${prompt}"
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
          "Failed to parse AI response JSON for DeFi block:",
          parseError,
          "Raw text:",
          text
        );
        throw new Error("AI returned invalid JSON format for DeFi block.");
      }

      const validationResult =
        CustomBlockResponseSchema.safeParse(parsedResponse);

      if (!validationResult.success) {
        console.error(
          "DeFi block AI response failed schema validation:",
          validationResult.error.errors
        );
        console.error("Invalid Response Data:", parsedResponse);
        throw new Error(
          `DeFi block AI response did not match the required format: ${validationResult.error.message}`
        );
      }

      // Track usage by user ID for analytics
      console.log(
        `DeFi block generated for user: ${userId}, blockType: ${blockType}`
      );

      // You could add more sophisticated analytics tracking here
      // For example, reporting to PostHog or another analytics service
      try {
        // Define a type for PostHog global variable to avoid using 'any'
        interface PostHogWindow extends Window {
          posthog?: {
            capture: (
              event: string,
              properties: Record<string, unknown>
            ) => void;
          };
        }

        if (
          typeof window !== "undefined" &&
          (window as PostHogWindow).posthog
        ) {
          (window as PostHogWindow).posthog?.capture("defi_block_generated", {
            userId,
            blockType,
            promptLength: prompt.length,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (analyticsError) {
        console.warn("Analytics tracking error:", analyticsError);
        // Non-blocking - don't throw so we still return the block data
      }

      // Return validated DeFi block data
      return validationResult.data as AICustomBlockData;
    } catch (error) {
      console.error("Error generating DeFi block with OpenRouter:", error);
      throw new Error(
        `Failed to generate DeFi block: ${
          error instanceof Error ? error.message : "Unknown AI error"
        }`
      );
    }
  }

  // Updated generateFlow method
  async generateFlow(
    prompt: string,
    userId: string,
    existingNodes: Node[],
    existingEdges: Edge[]
  ): Promise<{ nodes: Node[]; edges: Edge[] }> {
    // Check if this is a DeFi-specific prompt
    const defiKeywords = [
      "defi",
      "crypto",
      "blockchain",
      "token",
      "swap",
      "yield",
      "liquidity",
      "aave",
      "uniswap",
      "wallet",
      "eth",
      "bitcoin",
      "btc",
      "cryptocurrency",
    ];

    const isDefiPrompt = defiKeywords.some((keyword) =>
      prompt.toLowerCase().includes(keyword.toLowerCase())
    );

    if (isDefiPrompt) {
      try {
        console.log(
          "Detected DeFi prompt, using specialized DeFi workflow generator"
        );
        // Use our specialized DeFi workflow generator with userId for tracking
        return await generateDefiWorkflow(prompt, userId);
      } catch (defiError) {
        console.error("Error generating DeFi workflow:", defiError);
        // Fall back to standard workflow generation if DeFi generation fails
        console.log("Falling back to standard workflow generation");
      }
    }
    try {
      // Serialize existing workflow for context
      const context =
        existingNodes.length > 0 || existingEdges.length > 0
          ? `
Existing Workflow Context:
Nodes: ${JSON.stringify(
              existingNodes.map((n) => ({
                id: n.id,
                type: n.data.blockType,
                label: n.data.label,
              })),
              null,
              2
            )} 
Edges: ${JSON.stringify(
              existingEdges.map((e) => ({
                source: e.source,
                target: e.target,
              })),
              null,
              2
            )} 

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

  // Updated generateCustomBlock
  async generateCustomBlock(
    prompt: string,
    userId: string
  ): Promise<AICustomBlockData> {
    try {
      const systemPrompt = `
You are an AI assistant that generates custom workflow block definitions in JSON format.
Output a JSON object adhering strictly to this structure:
{
  "name": "Block Name",
  "description": "Detailed description of what the block does.",
  "category": "...", 
  "inputs": [ 
    {
      "name": "input_param_name", 
      "description": "What this input is for.", 
      "dataType": "string" | "number" | "boolean" | "object" | "array" | "any", 
      "required": true, 
      "defaultValue": null 
    },
    ...
  ],
  "outputs": [ 
    {
      "name": "output_param_name",
      "description": "What this output represents.",
      "dataType": "string", 
      "required": true, 
      "defaultValue": null
    },
    ...
  ],
  "configFields": [ 
    {
      "name": "config_field_name",
      "label": "UI Label",
      "type": "string" | "number" | "boolean" | "json" | "select",
      "defaultValue": "default value",
      "options": ["option1", "option2"], 
      "required": false,
      "placeholder": "Placeholder text",
      "description": "Help text for the config field."
    },
    ...
  ],
  "code": "async function execute(inputs, context) { /* JavaScript logic using inputs and context.config.config_field_name */ return { output_param_name: result }; }"
}

Example Input: { "name": "emailAddress", "description": "Recipient's email", "dataType": "string", "required": true }
Example Output: { "name": "sentimentScore", "description": "Sentiment score from -1 to 1", "dataType": "number" }
Example Config: { "name": "threshold", "label": "Threshold", "type": "number", "defaultValue": 0.5, "required": false }

Ensure the output is ONLY the JSON object, without any extra text or markdown formatting.
Base the generated fields (inputs, outputs, configFields, code) on the user's request: "${prompt}"
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

      // Return type now matches AICustomBlockData thanks to schema alignment
      return validationResult.data as AICustomBlockData;
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
      // Log user ID for tracking purposes
      console.log(`Generating content for user: ${userId}`);

      const systemPrompt = `You are a helpful AI assistant. ${context ? `\nContext: ${context}` : ""}`;
      const { text } = await generateText({
        model: this.model,
        system: systemPrompt,
        prompt: prompt,
      });

      // Track content generation for analytics
      try {
        interface PostHogWindow extends Window {
          posthog?: {
            capture: (
              event: string,
              properties: Record<string, unknown>
            ) => void;
          };
        }

        if (
          typeof window !== "undefined" &&
          (window as PostHogWindow).posthog
        ) {
          (window as PostHogWindow).posthog?.capture("content_generated", {
            userId,
            promptLength: prompt.length,
            responseLength: text.length,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (analyticsError) {
        console.warn("Analytics tracking error:", analyticsError);
      }

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
