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
        config: z.record(z.string(), z.unknown()).optional(),
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
      const systemPrompt = `You are an EXPERT CUSTOM BLOCK GENERATOR for Zyra automation platform.

🎯 **MISSION**: Generate custom blocks based on user requirements.

📊 **AVAILABLE DATA TYPES**: 
${JSON.stringify(Object.values(DataType), null, 2)}

🎯 **OUTPUT FORMAT** (STRICT JSON):
{
  "name": "Descriptive block name",
  "description": "Clear description of functionality",
  "category": "utility|integration|ai|data|analytics|communication",
  "code": "async function execute(inputs) { /* implementation */ }",
  "inputs": [
    {
      "name": "inputName",
      "dataType": "string|number|boolean|object|array",
      "required": true,
      "description": "Input description",
      "defaultValue": "default value"
    }
  ],
  "outputs": [
    {
      "name": "outputName", 
      "dataType": "string|number|boolean|object|array",
      "required": true,
      "description": "Output description"
    }
  ],
  "configFields": [
    {
      "name": "configName",
      "label": "Display Label",
      "type": "string|number|boolean|select",
      "required": false,
      "description": "Configuration description",
      "defaultValue": "default value"
    }
  ]
}

Return ONLY the JSON object with no additional text, explanations, or formatting.`;

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
    return `You are an EXPERT WORKFLOW AI for Zyra automation platform with deep understanding of blockchain, crypto, and automation workflows.

🎯 **CORE MISSION**: Transform ANY natural language into sophisticated, executable workflows using our comprehensive block system.

🔥 **AVAILABLE BLOCK TYPES**:
${JSON.stringify(Object.values(BlockType), null, 2)}

📊 **AVAILABLE DATA TYPES**: 
${JSON.stringify(Object.values(DataType), null, 2)}

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
    return `You are an EXPERT WORKFLOW REFINEMENT AI for Zyra automation platform.

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
    description: string,
    existingNodes: WorkflowNode[],
    existingEdges: WorkflowEdge[]
  ): string {
    return `WORKFLOW ENHANCEMENT REQUEST:

**CURRENT WORKFLOW**:
Nodes: ${JSON.stringify(existingNodes, null, 2)}
Edges: ${JSON.stringify(existingEdges, null, 2)}

**USER ENHANCEMENT REQUEST**: "${description}"

**TASK**: Enhance the existing workflow by adding new functionality while maintaining existing capabilities.`;
  }

  private generateNewContext(prompt: string): string {
    return `NEW WORKFLOW CREATION REQUEST:

**USER REQUEST**: "${prompt}"

**TASK**: Create a complete workflow from scratch that accomplishes the user's automation goal.`;
  }

  private async parseAndValidateResponse(
    text: string
  ): Promise<{ nodes: WorkflowNode[]; edges: WorkflowEdge[] }> {
    try {
      const cleanedText = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleanedText);
      return WorkflowResponseSchema.parse(parsed);
    } catch (error) {
      console.error("Failed to parse AI response:", error);
      throw new Error("Invalid workflow format generated by AI");
    }
  }

  private enhanceNodes(nodes: any[]): WorkflowNode[] {
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

  private enhanceEdges(edges: any[]): WorkflowEdge[] {
    return edges.map((edgeData) => {
      const edgeId = (edgeData.id as string) || `edge-${uuidv4()}`;

      return {
        id: edgeId,
        source: edgeData.source as string,
        target: edgeData.target as string,
        sourceHandle: edgeData.sourceHandle as string,
        targetHandle: edgeData.targetHandle as string,
        type: "CUSTOM",
        animated: false,
      };
    });
  }

  private mergeWorkflows(
    existingNodes: WorkflowNode[],
    existingEdges: WorkflowEdge[],
    newNodes: WorkflowNode[],
    newEdges: WorkflowEdge[]
  ): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
    // Simple merge - in a real implementation, you'd want more sophisticated merging logic
    const mergedNodes = [...existingNodes, ...newNodes];
    const mergedEdges = [...existingEdges, ...newEdges];

    return { nodes: mergedNodes, edges: mergedEdges };
  }

  private deduplicateWorkflow(workflow: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  }): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
    // Remove duplicate nodes and edges
    const uniqueNodes = workflow.nodes.filter(
      (node, index, self) => index === self.findIndex((n) => n.id === node.id)
    );
    const uniqueEdges = workflow.edges.filter(
      (edge, index, self) => index === self.findIndex((e) => e.id === edge.id)
    );

    return { nodes: uniqueNodes, edges: uniqueEdges };
  }
}
