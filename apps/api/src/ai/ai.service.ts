import { Injectable } from "@nestjs/common";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// Import types from the types package
import { BlockType, DataType, NodeCategory } from "@zyra/types";

const MODEL_TO_USE = "gpt-4o-mini";

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

interface GenerationOptions {
  detailedMode: boolean;
  prefillConfig: boolean;
  domainHint?: string;
}

const WorkflowResponseSchema = z.object({
  nodes: z.array(
    z.object({
      id: z.string(),
      type: z.string().default("CUSTOM"),
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
      type: z.string().default("CUSTOM"),
      animated: z.boolean().default(false),
    })
  ),
});

@Injectable()
export class AiService {
  private readonly openrouter;

  constructor() {
    this.openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY ?? "",
      baseURL: "https://openrouter.ai/api/v1",
    });
  }

  async generateBlock(prompt: string): Promise<{
    success: boolean;
    block: {
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
    };
  }> {
    try {
      const systemPrompt = `You are an AI that creates CUSTOM workflow blocks for Zzyra platform.

Available Data Types: ${JSON.stringify(Object.values(DataType), null, 2)}

Generate a complete CUSTOM block definition based on user requirements.

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

      return {
        success: true,
        block: parsedResponse,
      };
    } catch (error) {
      console.error("AI Custom Block Generation Error:", error);
      throw new Error("Failed to generate CUSTOM block");
    }
  }

  async generateWorkflow(
    description: string,
    options: GenerationOptions = { detailedMode: true, prefillConfig: true },
    existingNodes: WorkflowNode[] = [],
    existingEdges: WorkflowEdge[] = []
  ): Promise<{ nodes: WorkflowNode[]; edges: WorkflowEdge[] }> {
    try {
      const systemPrompt = this.generateSystemPrompt();

      const userContext =
        existingNodes.length > 0
          ? this.generateExistingContext(
              description,
              existingNodes,
              existingEdges
            )
          : this.generateNewContext(description);

      const { text } = await generateText({
        model: this.openrouter(MODEL_TO_USE),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContext },
        ],
        temperature: 0.1,
        maxTokens: 12000,
      });

      const parsedResponse = await this.parseAndValidateResponse(text);
      const enhancedNodes = this.enhanceNodes(parsedResponse.nodes);
      const enhancedEdges = this.enhanceEdges(parsedResponse.edges);

      const finalWorkflow = this.mergeWorkflows(
        existingNodes,
        existingEdges,
        enhancedNodes,
        enhancedEdges
      );

      return this.deduplicateWorkflow(finalWorkflow);
    } catch (error) {
      console.error("AI Workflow Generation Error:", error);
      throw error;
    }
  }

  async refineWorkflow(
    prompt: string,
    options: {
      preserveConnections?: boolean;
      focusArea?: string;
      intensity?: "light" | "medium" | "heavy";
    } = {},
    nodes: WorkflowNode[],
    edges: WorkflowEdge[]
  ): Promise<{ nodes: WorkflowNode[]; edges: WorkflowEdge[] }> {
    try {
      const systemPrompt = this.generateRefinementSystemPrompt();

      const userContext = `
WORKFLOW REFINEMENT REQUEST:

**CURRENT WORKFLOW**:
Nodes: ${JSON.stringify(nodes, null, 2)}
Edges: ${JSON.stringify(edges, null, 2)}

**REFINEMENT REQUEST**: "${prompt}"
**OPTIONS**: ${JSON.stringify(options, null, 2)}

**TASK**: Refine the existing workflow based on the user's request while maintaining the core functionality.
`;

      const { text } = await generateText({
        model: this.openrouter(MODEL_TO_USE),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContext },
        ],
        temperature: 0.1,
        maxTokens: 12000,
      });

      const parsedResponse = await this.parseAndValidateResponse(text);
      return {
        nodes: this.enhanceNodes(parsedResponse.nodes),
        edges: this.enhanceEdges(parsedResponse.edges),
      };
    } catch (error) {
      console.error("AI Workflow Refinement Error:", error);
      throw error;
    }
  }

  private generateSystemPrompt(): string {
    return `You are an EXPERT WORKFLOW AI for Zzyra automation platform with deep understanding of blockchain, crypto, and automation workflows.

🎯 **CORE MISSION**: Transform ANY natural language into sophisticated, executable workflows using our comprehensive block system.

🔥 **AVAILABLE BLOCK TYPES**:
${JSON.stringify(Object.values(BlockType), null, 2)}

📊 **AVAILABLE DATA TYPES**: 
${JSON.stringify(Object.values(DataType), null, 2)}

🔥 **BLOCK SYSTEM OVERVIEW**:
- **PRICE_MONITOR**: Monitor cryptocurrency prices with conditions
- **EMAIL**: Send email notifications
- **NOTIFICATION**: Send various types of notifications
- **CONDITION**: Add conditional logic and branching
- **DELAY**: Add time delays between actions
- **SCHEDULE**: Schedule recurring tasks
- **WEBHOOK**: Handle webhook integrations
- **HTTP_REQUEST**: Make HTTP calls to external APIs
- **CALCULATOR**: Perform arithmetic calculations
- **COMPARATOR**: Compare values with logical conditions
- **BLOCKCHAIN_READ**: Read blockchain data (balances, transactions)
- **DATABASE_QUERY/WRITE**: Database operations
- **FILE_READ/WRITE**: File system operations
- **TRANSFORMER**: Transform and manipulate data
- **AGGREGATOR**: Aggregate and analyze data
- **LOOP**: Repeat operations with iteration logic
- **HTTP_CALL**: Call external services
- **MESSAGE_SEND**: Send messages via various channels

🎯 **OUTPUT SPECIFICATION**:

**Node Structure** (STRICT FORMAT):
{
  "id": "node-{{uuid}}",
  "type": "CUSTOM",
  "position": {"x": intelligent_x, "y": intelligent_y},
  "data": {
    "blockType": "EXACT_UPPERCASE_ENUM_VALUE",
    "label": "User-friendly descriptive name",
    "description": "Clear description of functionality",
    "nodeType": "TRIGGER|ACTION|LOGIC",
    "iconName": "appropriate-icon-name",
    "isEnabled": true,
    "config": {
      /* Intelligent configuration based on user request */
    },
    "inputs": [],
    "outputs": []
  }
}

**Edge Structure**:
{
  "id": "edge-{{uuid}}",
  "source": "source-node-id",
  "target": "target-node-id",
  "type": "CUSTOM",
  "animated": false
}

**CRITICAL REQUIREMENTS**:
- Return ONLY valid JSON: {"nodes": [...], "edges": [...]}
- Use exact BlockType enum values (UPPERCASE format)
- Generate unique UUIDs for all IDs
- Create intelligent positioning based on flow order
- Generate proper configurations for each block type
- Ensure logical execution flow (TRIGGER → LOGIC → ACTION)

Generate workflows that users can execute immediately.`;
  }

  private generateRefinementSystemPrompt(): string {
    return `You are an EXPERT WORKFLOW REFINEMENT AI for Zzyra automation platform.

Your task is to intelligently refine existing workflows based on user requests while preserving core functionality.

**REFINEMENT CAPABILITIES**:
- Add new nodes and connections
- Modify existing configurations
- Optimize workflow structure
- Enhance error handling
- Improve efficiency

**OUTPUT**: Return the complete refined workflow as JSON with "nodes" and "edges" arrays.`;
  }

  private generateExistingContext(
    prompt: string,
    existingNodes: WorkflowNode[],
    existingEdges: WorkflowEdge[]
  ): string {
    return `WORKFLOW ENHANCEMENT REQUEST:

**CURRENT WORKFLOW**:
Nodes: ${JSON.stringify(existingNodes, null, 2)}
Edges: ${JSON.stringify(existingEdges, null, 2)}

**USER ENHANCEMENT REQUEST**: "${prompt}"

**TASK**: Enhance the existing workflow by adding new functionality while maintaining existing capabilities.`;
  }

  private generateNewContext(prompt: string): string {
    return `NEW WORKFLOW CREATION REQUEST:

**USER REQUEST**: "${prompt}"

**TASK**: Create a complete workflow from scratch that accomplishes the user's automation goal.`;
  }

  private async parseAndValidateResponse(
    text: string
  ): Promise<z.infer<typeof WorkflowResponseSchema>> {
    const cleanedText = text.replace(/```json|```/g, "").trim();

    let parsedResponse: unknown;
    try {
      parsedResponse = JSON.parse(cleanedText);
    } catch (parseError) {
      throw new Error("AI generated invalid JSON format");
    }

    const validationResult = WorkflowResponseSchema.safeParse(parsedResponse);
    if (!validationResult.success) {
      throw new Error(
        `AI workflow validation failed: ${validationResult.error.message}`
      );
    }

    return validationResult.data;
  }

  private enhanceNodes(nodes: Record<string, unknown>[]): WorkflowNode[] {
    return nodes.map((nodeData) => {
      const nodeId = (nodeData.id as string) || `node-${uuidv4()}`;

      return {
        id: nodeId,
        type: "CUSTOM",
        position: nodeData.position as { x: number; y: number },
        data: {
          blockType: (nodeData.data as any)?.blockType,
          label: (nodeData.data as any)?.label,
          description: (nodeData.data as any)?.description || "",
          nodeType: (nodeData.data as any)?.nodeType || "ACTION",
          iconName: (nodeData.data as any)?.iconName || "block",
          isEnabled: true,
          config: (nodeData.data as any)?.config || {},
          inputs: [],
          outputs: [],
          inputCount: 1,
          outputCount: 1,
          status: "idle",
          nodeStatus: "idle",
          isCompleted: false,
          isFailed: false,
          isExecuting: false,
          isActive: false,
        },
      };
    });
  }

  private enhanceEdges(edges: Record<string, unknown>[]): WorkflowEdge[] {
    return edges.map((edge) => ({
      id: (edge.id as string) || `edge-${uuidv4()}`,
      source: edge.source as string,
      target: edge.target as string,
      sourceHandle: edge.sourceHandle as string,
      targetHandle: edge.targetHandle as string,
      type: (edge.type as string) || "CUSTOM",
      animated: (edge.animated as boolean) || false,
    }));
  }

  private mergeWorkflows(
    existingNodes: WorkflowNode[],
    existingEdges: WorkflowEdge[],
    newNodes: WorkflowNode[],
    newEdges: WorkflowEdge[]
  ): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
    if (existingNodes.length === 0) {
      return { nodes: newNodes, edges: newEdges };
    }

    // Adjust positions to avoid overlap
    const maxX = Math.max(...existingNodes.map((n) => n.position.x), 0);
    const adjustedNewNodes = newNodes.map((node, index) => ({
      ...node,
      position: {
        x: node.position.x + maxX + 200,
        y: node.position.y + index * 50,
      },
    }));

    return {
      nodes: [...existingNodes, ...adjustedNewNodes],
      edges: [...existingEdges, ...newEdges],
    };
  }

  private deduplicateWorkflow(workflow: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  }): {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  } {
    const usedIds = new Set<string>();
    const deduplicatedNodes: WorkflowNode[] = [];
    const deduplicatedEdges: WorkflowEdge[] = [];

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
}
