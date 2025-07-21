import { Injectable, Logger } from "@nestjs/common";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateText } from "ai";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

// Import types from the types package
import { BlockType, DataType } from "@zyra/types";

// Import new services
import { WorkflowValidatorService } from "./services/workflow-validator.service";
import { SecurityService } from "./services/security.service";
import { AuditService } from "./services/audit.service";
import {
  WorkflowVersioningService,
  type RollbackResult,
} from "./services/workflow-versioning.service";
import {
  type AuditEvent,
  type GenerationMetrics,
} from "./services/audit.service";

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

interface GenerationMetadata {
  ipAddress?: string;
  userAgent?: string;
  workflowId?: string;
  createVersion?: boolean;
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
export class EnhancedAiService {
  private readonly logger = new Logger(EnhancedAiService.name);
  private readonly openrouter;

  constructor(
    private workflowValidator: WorkflowValidatorService,
    private securityService: SecurityService,
    private auditService: AuditService,
    private versioningService: WorkflowVersioningService
  ) {
    this.openrouter = createOpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY ?? "",
      baseURL: "https://openrouter.ai/api/v1",
    });
  }

  /**
   * Enhanced block generation with security, validation, and audit logging
   */
  async generateBlock(
    prompt: string,
    userId: string,
    sessionId: string,
    metadata?: GenerationMetadata
  ): Promise<{
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
    validationResult?: unknown;
    securityResult?: unknown;
  }> {
    const startTime = Date.now();

    try {
      // Step 1: Security validation of input prompt
      const securityValidation =
        this.securityService.sanitizePromptInput(prompt);
      if (!securityValidation.isSecure) {
        await this.auditService.logSecurityViolation(
          userId,
          {
            type: "prompt_injection",
            severity: "high",
            description: "Insecure prompt detected in block generation",
            input: prompt,
            context: "block_generation",
          },
          {
            sessionId,
            ipAddress: metadata?.ipAddress,
            userAgent: metadata?.userAgent,
          }
        );

        throw new Error(
          "Security validation failed: prompt contains unsafe content"
        );
      }

      const sanitizedPrompt = securityValidation.sanitizedInput || prompt;

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

      // Step 2: Generate block with LLM
      const { text } = await generateText({
        model: this.openrouter(MODEL_TO_USE),
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: sanitizedPrompt },
        ],
        temperature: 0.3,
        maxTokens: 4000,
      });

      const cleanedText = text.replace(/```json|```/g, "").trim();
      const parsedResponse = JSON.parse(cleanedText);

      // Step 3: Security analysis of generated code
      const codeSecurityResult = this.securityService.analyzeCodeSecurity(
        parsedResponse.code || ""
      );

      if (!codeSecurityResult.isSafe) {
        await this.auditService.logSecurityViolation(
          userId,
          {
            type: "code_injection",
            severity: "high",
            description: "Generated code contains security vulnerabilities",
            context: "block_generation",
          },
          {
            sessionId,
            ipAddress: metadata?.ipAddress,
            userAgent: metadata?.userAgent,
          }
        );

        // Use sanitized code if available
        if (codeSecurityResult.sanitizedCode) {
          parsedResponse.code = codeSecurityResult.sanitizedCode;
        }
      }

      const processingTime = Date.now() - startTime;

      // Step 4: Audit logging
      await this.auditService.logUserAction(
        userId,
        "generate_block",
        "custom_block",
        {
          prompt: sanitizedPrompt,
          generatedBlock: {
            name: parsedResponse.name,
            category: parsedResponse.category,
            hasCode: !!parsedResponse.code,
          },
          processingTime,
          securityIssues: codeSecurityResult.issues?.length || 0,
        },
        {
          sessionId,
          ipAddress: metadata?.ipAddress,
          userAgent: metadata?.userAgent,
          outcome: "success",
        }
      );

      return {
        success: true,
        block: parsedResponse,
        securityResult: codeSecurityResult,
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logger.error("AI Custom Block Generation Error:", error);

      // Audit failed generation
      await this.auditService.logUserAction(
        userId,
        "generate_block",
        "custom_block",
        {
          prompt,
          processingTime,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        {
          sessionId,
          ipAddress: metadata?.ipAddress,
          userAgent: metadata?.userAgent,
          outcome: "failure",
        }
      );

      throw new Error("Failed to generate CUSTOM block");
    }
  }

  /**
   * Enhanced workflow generation with comprehensive validation, versioning, and monitoring
   */
  async generateWorkflow(
    description: string,
    userId: string,
    sessionId: string,
    options: GenerationOptions = { detailedMode: true, prefillConfig: true },
    existingNodes: WorkflowNode[] = [],
    existingEdges: WorkflowEdge[] = [],
    metadata?: GenerationMetadata
  ): Promise<{
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    validationResult?: unknown;
    versionInfo?: unknown;
    metrics?: unknown;
  }> {
    const startTime = Date.now();

    try {
      // Step 1: Security validation of input
      const securityValidation =
        this.securityService.sanitizePromptInput(description);
      if (!securityValidation.isSecure) {
        await this.auditService.logSecurityViolation(
          userId,
          {
            type: "prompt_injection",
            severity: "high",
            description: "Insecure prompt detected in workflow generation",
            input: description,
            context: "workflow_generation",
          },
          {
            sessionId,
            ipAddress: metadata?.ipAddress,
            userAgent: metadata?.userAgent,
          }
        );

        // Use sanitized input but log the security issue
        description = securityValidation.sanitizedInput || description;
      }

      this.logger.log(
        `Generating workflow for user ${userId}: ${description.substring(0, 100)}...`
      );

      // Step 2: Generate workflow with LLM
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

      const preliminaryWorkflow = this.mergeWorkflows(
        existingNodes,
        existingEdges,
        enhancedNodes,
        enhancedEdges
      );

      const finalWorkflow = this.deduplicateWorkflow(preliminaryWorkflow);

      // Step 3: Comprehensive validation with auto-healing
      const validationResult = await this.workflowValidator.validateWorkflow(
        finalWorkflow.nodes,
        finalWorkflow.edges,
        { autoHeal: true, strictMode: false }
      );

      // Use healed workflow if available and valid
      let resultWorkflow = finalWorkflow;
      if (validationResult.correctedWorkflow && validationResult.isValid) {
        resultWorkflow = validationResult.correctedWorkflow;
        this.logger.log(`Applied auto-healing corrections to workflow`);
      }

      // Step 4: Create version if requested
      let versionInfo;
      if (metadata?.workflowId && metadata?.createVersion) {
        try {
          versionInfo = await this.versioningService.createVersion(
            metadata.workflowId,
            resultWorkflow.nodes,
            resultWorkflow.edges,
            {
              createdBy: userId,
              name: `Generated from: ${description.substring(0, 50)}...`,
              generationPrompt: description,
              generationOptions: options as unknown as Record<string, unknown>,
              validationResult,
            }
          );
        } catch (versionError) {
          this.logger.warn("Failed to create workflow version:", versionError);
        }
      }

      const processingTime = Date.now() - startTime;

      // Step 5: Audit logging
      await this.auditService.logWorkflowGeneration(
        userId,
        sessionId,
        {
          description,
          options: options as unknown as Record<string, unknown>,
          existingNodes,
          existingEdges,
        },
        {
          nodes: resultWorkflow.nodes,
          edges: resultWorkflow.edges,
          validationResult,
          processingTime,
          model: MODEL_TO_USE,
        },
        {
          ipAddress: metadata?.ipAddress,
          userAgent: metadata?.userAgent,
          outcome: validationResult.isValid ? "success" : "partial",
          errors: validationResult.errors,
        }
      );

      return {
        ...resultWorkflow,
        validationResult,
        versionInfo,
        metrics: {
          processingTime,
          validationErrors: validationResult.errors.length,
          validationWarnings: validationResult.warnings.length,
          autoCorrections: validationResult.correctedWorkflow ? 1 : 0,
        },
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logger.error("AI Workflow Generation Error:", error);

      // Audit failed generation
      await this.auditService.logWorkflowGeneration(
        userId,
        sessionId,
        {
          description,
          options: options as unknown as Record<string, unknown>,
          existingNodes,
          existingEdges,
        },
        {
          nodes: [],
          edges: [],
          processingTime,
          model: MODEL_TO_USE,
        },
        {
          ipAddress: metadata?.ipAddress,
          userAgent: metadata?.userAgent,
          outcome: "failure",
          errors: [error instanceof Error ? error.message : "Unknown error"],
        }
      );

      throw error;
    }
  }

  /**
   * Enhanced workflow refinement with validation and audit
   */
  async refineWorkflow(
    prompt: string,
    userId: string,
    sessionId: string,
    options: {
      preserveConnections?: boolean;
      focusArea?: string;
      intensity?: "light" | "medium" | "heavy";
    } = {},
    nodes: WorkflowNode[],
    edges: WorkflowEdge[],
    metadata?: GenerationMetadata
  ): Promise<{
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
    validationResult?: unknown;
    metrics?: unknown;
  }> {
    const startTime = Date.now();

    try {
      // Security validation
      const securityValidation =
        this.securityService.sanitizePromptInput(prompt);
      if (!securityValidation.isSecure) {
        await this.auditService.logSecurityViolation(
          userId,
          {
            type: "prompt_injection",
            severity: "medium",
            description: "Insecure prompt detected in workflow refinement",
            input: prompt,
            context: "workflow_refinement",
          },
          {
            sessionId,
            ipAddress: metadata?.ipAddress,
            userAgent: metadata?.userAgent,
          }
        );

        prompt = securityValidation.sanitizedInput || prompt;
      }

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
      const enhancedNodes = this.enhanceNodes(parsedResponse.nodes);
      const enhancedEdges = this.enhanceEdges(parsedResponse.edges);

      // Validate refined workflow
      const validationResult = await this.workflowValidator.validateWorkflow(
        enhancedNodes,
        enhancedEdges,
        { autoHeal: true, strictMode: false }
      );

      const finalNodes =
        validationResult.correctedWorkflow?.nodes || enhancedNodes;
      const finalEdges =
        validationResult.correctedWorkflow?.edges || enhancedEdges;

      const processingTime = Date.now() - startTime;

      // Audit the refinement
      await this.auditService.logUserAction(
        userId,
        "refine_workflow",
        "workflow",
        {
          prompt,
          options: options as unknown as Record<string, unknown>,
          originalNodeCount: nodes.length,
          originalEdgeCount: edges.length,
          refinedNodeCount: finalNodes.length,
          refinedEdgeCount: finalEdges.length,
          processingTime,
          validationErrors: validationResult.errors.length,
        },
        {
          sessionId,
          ipAddress: metadata?.ipAddress,
          userAgent: metadata?.userAgent,
          outcome: validationResult.isValid ? "success" : "partial",
        }
      );

      return {
        nodes: finalNodes,
        edges: finalEdges,
        validationResult,
        metrics: {
          processingTime,
          validationErrors: validationResult.errors.length,
          validationWarnings: validationResult.warnings.length,
          autoCorrections: validationResult.correctedWorkflow ? 1 : 0,
        },
      };
    } catch (error) {
      const processingTime = Date.now() - startTime;

      this.logger.error("AI Workflow Refinement Error:", error);

      await this.auditService.logUserAction(
        userId,
        "refine_workflow",
        "workflow",
        {
          prompt,
          processingTime,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        {
          sessionId,
          ipAddress: metadata?.ipAddress,
          userAgent: metadata?.userAgent,
          outcome: "failure",
        }
      );

      throw error;
    }
  }

  /**
   * Get comprehensive analytics and metrics
   */
  async getAnalytics(
    userId: string,
    timeRange?: { start: Date; end: Date }
  ): Promise<{
    metrics: GenerationMetrics;
    userActivity: {
      totalEvents: number;
      recentEvents: Array<{
        id: string;
        eventType: string;
        timestamp: Date;
        outcome: string;
      }>;
    };
    security?: {
      summary: {
        totalViolations: number;
        criticalViolations: number;
        highRiskViolations: number;
      };
      recommendations: string[];
    };
  }> {
    const [metrics, userAuditTrail, securityReport] = await Promise.all([
      this.auditService.getMetrics(timeRange),
      this.auditService.getUserAuditTrail(userId, {
        startDate: timeRange?.start,
        endDate: timeRange?.end,
        limit: 100,
      }),
      timeRange ? this.auditService.getSecurityReport(timeRange) : null,
    ]);

    return {
      metrics,
      userActivity: {
        totalEvents: userAuditTrail.length,
        recentEvents: userAuditTrail.slice(0, 10).map((event) => ({
          id: event.eventId,
          eventType: event.eventType,
          timestamp: event.timestamp,
          outcome: event.outcome,
        })),
      },
      security: securityReport || undefined,
    };
  }

  /**
   * Rollback workflow to previous version
   */
  async rollbackWorkflow(
    workflowId: string,
    targetVersionId: string,
    userId: string,
    reason?: string
  ): Promise<RollbackResult> {
    return this.versioningService.rollback(workflowId, targetVersionId, {
      performedBy: userId,
      reason,
      createBackup: true,
    });
  }

  // Private methods (keeping existing implementations)
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
      this.logger.error("Failed to parse AI response:", error);
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
      };
    });
  }

  private mergeWorkflows(
    existingNodes: WorkflowNode[],
    existingEdges: WorkflowEdge[],
    newNodes: WorkflowNode[],
    newEdges: WorkflowEdge[]
  ): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
    return {
      nodes: [...existingNodes, ...newNodes],
      edges: [...existingEdges, ...newEdges],
    };
  }

  private deduplicateWorkflow(workflow: {
    nodes: WorkflowNode[];
    edges: WorkflowEdge[];
  }): { nodes: WorkflowNode[]; edges: WorkflowEdge[] } {
    const uniqueNodes = workflow.nodes.filter(
      (node, index, self) => index === self.findIndex((n) => n.id === node.id)
    );
    const uniqueEdges = workflow.edges.filter(
      (edge, index, self) => index === self.findIndex((e) => e.id === edge.id)
    );

    return { nodes: uniqueNodes, edges: uniqueEdges };
  }
}
