import type { AIProvider } from "@/lib/ai-provider";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { z } from "zod";
import type { Node, Edge } from "@xyflow/react";
import { BlockType, DataType } from "@zyra/types";
import type {
  AICustomBlockData,
  CustomBlockOutput,
  CustomBlockInput,
  CustomBlockConfigField,
} from "@zyra/types";
import { blockSchemas, BLOCK_CATALOG } from "@zyra/types";
import { NodeCategory } from "@zyra/types";
import { v4 as uuidv4 } from "uuid";

const MODEL_TO_USE = "gpt-4o-mini";

// PostHog analytics interface
declare global {
  interface Window {
    posthog?: {
      capture: (event: string, properties: Record<string, unknown>) => void;
    };
  }
}

/**
 * Enhanced block intelligence interface for AI understanding
 */
interface EnhancedBlockIntelligence {
  blockType: BlockType;
  category: NodeCategory;
  label: string;
  description: string;
  icon: string;
  nodeTypeInferred: "TRIGGER" | "ACTION" | "LOGIC";
  schemaDetails: {
    requiredFields: string[];
    optionalFields: string[];
    fieldTypes: Record<string, string>;
    fieldDescriptions: Record<string, string>;
    enumOptions: Record<string, string[]>;
    defaultValues: Record<string, unknown>;
  };
  useCases: string[];
  configurationExamples: Record<string, unknown>[];
  compatibleWith: BlockType[];
  positioning: {
    preferredX: number;
    preferredY: number;
    flowOrder: number;
  };
}

/**
 * Universal workflow response schema - AI figures out the rest
 */
const WorkflowResponseSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      type: z.string().default("custom"),
      position: z.object({ x: z.number(), y: z.number() }),
      data: z.object({
        blockType: z.nativeEnum(BlockType),
        label: z.string(),
        description: z.string().optional(),
        nodeType: z.enum(["TRIGGER", "ACTION", "LOGIC"]),
        iconName: z.string(),
        isEnabled: z.boolean().default(true),
        config: z.record(z.unknown()).optional(),
        inputs: z.array(z.unknown()).default([]),
        outputs: z.array(z.unknown()).default([]),
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
      type: z.string().default("custom"),
      animated: z.boolean().default(false),
    })
  ),
});

/**
 * Universal custom block schema - AI determines implementation
 */
const CustomBlockResponseSchema = z.object({
  name: z.string(),
  description: z.string(),
  category: z.string(),
  code: z.string(),
  inputs: z
    .array(
      z.object({
        name: z.string(),
        dataType: z.nativeEnum(DataType),
        required: z.boolean().default(false),
        description: z.string().optional(),
        defaultValue: z.unknown().optional(),
      })
    )
    .default([]),
  outputs: z
    .array(
      z.object({
        name: z.string(),
        dataType: z.nativeEnum(DataType),
        description: z.string().optional(),
        required: z.boolean().default(false),
      })
    )
    .default([]),
  configFields: z
    .array(
      z.object({
        name: z.string(),
        label: z.string(),
        type: z.enum(["string", "number", "boolean", "json", "select"]),
        required: z.boolean().default(false),
        description: z.string().optional(),
        defaultValue: z.unknown().optional(),
        options: z.array(z.string()).optional(),
        placeholder: z.string().optional(),
      })
    )
    .default([]),
});

type CustomBlockResponse = z.infer<typeof CustomBlockResponseSchema>;

/**
 * Fully AI-Driven OpenRouter Provider
 * The AI dynamically understands all schemas, types, and configurations
 * No manual intervention or hardcoded rules
 */
export class OpenRouterProvider implements AIProvider {
  private readonly openrouter;

  constructor() {
    this.openrouter = createOpenRouter({
      apiKey: process.env.NEXT_PUBLIC_OPENROUTER_API_KEY ?? "",
      baseURL: "https://openrouter.ai/api/v1",
    });
  }

  /**
   * Analytics tracking with user context
   */
  private trackEvent(
    eventName: string,
    properties: Record<string, unknown>,
    userId?: string
  ): void {
    if (typeof window !== "undefined" && window.posthog) {
      window.posthog.capture(eventName, {
        ...properties,
        userId,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Enhanced block intelligence analyzer - extracts deep schema understanding
   */
  private generateBlockIntelligence(): EnhancedBlockIntelligence[] {
    return Object.entries(blockSchemas).map(([blockTypeStr, schema], index) => {
      const blockType = blockTypeStr.toUpperCase() as BlockType;
      const metadata = BLOCK_CATALOG[blockType];
      const schemaShape = (schema as any)._def?.shape || {};
      const requiredFields: string[] = [];
      const optionalFields: string[] = [];
      const fieldTypes: Record<string, string> = {};
      const fieldDescriptions: Record<string, string> = {};
      const enumOptions: Record<string, string[]> = {};
      const defaultValues: Record<string, unknown> = {};

      // Analyze each field in the schema
      Object.entries(schemaShape).forEach(
        ([fieldName, fieldSchema]: [string, unknown]) => {
          const schema = fieldSchema as {
            _def?: {
              optional?: boolean;
              typeName?: string;
              values?: Set<string>;
              defaultValue?: unknown;
              description?: string;
            };
          };

          const isOptional = schema._def?.optional || false;
          const typeName = schema._def?.typeName || "unknown";
          const description =
            schema._def?.description ||
            this.generateFieldDescription(
              fieldName,
              typeName,
              schema._def?.values
            );

          if (isOptional) {
            optionalFields.push(fieldName);
          } else {
            requiredFields.push(fieldName);
          }

          fieldTypes[fieldName] = typeName;
          fieldDescriptions[fieldName] = description;

          // Extract enum options if available
          if (schema._def?.values) {
            enumOptions[fieldName] = Array.from(
              schema._def.values as Set<string>
            );
          }

          // Extract default values
          if (schema._def?.defaultValue !== undefined) {
            defaultValues[fieldName] = schema._def.defaultValue;
          }
        }
      );

      // Infer node type from category
      const nodeTypeInferred = this.inferNodeType(
        metadata?.category || NodeCategory.ACTION
      );

      // Generate use cases based on schema and metadata
      const useCases = this.generateUseCases(
        blockType,
        schemaShape,
        metadata as any
      );

      // Generate configuration examples based on schema
      const configurationExamples = this.generateConfigExamples(
        blockType,
        schemaShape,
        metadata as any
      );

      // Determine compatible blocks based on node type and category
      const compatibleWith = this.determineCompatibility(
        blockType,
        metadata?.category
      );

      // Calculate intelligent positioning based on node type and flow
      const positioning = this.calculatePositioning(
        blockType,
        nodeTypeInferred,
        index
      );

      return {
        blockType,
        category: metadata?.category || NodeCategory.ACTION,
        label: metadata?.label || blockType,
        description:
          metadata?.description ||
          this.generateBlockDescription(blockType, schemaShape),
        icon: metadata?.icon || this.inferIconName(blockType, nodeTypeInferred),
        nodeTypeInferred,
        schemaDetails: {
          requiredFields,
          optionalFields,
          fieldTypes,
          fieldDescriptions,
          enumOptions,
          defaultValues,
        },
        useCases,
        configurationExamples,
        compatibleWith,
        positioning,
      };
    });
  }

  /**
   * Generate intelligent block description based on schema
   */
  private generateBlockDescription(
    blockType: BlockType,
    schemaShape: Record<string, unknown>
  ): string {
    const fieldNames = Object.keys(schemaShape);
    const primaryFields = fieldNames.slice(0, 3).join(", ");

    return `${blockType} block that ${this.getBlockAction(blockType)} using ${primaryFields}`;
  }

  /**
   * Get block action based on type
   */
  private getBlockAction(blockType: BlockType): string {
    const actions: Record<BlockType, string> = {
      [BlockType.PRICE_MONITOR]: "monitors cryptocurrency prices",
      [BlockType.EMAIL]: "sends email notifications",
      [BlockType.NOTIFICATION]: "sends notifications",
      [BlockType.CONDITION]: "evaluates conditions",
      [BlockType.DELAY]: "adds delays",
      [BlockType.SCHEDULE]: "schedules tasks",
      [BlockType.WEBHOOK]: "triggers webhooks",
      [BlockType.UNKNOWN]: "performs actions",
    };

    return actions[blockType] || "performs actions";
  }

  /**
   * Infer icon name based on block type and node type
   */
  private inferIconName(
    blockType: BlockType,
    nodeType: "TRIGGER" | "ACTION" | "LOGIC"
  ): string {
    // Define icons for core block types
    const iconMap: Partial<Record<BlockType, string>> = {
      [BlockType.PRICE_MONITOR]: "trending-up",
      [BlockType.EMAIL]: "mail",
      [BlockType.NOTIFICATION]: "bell",
      [BlockType.CONDITION]: "code-branch",
      [BlockType.DELAY]: "clock",
      [BlockType.SCHEDULE]: "calendar",
      [BlockType.WEBHOOK]: "webhook",
      [BlockType.CUSTOM]: "puzzle",
      [BlockType.UNKNOWN]: "block",
    };

    return iconMap[blockType] || "block";
  }

  /**
   * Generate use cases based on schema and metadata
   */
  private generateUseCases(
    blockType: BlockType,
    schemaShape: Record<string, unknown>,
    metadata: { useCases?: string[] }
  ): string[] {
    const baseUseCases = this.getBaseUseCases(blockType);
    const schemaUseCases = this.getSchemaUseCases(schemaShape);
    const metadataUseCases = metadata?.useCases || [];

    return [
      ...Array.from(
        new Set([...baseUseCases, ...schemaUseCases, ...metadataUseCases])
      ),
    ];
  }

  /**
   * Get base use cases for block type
   */
  private getBaseUseCases(blockType: BlockType): string[] {
    const useCaseMap: Record<BlockType, string[]> = {
      [BlockType.PRICE_MONITOR]: [
        "Monitor cryptocurrency prices",
        "Set price alerts",
        "Track market movements",
      ],
      [BlockType.EMAIL]: [
        "Send notifications",
        "Share reports",
        "Alert stakeholders",
      ],
      [BlockType.NOTIFICATION]: [
        "Send alerts",
        "Notify users",
        "Broadcast updates",
      ],
      [BlockType.CONDITION]: [
        "Add logic branching",
        "Filter data",
        "Control flow",
      ],
      [BlockType.DELAY]: [
        "Add time delays",
        "Rate limit actions",
        "Schedule intervals",
      ],
      [BlockType.SCHEDULE]: [
        "Schedule tasks",
        "Set recurring jobs",
        "Time-based triggers",
      ],
      [BlockType.WEBHOOK]: [
        "Integrate with services",
        "Receive triggers",
        "Send data",
      ],
      [BlockType.CUSTOM]: [
        "Custom logic",
        "JavaScript code",
        "API integrations",
      ],
      [BlockType.UNKNOWN]: ["Generic block usage"],
    };

    return useCaseMap[blockType] || [];
  }

  /**
   * Get use cases from schema
   */
  private getSchemaUseCases(schemaShape: Record<string, unknown>): string[] {
    const useCases: string[] = [];
    const fields = Object.keys(schemaShape);

    if (fields.includes("asset")) {
      useCases.push("Monitor specific assets");
    }
    if (fields.includes("condition")) {
      useCases.push("Set conditional logic");
    }
    if (fields.includes("interval")) {
      useCases.push("Set time intervals");
    }
    if (fields.includes("url")) {
      useCases.push("Make HTTP requests");
    }

    return useCases;
  }

  /**
   * Generate configuration examples based on schema
   */
  private generateConfigExamples(
    blockType: BlockType,
    schemaShape: Record<string, unknown>,
    metadata: { defaultConfig?: Record<string, unknown> }
  ): Record<string, unknown>[] {
    const baseConfig = metadata?.defaultConfig || {};
    const examples: Record<string, unknown>[] = [baseConfig];

    // Add schema-specific examples
    switch (blockType) {
      case BlockType.PRICE_MONITOR:
        examples.push({
          ...baseConfig,
          asset: "ethereum",
          condition: "below",
          targetPrice: "2000",
          checkInterval: "5",
          dataSource: "coingecko",
        });
        break;
      case BlockType.EMAIL:
        examples.push({
          ...baseConfig,
          to: "alerts@example.com",
          subject: "Price Alert - {{asset}}",
          body: "{{asset}} has reached {{price}}",
          cc: "backup@example.com",
        });
        break;
      case BlockType.NOTIFICATION:
        examples.push({
          ...baseConfig,
          channel: "push",
          title: "Alert - {{asset}}",
          message: "{{asset}} has reached {{price}}",
        });
        break;
      case BlockType.CONDITION:
        examples.push({
          ...baseConfig,
          condition: "price > targetPrice",
          description: "Check if price exceeds target",
        });
        break;
      case BlockType.DELAY:
        examples.push({
          ...baseConfig,
          duration: 5,
          unit: "minutes",
        });
        break;
      case BlockType.SCHEDULE:
        examples.push({
          ...baseConfig,
          interval: "daily",
          time: "09:00",
          timezone: "UTC",
        });
        break;
      case BlockType.WEBHOOK:
        examples.push({
          ...baseConfig,
          url: "https://api.example.com/webhook",
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        break;
    }

    return examples;
  }

  /**
   * Generate a comprehensive system prompt with enhanced block intelligence
   */
  private generateAdvancedSystemPrompt(): string {
    const blockIntelligence = this.generateBlockIntelligence();
    const availableDataTypes = Object.values(DataType);

    return `You are an EXPERT WORKFLOW AI for Zyra automation platform with deep understanding of blockchain, crypto, and automation workflows.

🎯 **CORE MISSION**: Transform ANY natural language into sophisticated, executable workflows by leveraging comprehensive block intelligence.

🧠 **ENHANCED BLOCK INTELLIGENCE**:
${JSON.stringify(blockIntelligence, null, 2)}

📊 **AVAILABLE DATA TYPES**: ${JSON.stringify(availableDataTypes, null, 2)}

🔬 **ADVANCED AI CAPABILITIES**:

1. **SCHEMA MASTERY**: Understand every field, type, validation rule, and relationship
2. **CONTEXT EXTRACTION**: Parse natural language for entities, conditions, actions, and temporal elements
3. **INTELLIGENT CONFIGURATION**: Generate valid configs by analyzing user intent + schema requirements
4. **FLOW OPTIMIZATION**: Create logical execution paths with proper data flow
5. **SMART POSITIONING**: Position nodes based on execution order and visual flow
6. **ERROR PREVENTION**: Validate all configurations against schemas before output

🚀 **WORKFLOW GENERATION INTELLIGENCE**:

**Step 1: Intent Analysis**
- Extract key entities (assets, emails, conditions, times, etc.)
- Identify required actions and triggers
- Understand temporal relationships and dependencies

**Step 2: Block Selection**
- Choose optimal blocks based on intent and use cases
- Consider block compatibility and data flow
- Prioritize efficiency and reliability

**Step 3: Configuration Generation**
- Use schema intelligence to generate valid configs
- Apply extracted parameters from user intent
- Use template variables for dynamic content ({{asset}}, {{price}}, {{timestamp}})
- Fill sensible defaults for unspecified fields

**Step 4: Flow Construction**
- Create logical execution order (TRIGGER → LOGIC → ACTION)
- Generate proper node connections
- Calculate intelligent positioning
- Ensure data flows correctly between nodes

**Step 5: Validation & Optimization**
- Validate all configs against schemas
- Optimize for performance and readability
- Ensure error handling and edge cases

🎯 **OUTPUT SPECIFICATION**:

**Node Structure** (STRICT FORMAT):
{
  "id": "node-{{uuid}}",
  "type": "custom",
  "position": {"x": intelligent_x_based_on_flow_order, "y": intelligent_y_based_on_layout},
  "data": {
    "blockType": "EXACT_ENUM_VALUE_FROM_BlockType",
    "label": "User-friendly name based on context and function",
    "description": "Clear description of what this node does",
    "nodeType": "TRIGGER|ACTION|LOGIC (inferred from block category)",
    "iconName": "kebab-case-icon-name",
    "isEnabled": true,
    "config": {
      /* AI-generated config matching schema exactly */
      /* Use template variables like {{asset}}, {{price}} for dynamic content */
      /* Include all required fields from schema */
      /* Apply intelligent defaults for optional fields */
    },
    "inputs": [],
    "outputs": []
  }
}

**Edge Structure** (STRICT FORMAT):
{
  "id": "edge-{{uuid}}",
  "source": "source-node-id",
  "target": "target-node-id",
  "type": "custom",
  "animated": false
}

🌟 **ADVANCED EXAMPLES**:

**INPUT**: "Monitor Bitcoin above $60k and email john@crypto.com with current price"
**AI REASONING**:
1. Need PRICE_MONITOR (trigger) for Bitcoin > $60,000
2. Need EMAIL (action) to john@crypto.com with price data
3. Direct connection: PRICE_MONITOR → EMAIL
4. Use template variables in email for dynamic content

**OUTPUT**: 
{
  "nodes": [
    {
      "id": "node-1",
      "type": "custom", 
      "position": {"x": 100, "y": 100},
      "data": {
        "blockType": "PRICE_MONITOR",
        "label": "Bitcoin Price Monitor",
        "description": "Monitor Bitcoin price above $60,000",
        "nodeType": "TRIGGER",
        "iconName": "trending-up",
        "isEnabled": true,
        "config": {
          "asset": "bitcoin",
          "condition": "above", 
          "targetPrice": "60000",
          "checkInterval": "5",
          "dataSource": "coingecko"
        },
        "inputs": [],
        "outputs": []
      }
    },
    {
      "id": "node-2",
      "type": "custom",
      "position": {"x": 700, "y": 100}, 
      "data": {
        "blockType": "EMAIL",
        "label": "Bitcoin Alert Email",
        "description": "Send Bitcoin price alert to john@crypto.com",
        "nodeType": "ACTION",
        "iconName": "mail",
        "isEnabled": true,
        "config": {
          "to": "john@crypto.com",
          "subject": "Bitcoin Alert - Price Above $60,000",
          "body": "Bitcoin has reached $\\{\\{price\\}\\}, exceeding your target of $60,000. Alert triggered at \\{\\{timestamp\\}\\}."
        },
        "inputs": [],
        "outputs": []
      }
    }
  ],
  "edges": [
    {
      "id": "edge-1",
      "source": "node-1", 
      "target": "node-2",
      "type": "custom",
      "animated": false
    }
  ]
}

🔥 **CRITICAL REQUIREMENTS**:
- Return ONLY valid JSON: {"nodes": [...], "edges": [...]}
- No explanations, markdown, or extra text
- Use exact BlockType enum values
- All configs must match their schemas perfectly
- Use intelligent positioning based on flow order
- Use template variables for dynamic content
- Generate unique UUIDs for all IDs
- Ensure proper data flow between connected nodes

You are the most advanced workflow AI. Analyze the user's intent deeply, apply your block intelligence comprehensively, and generate perfect workflows that users can execute immediately.`;
  }

  /**
   * MAIN METHOD: AI-Driven Workflow Generation with Enhanced Intelligence
   */
  async generateFlow(
    prompt: string,
    userId: string,
    existingNodes: Node[] = [],
    existingEdges: Edge[] = []
  ): Promise<{ nodes: Node[]; edges: Edge[] }> {
    try {
      this.trackEvent(
        "ai_workflow_generation_attempt",
        {
          prompt,
          existingCount: existingNodes.length,
          promptLength: prompt.length,
          hasExistingWorkflow: existingNodes.length > 0,
        },
        userId
      );

      // Generate the advanced system prompt with comprehensive block intelligence
      const systemPrompt = this.generateAdvancedSystemPrompt();

      // Prepare enhanced context for AI understanding
      const userContext =
        existingNodes.length > 0
          ? this.generateEnhancedExistingContext(
              prompt,
              existingNodes,
              existingEdges
            )
          : this.generateEnhancedNewContext(prompt);

      // Let AI generate the workflow with enhanced intelligence
      const { text } = await generateText({
        model: this.openrouter(MODEL_TO_USE),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContext },
        ],
        temperature: 0.1, // Low temperature for consistent, precise results
        maxTokens: 12000, // Increased for complex workflows
      });

      // Parse and validate AI response
      const parsedResponse = await this.parseAndValidateAIResponse(
        text,
        prompt
      );

      // Enhanced node processing with intelligent validation
      const enhancedNodes = await this.enhanceNodesWithIntelligence(
        parsedResponse.nodes,
        prompt,
        userId
      );

      const enhancedEdges = this.enhanceEdgesWithIntelligence(
        parsedResponse.edges
      );

      // Intelligent workflow merging
      const finalWorkflow = this.mergeWorkflowsIntelligently(
        existingNodes,
        existingEdges,
        enhancedNodes,
        enhancedEdges
      );

      // Final deduplication to ensure absolutely no duplicates
      const deduplicatedWorkflow = this.finalDeduplication(finalWorkflow);

      this.trackEvent(
        "ai_workflow_generation_success",
        {
          prompt,
          totalNodes: deduplicatedWorkflow.nodes.length,
          totalEdges: deduplicatedWorkflow.edges.length,
          aiGeneratedNodes: enhancedNodes.length,
          blockTypes: enhancedNodes.map((n) => n.data.blockType),
          complexityScore:
            this.calculateWorkflowComplexity(deduplicatedWorkflow),
        },
        userId
      );

      return deduplicatedWorkflow;
    } catch (error) {
      console.error("❌ Enhanced AI Workflow Generation Error:", error);
      this.trackEvent(
        "ai_workflow_generation_error",
        {
          prompt,
          error: error instanceof Error ? error.message : String(error),
          errorType: "enhanced_generation",
        },
        userId
      );
      throw error;
    }
  }

  /**
   * Generate enhanced context for existing workflows
   */
  private generateEnhancedExistingContext(
    prompt: string,
    existingNodes: Node[],
    existingEdges: Edge[]
  ): string {
    const workflowAnalysis = this.analyzeExistingWorkflow(
      existingNodes,
      existingEdges
    );

    return `WORKFLOW ENHANCEMENT REQUEST:

**CURRENT WORKFLOW ANALYSIS**:
${JSON.stringify(workflowAnalysis, null, 2)}

**USER ENHANCEMENT REQUEST**: "${prompt}"

**TASK**: Intelligently enhance the existing workflow by:
1. Analyzing current workflow structure and purpose
2. Understanding the enhancement request in context
3. Adding new nodes that integrate seamlessly
4. Optimizing connections and flow logic
5. Maintaining existing functionality while adding new capabilities

Generate additional nodes and edges that extend the current workflow logically.`;
  }

  /**
   * Generate enhanced context for new workflows
   */
  private generateEnhancedNewContext(prompt: string): string {
    return `NEW WORKFLOW CREATION REQUEST:

**USER REQUEST**: "${prompt}"

**TASK**: Create a complete workflow from scratch by:
1. Analyzing the user's intent and extracting key requirements
2. Identifying necessary triggers, logic, and actions
3. Selecting optimal blocks based on use cases and compatibility
4. Generating intelligent configurations with proper parameter extraction
5. Creating logical flow connections with proper positioning
6. Ensuring the workflow is complete and executable

Generate a full workflow that accomplishes the user's automation goal.`;
  }

  /**
   * Parse and validate AI response with enhanced error handling
   */
  private async parseAndValidateAIResponse(
    text: string
  ): Promise<z.infer<typeof WorkflowResponseSchema>> {
    const cleanedText = text.replace(/```json|```/g, "").trim();

    let parsedResponse: unknown;
    try {
      parsedResponse = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error("❌ Enhanced AI JSON Parse Error:", parseError);
      throw new Error(
        "AI generated invalid JSON format. Please rephrase your request or try again."
      );
    }

    const validationResult = WorkflowResponseSchema.safeParse(parsedResponse);
    if (!validationResult.success) {
      console.error(
        "❌ Enhanced AI Validation Failed:",
        validationResult.error
      );

      // Try to auto-repair common issues
      const repairedResponse = await this.attemptAutoRepair(parsedResponse);
      const repairValidation =
        WorkflowResponseSchema.safeParse(repairedResponse);

      if (!repairValidation.success) {
        throw new Error(
          `AI workflow validation failed: ${validationResult.error.message}`
        );
      }

      return repairValidation.data;
    }

    return validationResult.data;
  }

  /**
   * Attempt to auto-repair common AI response issues
   */
  private async attemptAutoRepair(response: unknown): Promise<unknown> {
    // Implementation for auto-repair logic
    // For now, return the original response
    return response;
  }

  /**
   * Analyze existing workflow structure
   */
  private analyzeExistingWorkflow(
    nodes: Node[],
    edges: Edge[]
  ): {
    summary: string;
    blockTypes: BlockType[];
    connections: number;
    triggers: Array<{ id: string; type: BlockType; label: string }>;
    endpoints: Array<{ id: string; type: BlockType; label: string }>;
    hasConditions: boolean;
    complexity: number;
  } {
    const triggers = nodes.filter((n) => n.data.nodeType === "TRIGGER");
    const actions = nodes.filter((n) => n.data.nodeType === "ACTION");
    const logic = nodes.filter((n) => n.data.nodeType === "LOGIC");

    return {
      summary: `Workflow with ${nodes.length} nodes: ${triggers.length} triggers, ${logic.length} logic, ${actions.length} actions`,
      blockTypes: nodes.map((n) => n.data.blockType as BlockType),
      connections: edges.length,
      triggers: triggers.map((n) => ({
        id: n.id,
        type: n.data.blockType as BlockType,
        label: n.data.label as string,
      })),
      endpoints: actions.map((n) => ({
        id: n.id,
        type: n.data.blockType as BlockType,
        label: n.data.label as string,
      })),
      hasConditions: logic.length > 0,
      complexity: this.calculateWorkflowComplexity({ nodes, edges }),
    };
  }

  /**
   * Calculate workflow complexity score
   */
  private calculateWorkflowComplexity(workflow: {
    nodes: Node[];
    edges: Edge[];
  }): number {
    const nodeCount = workflow.nodes.length;
    const edgeCount = workflow.edges.length;
    const branchingFactor = Math.max(1, edgeCount / Math.max(1, nodeCount - 1));

    return Math.round(nodeCount * branchingFactor * 10) / 10;
  }

  /**
   * Enhanced node processing with intelligence
   */
  private async enhanceNodesWithIntelligence(
    nodes: Record<string, unknown>[],
    originalPrompt: string,
    userId: string
  ): Promise<Node[]> {
    const enhancedNodes: Node[] = [];
    const blockIntelligence = this.generateBlockIntelligence();
    const usedIds = new Set<string>(); // Track used IDs to prevent duplicates

    for (const nodeData of nodes) {
      try {
        // Ensure unique node ID
        let nodeId = nodeData.id as string;
        if (!nodeId || usedIds.has(nodeId)) {
          nodeId = `node-${uuidv4()}`;
        }
        usedIds.add(nodeId);

        const rawBlockType =
          nodeData.data?.blockType || nodeData.type || nodeData.blockType;
        const blockType = rawBlockType as BlockType;

        // Get enhanced intelligence for this block
        const intelligence = blockIntelligence.find(
          (bi) => bi.blockType === blockType
        );

        // Enhanced configuration validation and generation
        const validatedConfig = await this.generateIntelligentConfig(
          blockType,
          (nodeData.data as any)?.config ||
            (nodeData.config as Record<string, unknown>),
          originalPrompt,
          intelligence
        );

        // Get metadata for fallback values
        const metadata = BLOCK_CATALOG[blockType];

        enhancedNodes.push({
          id: nodeId,
          type: "custom", // Always use custom for our node component
          position: nodeData.position as { x: number; y: number },
          data: {
            // Core block properties that the UI component expects
            blockType: blockType,
            label:
              (nodeData.data as any)?.label || metadata?.label || blockType,
            description:
              (nodeData.data as any)?.description ||
              metadata?.description ||
              "",
            nodeType:
              intelligence?.nodeTypeInferred || metadata?.category || "ACTION",
            iconName: intelligence?.icon || metadata?.icon || "block",
            isEnabled: true,

            // Configuration
            config: validatedConfig,

            // UI compatibility properties
            inputCount: 1,
            outputCount: 1,
            inputs: true,
            outputs: true,
            status: "idle",
            nodeStatus: "idle",
            isCompleted: false,
            isFailed: false,
            isExecuting: false,
            isActive: false,
          },
        });
      } catch (error) {
        console.error(`❌ Failed to enhance node intelligently:`, error);

        // Generate unique ID for fallback
        const nodeId = `node-${uuidv4()}`;
        usedIds.add(nodeId);

        const blockType = BlockType.UNKNOWN;
        const metadata = BLOCK_CATALOG[blockType];

        enhancedNodes.push({
          id: nodeId,
          type: "custom",
          position: nodeData.position as { x: number; y: number },
          data: {
            blockType: blockType,
            label: "Unknown Block",
            description: "Block could not be processed",
            nodeType: "ACTION",
            iconName: "block",
            isEnabled: true,
            config: {},
            inputCount: 1,
            outputCount: 1,
            inputs: true,
            outputs: true,
            status: "idle",
            nodeStatus: "idle",
            isCompleted: false,
            isFailed: false,
            isExecuting: false,
            isActive: false,
          },
        });
      }
    }

    return enhancedNodes;
  }

  /**
   * Generate intelligent configuration using block intelligence
   */
  private async generateIntelligentConfig(
    blockType: BlockType,
    providedConfig: Record<string, unknown>,
    userPrompt: string,
    intelligence: EnhancedBlockIntelligence | undefined
  ): Promise<Record<string, unknown>> {
    try {
      // If provided config exists and seems complete, validate it
      if (providedConfig && Object.keys(providedConfig).length > 0) {
        const schema = blockSchemas[blockType];
        if (schema) {
          try {
            const validatedConfig = schema.parse(providedConfig);
            return validatedConfig;
          } catch (validationError) {
            console.warn(
              `⚠️ Provided config invalid, regenerating:`,
              validationError
            );
          }
        }
      }

      // Generate intelligent configuration using AI + schema intelligence
      return await this.aiGenerateIntelligentConfig(
        blockType,
        userPrompt,
        intelligence
      );
    } catch (error) {
      console.warn(
        `⚠️ Intelligent config generation failed for ${blockType}:`,
        error
      );

      // Fallback to default config from metadata
      const metadata = BLOCK_CATALOG[blockType];
      return metadata?.defaultConfig || {};
    }
  }

  /**
   * AI-powered intelligent configuration generation
   */
  private async aiGenerateIntelligentConfig(
    blockType: BlockType,
    userPrompt: string,
    intelligence: EnhancedBlockIntelligence | undefined
  ): Promise<Record<string, unknown>> {
    const configPrompt = `Generate an intelligent configuration for ${blockType} block.

**BLOCK INTELLIGENCE**:
${JSON.stringify(intelligence, null, 2)}

**USER CONTEXT**: "${userPrompt}"

**REQUIREMENTS**:
1. Extract all relevant parameters from user context
2. Use schema intelligence to ensure field compliance
3. Apply intelligent defaults for missing values
4. Use template variables for dynamic content ({{asset}}, {{price}}, {{timestamp}})
5. Generate configuration that perfectly matches the schema

**OUTPUT**: Return ONLY the JSON configuration object (no explanations).

**EXAMPLE FOR EMAIL**: {"to": "extracted@email.com", "subject": "Alert - {{asset}}", "body": "Your {{asset}} alert triggered at {{timestamp}}"}`;

    try {
      const { text } = await generateText({
        model: this.openrouter(MODEL_TO_USE),
        messages: [{ role: "user", content: configPrompt }],
        temperature: 0.2,
        maxTokens: 1500,
      });

      const cleanConfig = text.replace(/```json|```/g, "").trim();
      return JSON.parse(cleanConfig);
    } catch (error) {
      console.warn(`⚠️ AI config generation failed:`, error);

      // Fallback to intelligence-based default
      if (
        intelligence?.configurationExamples &&
        intelligence.configurationExamples.length > 0
      ) {
        return intelligence.configurationExamples[0];
      }

      return {};
    }
  }

  /**
   * Enhance edges with intelligence
   */
  private enhanceEdgesWithIntelligence(
    edges: Record<string, unknown>[]
  ): Edge[] {
    const usedIds = new Set<string>(); // Track used IDs to prevent duplicates

    return edges.map((edge) => {
      // Ensure unique edge ID
      let edgeId = edge.id as string;
      if (!edgeId || usedIds.has(edgeId)) {
        edgeId = `edge-${uuidv4()}`;
      }
      usedIds.add(edgeId);

      return {
        id: edgeId,
        source: edge.source as string,
        target: edge.target as string,
        sourceHandle: edge.sourceHandle as string,
        targetHandle: edge.targetHandle as string,
        type: (edge.type as string) || "custom",
        animated: (edge.animated as boolean) || false,
      };
    });
  }

  /**
   * Intelligently merge new workflow with existing workflow
   */
  private mergeWorkflowsIntelligently(
    existingNodes: Node[],
    existingEdges: Edge[],
    newNodes: Node[],
    newEdges: Edge[]
  ): { nodes: Node[]; edges: Edge[] } {
    if (existingNodes.length === 0) {
      return { nodes: newNodes, edges: newEdges };
    }

    // Intelligent positioning adjustment for new nodes
    const adjustedNewNodes = this.adjustPositionsIntelligently(
      newNodes,
      existingNodes
    );

    // Fix edge ID conflicts between existing and new edges
    const allExistingIds = new Set([
      ...existingNodes.map((n) => n.id),
      ...existingEdges.map((e) => e.id),
    ]);

    // Ensure all new edges have unique IDs
    const deduplicatedNewEdges = newEdges.map((edge) => {
      let edgeId = edge.id;
      while (allExistingIds.has(edgeId)) {
        edgeId = `edge-${uuidv4()}`;
      }
      allExistingIds.add(edgeId);

      return {
        ...edge,
        id: edgeId,
      };
    });

    return {
      nodes: [...existingNodes, ...adjustedNewNodes],
      edges: [...existingEdges, ...deduplicatedNewEdges],
    };
  }

  /**
   * Adjust positions of new nodes to avoid overlap
   */
  private adjustPositionsIntelligently(
    newNodes: Node[],
    existingNodes: Node[]
  ): Node[] {
    const occupiedPositions = existingNodes.map((n) => n.position);
    const maxX = Math.max(...occupiedPositions.map((p) => p.x), 0);

    return newNodes.map((node, index) => ({
      ...node,
      position: {
        x: node.position.x + maxX + 200,
        y: node.position.y + index * 50, // Slight vertical offset
      },
    }));
  }

  /**
   * Final deduplication to ensure absolutely no duplicates
   */
  private finalDeduplication(workflow: { nodes: Node[]; edges: Edge[] }): {
    nodes: Node[];
    edges: Edge[];
  } {
    const usedIds = new Set<string>();
    const deduplicatedNodes: Node[] = [];
    const deduplicatedEdges: Edge[] = [];

    workflow.nodes.forEach((node) => {
      if (!usedIds.has(node.id)) {
        usedIds.add(node.id);
        deduplicatedNodes.push(node);
      }
    });

    workflow.edges.forEach((edge) => {
      if (!usedIds.has(edge.id)) {
        usedIds.add(edge.id);
        deduplicatedEdges.push(edge);
      }
    });

    return { nodes: deduplicatedNodes, edges: deduplicatedEdges };
  }

  /**
   * AI-driven custom block generation
   */
  async generateCustomBlock(
    prompt: string,
    userId: string
  ): Promise<AICustomBlockData> {
    try {
      this.trackEvent("ai_custom_block_generation_attempt", { prompt }, userId);

      const systemPrompt = `You are an AI that creates custom workflow blocks for Zyra platform.

Available Data Types: ${JSON.stringify(Object.values(DataType), null, 2)}

Generate a complete custom block definition based on user requirements.

REQUIRED OUTPUT STRUCTURE:
{
  "name": "Block Name",
  "description": "What this block does",
  "category": "Utility|Integration|AI|Data|Analytics|Communication",
  "code": "async function execute(inputs, context) { /* Complete implementation */ return { outputName: result }; }",
  "inputs": [{"name": "input", "dataType": "string", "required": true, "description": "Input description"}],
  "outputs": [{"name": "output", "dataType": "string", "required": true, "description": "Output description"}],
  "configFields": [{"name": "config", "label": "Config Label", "type": "string", "required": false, "description": "Config help"}]
}

Requirements:
1. Analyze user request to understand functionality
2. Design appropriate inputs, outputs, and config fields
3. Implement complete, working JavaScript code
4. Handle errors gracefully
5. Use async/await for any asynchronous operations
6. Access config via context.config.fieldName
7. Return object with named outputs matching the outputs array

Return ONLY the JSON object.`;

      const { text } = await generateText({
        model: this.openrouter(MODEL_TO_USE),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.3,
        maxTokens: 4000,
      });

      const cleanedText = text.replace(/```json|```/g, "").trim();
      const parsedResponse = JSON.parse(cleanedText);

      const validationResult =
        CustomBlockResponseSchema.safeParse(parsedResponse);
      if (!validationResult.success) {
        throw new Error("AI custom block validation failed.");
      }

      const customBlockData = this.mapToAICustomBlockData(
        validationResult.data
      );

      this.trackEvent(
        "ai_custom_block_generation_success",
        {
          prompt,
          blockName: customBlockData.name,
          category: customBlockData.category,
        },
        userId
      );

      return customBlockData;
    } catch (error) {
      console.error("❌ AI Custom Block Generation Error:", error);
      this.trackEvent(
        "ai_custom_block_generation_error",
        {
          prompt,
          error: error instanceof Error ? error.message : String(error),
        },
        userId
      );
      throw error;
    }
  }

  /**
   * Map AI response to required interface
   */
  private mapToAICustomBlockData(
    response: CustomBlockResponse
  ): AICustomBlockData {
    return {
      name: response.name,
      description: response.description,
      category: response.category,
      code: response.code,
      inputs: response.inputs.map((input) => ({
        name: input.name,
        dataType: input.dataType,
        required: input.required,
        description: input.description,
        defaultValue: input.defaultValue,
      })) as CustomBlockInput[],
      outputs: response.outputs.map((output) => ({
        name: output.name,
        dataType: output.dataType,
        required: output.required,
        description: output.description,
      })) as CustomBlockOutput[],
      configFields: response.configFields.map((field) => ({
        name: field.name,
        label: field.label,
        type: field.type,
        required: field.required,
        description: field.description,
        defaultValue: field.defaultValue,
      })) as CustomBlockConfigField[],
    };
  }

  /**
   * AI-driven content generation
   */
  async generateContent(
    prompt: string,
    userId: string,
    context?: string
  ): Promise<string> {
    try {
      this.trackEvent("ai_content_generation_attempt", { prompt }, userId);

      const systemPrompt = context
        ? `You are a helpful AI assistant. Context: ${context}`
        : "You are a helpful AI assistant for the Zyra automation platform.";

      const { text } = await generateText({
        model: this.openrouter(MODEL_TO_USE),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        maxTokens: 2000,
      });

      this.trackEvent(
        "ai_content_generation_success",
        {
          prompt,
          contentLength: text.length,
        },
        userId
      );

      return text;
    } catch (error) {
      console.error("❌ AI Content Generation Error:", error);
      this.trackEvent(
        "ai_content_generation_error",
        {
          prompt,
          error: error instanceof Error ? error.message : String(error),
        },
        userId
      );
      throw error;
    }
  }

  /**
   * Generate field description based on name and type
   */
  private generateFieldDescription(
    fieldName: string,
    typeName: string,
    enumOptions?: Set<string> | string[]
  ): string {
    const descriptions: Record<string, string> = {
      asset: "Cryptocurrency or token symbol (e.g., 'bitcoin', 'ethereum')",
      condition: "Price comparison condition",
      targetPrice: "Target price threshold for monitoring",
      checkInterval: "How often to check the price (in minutes)",
      dataSource: "Price data provider to use",
      to: "Recipient email address",
      subject: "Email subject line",
      body: "Email message content",
      cc: "Carbon copy email address (optional)",
      template: "Email template to use (optional)",
      channel: "Notification delivery method",
      title: "Notification title",
      message: "Notification message content",
      duration: "Time duration for the delay",
      unit: "Time unit for the duration",
      interval: "Scheduling frequency",
      time: "Specific time for scheduled execution",
      cron: "Cron expression for complex scheduling",
      timezone: "Timezone for scheduling",
      url: "HTTP endpoint URL",
      method: "HTTP request method",
      headers: "HTTP headers to include",
      description: "Human-readable description",
    };

    if (descriptions[fieldName]) {
      return descriptions[fieldName];
    }

    if (enumOptions) {
      const options = Array.from(enumOptions);
      return `Choose from: ${options.join(", ")}`;
    }

    return `${fieldName} value (${typeName})`;
  }

  /**
   * Infer node type from category
   */
  private inferNodeType(
    category: NodeCategory
  ): "TRIGGER" | "ACTION" | "LOGIC" {
    switch (category) {
      case NodeCategory.TRIGGER:
        return "TRIGGER";
      case NodeCategory.LOGIC:
        return "LOGIC";
      case NodeCategory.ACTION:
      default:
        return "ACTION";
    }
  }

  /**
   * Determine block compatibility
   */
  private determineCompatibility(
    blockType: BlockType,
    category?: NodeCategory
  ): BlockType[] {
    const triggerBlocks = [
      BlockType.PRICE_MONITOR,
      BlockType.SCHEDULE,
      BlockType.WEBHOOK,
    ];
    const actionBlocks = [BlockType.EMAIL, BlockType.NOTIFICATION];
    const logicBlocks = [BlockType.CONDITION, BlockType.DELAY];

    switch (category) {
      case NodeCategory.TRIGGER:
        return [...logicBlocks, ...actionBlocks];
      case NodeCategory.LOGIC:
        return [...triggerBlocks, ...logicBlocks, ...actionBlocks];
      case NodeCategory.ACTION:
      default:
        return [...triggerBlocks, ...logicBlocks];
    }
  }

  /**
   * Calculate intelligent positioning
   */
  private calculatePositioning(
    blockType: BlockType,
    nodeType: "TRIGGER" | "ACTION" | "LOGIC",
    index: number
  ): { preferredX: number; preferredY: number; flowOrder: number } {
    const baseY = 100 + index * 120;

    switch (nodeType) {
      case "TRIGGER":
        return { preferredX: 100, preferredY: baseY, flowOrder: 1 };
      case "LOGIC":
        return { preferredX: 400, preferredY: baseY, flowOrder: 2 };
      case "ACTION":
        return { preferredX: 700, preferredY: baseY, flowOrder: 3 };
      default:
        return { preferredX: 400, preferredY: baseY, flowOrder: 2 };
    }
  }
}
