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
  userLevel?: "beginner" | "intermediate" | "advanced";
  enableSecurity?: boolean;
  enableValidation?: boolean;
  autoHeal?: boolean;
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

      // Step 2: Generate workflow with LLM (using generation options)
      const systemPrompt = await this.generateSystemPrompt(options);
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
      const enhancedNodes = this.enhanceNodes(parsedResponse.nodes, options);
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

      // Convert refinement options to generation options for system prompt
      const generationOptions: GenerationOptions = {
        detailedMode: true,
        prefillConfig: true,
        userLevel: "intermediate", // Default for refinement
        enableSecurity: true,
        enableValidation: true,
        autoHeal: true,
      };

      const systemPrompt =
        await this.generateRefinementSystemPrompt(generationOptions);

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
      const enhancedNodes = this.enhanceNodes(
        parsedResponse.nodes,
        generationOptions
      );
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

  // MCP Integration Methods
  /**
   * Get available MCP servers (following ai-agent pattern)
   */
  private async getAvailableMCPServers(): Promise<any[]> {
    return Object.values(defaultMCPs);
  }

  /**
   * Get MCP servers organized by category (following ai-agent pattern)
   */
  private async getMCPServersByCategory(): Promise<Record<string, any[]>> {
    const servers = await this.getAvailableMCPServers();
    const categories: Record<string, any[]> = {};

    servers.forEach((server) => {
      if (!categories[server.category]) {
        categories[server.category] = [];
      }
      categories[server.category].push(server);
    });

    return categories;
  }

  /**
   * Generate complete tools context with actual MCP server configurations
   */
  private async generateAvailableToolsContext(): Promise<string> {
    const mcpServers = await this.getAvailableMCPServers();
    const categories = await this.getMCPServersByCategory();

    // Include GOAT SDK tools for blockchain operations
    const goatTools = this.getAvailableGoatTools();

    const toolsContext = {
      totalServers: mcpServers.length,
      totalGoatTools: goatTools.length,
      availableMCPServers: mcpServers.map((server) => ({
        id: server.id,
        name: server.displayName,
        description: server.description,
        category: server.category,
        capabilities: this.extractCapabilitiesFromMCP(server),
        configSchema: server.configSchema,
        examples: server.examples || [],
        // Provide the exact structure needed for selectedTools
        selectedToolFormat: {
          id: server.id,
          name: server.displayName,
          type: "mcp",
          config: this.generateDefaultConfigForServer(server),
          description: server.description,
          category: server.category,
          enabled: true,
        },
      })),
      availableGoatTools: goatTools.map((tool) => ({
        id: tool.id,
        name: tool.name,
        description: tool.description,
        category: tool.category,
        capabilities: tool.capabilities,
        network: tool.network,
        // Provide the exact structure needed for selectedTools
        selectedToolFormat: {
          id: tool.id,
          name: tool.name,
          type: "goat",
          config: {},
          description: tool.description,
          category: tool.category,
          enabled: true,
        },
      })),
      categories: [
        ...Object.keys(categories).map((categoryName) => ({
          name: categoryName,
          description: `${categoryName} tools and integrations`,
          servers: categories[categoryName].map((server) => server.id),
          type: "mcp",
        })),
        {
          name: "Blockchain & DeFi",
          description: "GOAT SDK blockchain and DeFi tools",
          tools: goatTools
            .filter((t) => t.category === "blockchain" || t.category === "defi")
            .map((t) => t.id),
          type: "goat",
        },
        {
          name: "Token Operations",
          description: "GOAT SDK ERC-20 and token management tools",
          tools: goatTools
            .filter((t) => t.category === "erc20")
            .map((t) => t.id),
          type: "goat",
        },
        {
          name: "Analytics & Monitoring",
          description: "GOAT SDK analytics and monitoring tools",
          tools: goatTools
            .filter((t) => t.category === "analytics")
            .map((t) => t.id),
          type: "goat",
        },
      ],
      availableBlockTypes: Object.values(BlockType),
      summary:
        this.generateToolsSummary(mcpServers) +
        this.generateGoatToolsSummary(goatTools),
    };

    return JSON.stringify(toolsContext, null, 2);
  }

  /**
   * Get available GOAT SDK tools with their configurations
   */
  private getAvailableGoatTools(): Array<{
    id: string;
    name: string;
    description: string;
    category: string;
    capabilities: string[];
    network: string;
  }> {
    return [
      // Sei Network Tools
      {
        id: "enhanced-transaction-history-get_transaction_history_sei-testnet",
        name: "get_transaction_history_sei_testnet",
        description:
          "Get transaction history for Sei testnet addresses with enhanced filtering",
        category: "analytics",
        capabilities: ["transaction-history", "filtering", "pagination"],
        network: "sei-testnet",
      },
      {
        id: "enhanced-transaction-history-get_wallet_balance_detailed_sei-testnet",
        name: "get_wallet_balance_detailed_sei_testnet",
        description:
          "Get detailed wallet balance including native tokens and ERC-20 tokens on Sei",
        category: "blockchain",
        capabilities: ["balance-check", "token-info", "multi-token"],
        network: "sei-testnet",
      },
      {
        id: "enhanced-transaction-history-estimate_gas_price_sei-testnet",
        name: "estimate_gas_price_sei_testnet",
        description: "Estimate current gas prices for Sei network transactions",
        category: "blockchain",
        capabilities: ["gas-estimation", "network-fees"],
        network: "sei-testnet",
      },

      // DeFi Analytics Tools
      {
        id: "defi-analytics-analyze_portfolio_sei-testnet",
        name: "analyze_portfolio_sei_testnet",
        description: "Analyze DeFi portfolio performance and positions",
        category: "defi",
        capabilities: ["portfolio-analysis", "yield-tracking", "performance"],
        network: "sei-testnet",
      },
      {
        id: "defi-analytics-find_arbitrage_opportunities_sei-testnet",
        name: "find_arbitrage_opportunities_sei_testnet",
        description: "Find arbitrage opportunities across different DEXs",
        category: "defi",
        capabilities: ["arbitrage", "dex-analysis", "profit-detection"],
        network: "sei-testnet",
      },

      // Base Sepolia Tools
      {
        id: "enhanced-transaction-history-get_transaction_history_base-sepolia",
        name: "get_transaction_history_base_sepolia",
        description: "Get transaction history for Base Sepolia addresses",
        category: "analytics",
        capabilities: ["transaction-history", "filtering", "pagination"],
        network: "base-sepolia",
      },
      {
        id: "enhanced-transaction-history-get_wallet_balance_detailed_base-sepolia",
        name: "get_wallet_balance_detailed_base_sepolia",
        description: "Get detailed wallet balance on Base Sepolia network",
        category: "blockchain",
        capabilities: ["balance-check", "token-info", "multi-token"],
        network: "base-sepolia",
      },

      // ERC-20 Tools (Base Sepolia)
      {
        id: "erc20-get_balance_base-sepolia",
        name: "get_balance_base_sepolia",
        description: "Get ERC-20 token balance on Base Sepolia",
        category: "erc20",
        capabilities: ["token-balance", "erc20"],
        network: "base-sepolia",
      },
      {
        id: "erc20-transfer_base-sepolia",
        name: "transfer_base_sepolia",
        description: "Transfer ERC-20 tokens on Base Sepolia",
        category: "erc20",
        capabilities: ["token-transfer", "erc20", "transaction"],
        network: "base-sepolia",
      },

      // Uniswap Tools (Base Sepolia)
      {
        id: "uniswap-swap_base-sepolia",
        name: "swap_base_sepolia",
        description: "Swap tokens using Uniswap on Base Sepolia",
        category: "defi",
        capabilities: ["token-swap", "uniswap", "defi"],
        network: "base-sepolia",
      },
      {
        id: "uniswap-get_quote_base-sepolia",
        name: "get_quote_base_sepolia",
        description: "Get swap quote from Uniswap on Base Sepolia",
        category: "defi",
        capabilities: ["price-quote", "uniswap", "defi"],
        network: "base-sepolia",
      },

      // Ethereum Mainnet Tools
      {
        id: "erc20-get_balance_ethereum",
        name: "get_balance_ethereum",
        description: "Get ERC-20 token balance on Ethereum mainnet",
        category: "erc20",
        capabilities: ["token-balance", "erc20"],
        network: "ethereum",
      },
      {
        id: "uniswap-swap_ethereum",
        name: "swap_ethereum",
        description: "Swap tokens using Uniswap on Ethereum mainnet",
        category: "defi",
        capabilities: ["token-swap", "uniswap", "defi"],
        network: "ethereum",
      },
    ];
  }

  /**
   * Generate summary of available GOAT tools
   */
  private generateGoatToolsSummary(tools: any[]): string {
    const networkCounts = tools.reduce(
      (acc, tool) => {
        acc[tool.network] = (acc[tool.network] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const categoryCounts = tools.reduce(
      (acc, tool) => {
        acc[tool.category] = (acc[tool.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return `

🔗 **GOAT SDK BLOCKCHAIN TOOLS** (${tools.length} total):
- **Networks**: ${Object.entries(networkCounts)
      .map(([network, count]) => `${network} (${count} tools)`)
      .join(", ")}
- **Categories**: ${Object.entries(categoryCounts)
      .map(([cat, count]) => `${cat} (${count} tools)`)
      .join(", ")}

💡 **Key GOAT Capabilities**:
- ✅ Multi-network support (Sei, Base, Ethereum)
- ✅ Real-time blockchain data access
- ✅ DeFi operations (swaps, liquidity, analytics)
- ✅ ERC-20 token management
- ✅ Transaction history and monitoring
- ✅ Gas price estimation and optimization
- ✅ Portfolio analysis and yield tracking

⚠️ **GOAT Tools Usage**:
- All GOAT tools require wallet configuration (WALLET_PRIVATE_KEY)
- Network-specific tools work on their respective chains
- DeFi tools require sufficient token balances for transactions
- Use appropriate network tools for the user's intended blockchain`;
  }

  /**
   * Get intelligent tool recommendations based on user prompt
   */
  async getIntelligentToolRecommendations(prompt: string): Promise<{
    recommendedTools: Array<{
      id: string;
      name: string;
      type: "mcp" | "goat";
      confidence: number;
      reason: string;
      category: string;
      suggestedConfig: any;
      description: string;
    }>;
    analysis: {
      detectedIntent: string;
      keywords: string[];
      categories: string[];
      complexity: "simple" | "moderate" | "complex";
    };
  }> {
    try {
      this.logger.log(
        `Getting intelligent tool recommendations for prompt: "${prompt.substring(0, 100)}..."`
      );

      // Get all available tools
      const mcpServers = await this.getAvailableMCPServers();
      const goatTools = this.getAvailableGoatTools();

      // Convert to unified format for analysis
      const allTools = [
        ...mcpServers.map((server: any) => ({
          id: server.id,
          name: server.displayName,
          description: server.description,
          type: "mcp" as const,
          category: server.category || "utilities",
          capabilities: this.extractCapabilitiesFromMCP(server),
        })),
        ...goatTools.map((tool: any) => ({
          id: tool.id,
          name: tool.name,
          description: tool.description,
          type: "goat" as const,
          category: tool.category,
          capabilities: tool.capabilities,
        })),
      ];

      // Analyze prompt and get recommendations
      const analysis = this.analyzePromptIntent(prompt);
      const recommendations = this.scoreAndRankTools(
        prompt,
        allTools,
        analysis
      );

      return {
        recommendedTools: recommendations.slice(0, 8), // Top 8 recommendations
        analysis,
      };
    } catch (error) {
      this.logger.error(
        "Failed to get intelligent tool recommendations:",
        error
      );

      // Fallback recommendations
      return {
        recommendedTools: [],
        analysis: {
          detectedIntent: "Unable to analyze",
          keywords: [],
          categories: [],
          complexity: "simple",
        },
      };
    }
  }

  private analyzePromptIntent(prompt: string): {
    detectedIntent: string;
    keywords: string[];
    categories: string[];
    complexity: "simple" | "moderate" | "complex";
  } {
    const promptLower = prompt.toLowerCase();
    const keywords: string[] = [];
    const categories: string[] = [];
    const intents: string[] = [];

    // Keyword extraction with categories
    const keywordMap = {
      blockchain: [
        "wallet",
        "balance",
        "transaction",
        "crypto",
        "blockchain",
        "ethereum",
        "sei",
        "gas",
        "address",
      ],
      defi: [
        "swap",
        "trade",
        "defi",
        "liquidity",
        "pool",
        "yield",
        "farm",
        "lending",
        "arbitrage",
        "uniswap",
      ],
      search: [
        "search",
        "find",
        "lookup",
        "query",
        "information",
        "browse",
        "web",
      ],
      data: ["fetch", "get", "retrieve", "api", "data", "database", "sql"],
      analytics: [
        "analyze",
        "monitor",
        "track",
        "stats",
        "metrics",
        "performance",
      ],
      communication: ["send", "notify", "email", "message", "alert"],
      utilities: ["calculate", "convert", "format", "validate", "check"],
    };

    // Extract keywords and determine categories
    for (const [category, categoryKeywords] of Object.entries(keywordMap)) {
      for (const keyword of categoryKeywords) {
        if (promptLower.includes(keyword)) {
          keywords.push(keyword);
          if (!categories.includes(category)) {
            categories.push(category);
          }
        }
      }
    }

    // Determine intents based on categories
    if (categories.includes("blockchain"))
      intents.push("Blockchain Operations");
    if (categories.includes("defi")) intents.push("DeFi Operations");
    if (categories.includes("search")) intents.push("Information Retrieval");
    if (categories.includes("data")) intents.push("Data Access");
    if (categories.includes("analytics"))
      intents.push("Analytics & Monitoring");
    if (categories.includes("communication")) intents.push("Communication");
    if (categories.includes("utilities")) intents.push("Utility Operations");

    // Determine complexity
    let complexity: "simple" | "moderate" | "complex" = "simple";
    if (categories.length > 2 || promptLower.split(" ").length > 15) {
      complexity = "moderate";
    }
    if (
      categories.length > 3 ||
      promptLower.includes("workflow") ||
      promptLower.includes("automate")
    ) {
      complexity = "complex";
    }

    return {
      detectedIntent: intents.join(", ") || "General Task",
      keywords: [...new Set(keywords)], // Remove duplicates
      categories,
      complexity,
    };
  }

  private scoreAndRankTools(
    prompt: string,
    tools: any[],
    analysis: any
  ): Array<{
    id: string;
    name: string;
    type: "mcp" | "goat";
    confidence: number;
    reason: string;
    category: string;
    suggestedConfig: any;
    description: string;
  }> {
    const scoredTools = [];

    for (const tool of tools) {
      const score = this.calculateIntelligentToolScore(prompt, tool, analysis);
      if (score.confidence >= 40) {
        // Lower threshold for more suggestions
        scoredTools.push({
          id: tool.id,
          name: tool.name,
          type: tool.type,
          confidence: score.confidence,
          reason: score.reason,
          category: tool.category,
          suggestedConfig: this.generateSmartConfig(prompt, tool),
          description: tool.description,
        });
      }
    }

    // Sort by confidence descending
    return scoredTools.sort((a, b) => b.confidence - a.confidence);
  }

  private calculateIntelligentToolScore(
    prompt: string,
    tool: any,
    analysis: any
  ): { confidence: number; reason: string } {
    let score = 0;
    const reasons = [];

    const toolName = tool.name.toLowerCase();
    const toolDesc = (tool.description || "").toLowerCase();
    const promptLower = prompt.toLowerCase();

    // Category matching (high weight for direct category match)
    if (analysis.categories.includes(tool.category)) {
      score += 35;
      reasons.push(`matches ${tool.category} category`);
    }

    // Keyword matching in tool name (highest weight)
    for (const keyword of analysis.keywords) {
      if (toolName.includes(keyword)) {
        score += 30;
        reasons.push(`tool name contains "${keyword}"`);
      }
      if (toolDesc.includes(keyword)) {
        score += 20;
        reasons.push(`description contains "${keyword}"`);
      }
    }

    // Intent-based scoring
    if (
      analysis.detectedIntent.includes("Blockchain") &&
      tool.category === "blockchain"
    ) {
      score += 25;
      reasons.push("blockchain intent detected");
    }
    if (analysis.detectedIntent.includes("DeFi") && tool.category === "defi") {
      score += 25;
      reasons.push("DeFi intent detected");
    }
    if (
      analysis.detectedIntent.includes("Search") &&
      toolName.includes("search")
    ) {
      score += 30;
      reasons.push("search intent detected");
    }

    // Specific pattern matching
    if (
      promptLower.includes("balance") &&
      (toolName.includes("balance") || toolName.includes("wallet"))
    ) {
      score += 35;
      reasons.push("balance query pattern");
    }
    if (
      promptLower.includes("swap") &&
      (toolName.includes("swap") || toolName.includes("uniswap"))
    ) {
      score += 35;
      reasons.push("swap operation pattern");
    }
    if (promptLower.includes("price") && toolName.includes("price")) {
      score += 30;
      reasons.push("price query pattern");
    }

    // GOAT tools get slight preference for blockchain/DeFi operations
    if (
      tool.type === "goat" &&
      (analysis.categories.includes("blockchain") ||
        analysis.categories.includes("defi"))
    ) {
      score += 10;
      reasons.push("native blockchain integration");
    }

    // Cap at 100%
    score = Math.min(score, 100);

    return {
      confidence: score,
      reason:
        reasons.length > 0
          ? reasons.slice(0, 3).join(", ")
          : "general relevance",
    };
  }

  private generateSmartConfig(prompt: string, tool: any): any {
    const config: any = {};

    // Extract potential addresses
    const addressMatch = prompt.match(/0x[a-fA-F0-9]{40}/);
    if (
      addressMatch &&
      (tool.name.toLowerCase().includes("balance") ||
        tool.name.toLowerCase().includes("transaction"))
    ) {
      config.address = addressMatch[0];
    }

    // Extract numbers for limits/amounts
    const numberMatch = prompt.match(/\b(\d+(?:\.\d+)?)\b/);
    if (numberMatch) {
      const number = parseFloat(numberMatch[1]);
      if (
        tool.name.toLowerCase().includes("transaction") ||
        tool.name.toLowerCase().includes("history")
      ) {
        config.limit = Math.min(Math.max(number, 1), 100);
      }
      if (
        tool.name.toLowerCase().includes("swap") ||
        tool.name.toLowerCase().includes("amount")
      ) {
        config.amount = numberMatch[1];
      }
    }

    // Extract token symbols
    const tokenMatch = prompt.match(/\b(ETH|USDC|SEI|BTC|USDT|WETH|DAI)\b/i);
    if (
      tokenMatch &&
      (tool.name.toLowerCase().includes("token") ||
        tool.name.toLowerCase().includes("swap"))
    ) {
      config.token = tokenMatch[1].toUpperCase();
    }

    // Network detection
    if (prompt.toLowerCase().includes("sei")) {
      config.network = "sei-testnet";
    } else if (prompt.toLowerCase().includes("base")) {
      config.network = "base-sepolia";
    } else if (prompt.toLowerCase().includes("ethereum")) {
      config.network = "ethereum";
    }

    return config;
  }

  /**
   * Generate default configuration for MCP server based on its schema
   */
  private generateDefaultConfigForServer(server: any): Record<string, any> {
    const config: Record<string, any> = {};

    if (server.configSchema?.properties) {
      Object.keys(server.configSchema.properties).forEach((key) => {
        const property = server.configSchema.properties[key];
        if (property.default !== undefined) {
          config[key] = property.default;
        } else if (property.required) {
          // Provide placeholder values for required fields
          switch (property.type) {
            case "string":
              config[key] = property.sensitive
                ? `your-${key}`
                : `default-${key}`;
              break;
            case "number":
              config[key] = 30000;
              break;
            case "boolean":
              config[key] = true;
              break;
            default:
              config[key] = property.default || null;
          }
        }
      });
    }

    return config;
  }

  /**
   * Extract capabilities from MCP server configuration
   */
  private extractCapabilitiesFromMCP(server: any): string[] {
    const capabilities: string[] = [];

    // Add category-based capabilities
    capabilities.push(server.category);

    // Add specific capabilities based on server type
    switch (server.id) {
      case "fetch":
        capabilities.push("http_requests", "api_calls", "web_integration");
        break;
      case "goat":
        capabilities.push(
          "blockchain",
          "wallet_operations",
          "defi",
          "cross_chain"
        );
        break;
      case "puppeteer":
        capabilities.push("web_automation", "browser_control", "scraping");
        break;
      case "brave-search":
        capabilities.push("web_search", "information_retrieval");
        break;
      case "postgres":
        capabilities.push("database_operations", "sql_queries");
        break;
      case "git":
        capabilities.push("version_control", "repository_management");
        break;
      case "time":
        capabilities.push("time_operations", "scheduling");
        break;
      case "weather":
        capabilities.push("weather_data", "environmental_info");
        break;
      default:
        capabilities.push("general_integration");
    }

    return capabilities;
  }

  /**
   * Generate summary of available tools
   */
  private generateToolsSummary(servers: any[]): string {
    return servers
      .map((server) => `${server.displayName}: ${server.description}`)
      .join(" | ");
  }

  /**
   * Generate user-level specific instructions
   */
  private getUserLevelInstructions(userLevel: string): string {
    switch (userLevel) {
      case "beginner":
        return `
🟢 **BEGINNER MODE**:
- Create simple, single-purpose workflows (2-4 blocks maximum)
- Use well-known, reliable tools with minimal configuration
- Provide clear, step-by-step descriptions
- Avoid complex tool chaining or advanced features
- Focus on HTTP_REQUEST, NOTIFICATION, and basic AI_AGENT blocks
- Pre-fill all configurations with sensible defaults`;

      case "advanced":
        return `
🔴 **ADVANCED MODE**:
- Create sophisticated, multi-step workflows (5+ blocks allowed)
- Use advanced tool combinations and complex chaining
- Implement error handling, retries, and fallback mechanisms  
- Use advanced AI_AGENT configurations with multiple tools
- Include CONDITION blocks for complex logic flows
- Optimize for performance and scalability`;

      default: // intermediate
        return `
🟡 **INTERMEDIATE MODE**:
- Create balanced workflows (3-6 blocks)
- Use common tool combinations with moderate complexity
- Include basic error handling and validation
- Combine AI_AGENT blocks with supporting infrastructure
- Provide good defaults while allowing customization`;
    }
  }

  /**
   * Generate security-specific instructions
   */
  private getSecurityInstructions(): string {
    return `
🔒 **SECURITY VALIDATION ENABLED**:
- Validate all user inputs and parameters
- Sanitize API keys and sensitive configuration
- Use placeholder values for sensitive fields (e.g., "your-api-key")
- Avoid exposing internal system details
- Implement proper access controls and permissions
- Add security-focused error handling`;
  }

  /**
   * Generate validation-specific instructions
   */
  private getValidationInstructions(): string {
    return `
✅ **VALIDATION ENABLED**:
- Include comprehensive input validation for all blocks
- Add parameter type checking and format validation
- Implement data transformation and sanitization
- Use CONDITION blocks to verify prerequisites
- Add validation steps before critical operations
- Provide clear error messages for validation failures`;
  }

  /**
   * Generate auto-heal specific instructions
   */
  private getAutoHealInstructions(): string {
    return `
🚑 **AUTO-HEAL ENABLED**:
- Include retry mechanisms with exponential backoff
- Add fallback tools and alternative execution paths
- Implement circuit breakers for external dependencies
- Use error recovery blocks and rollback procedures
- Add health checks and monitoring blocks
- Design self-correcting workflows that adapt to failures`;
  }

  /**
   * Pre-fill block configuration with intelligent defaults
   */
  private prefillBlockConfiguration(
    blockType: string,
    existingConfig: any,
    options?: GenerationOptions
  ): any {
    const config = { ...existingConfig };
    const userLevel = options?.userLevel || "intermediate";
    const enableSecurity = options?.enableSecurity ?? true;

    switch (blockType) {
      case "HTTP_REQUEST":
        return {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Zyra-Workflow/1.0",
          },
          timeout: userLevel === "beginner" ? 10000 : 30000,
          retries: options?.autoHeal ? 3 : 1,
          ...config,
        };

      case "AI_AGENT":
        return {
          provider: {
            type: "openrouter",
            model: "openai/gpt-4o-mini",
            temperature: 0.7,
            maxTokens: userLevel === "beginner" ? 1000 : 2000,
          },
          execution: {
            mode: "autonomous",
            timeout: userLevel === "beginner" ? 60000 : 120000,
            requireApproval: userLevel === "beginner",
            saveThinking: true,
          },
          ...config,
        };

      case "EMAIL":
        return {
          smtp: {
            host: enableSecurity ? "smtp.gmail.com" : "localhost",
            port: 587,
            secure: false,
            auth: {
              user: "your-email@gmail.com",
              pass: "your-app-password",
            },
          },
          from: "noreply@zyra.ai",
          retries: options?.autoHeal ? 3 : 1,
          ...config,
        };

      case "NOTIFICATION":
        return {
          channels: ["email"],
          priority: "normal",
          template: "default",
          retries: options?.autoHeal ? 2 : 1,
          ...config,
        };

      case "CONDITION":
        return {
          operator: "equals",
          caseSensitive: false,
          timeout: 5000,
          ...config,
        };

      case "DELAY":
        return {
          duration: userLevel === "beginner" ? 1000 : 5000,
          unit: "milliseconds",
          ...config,
        };

      case "SEI_PAYMENT":
        return {
          network: "sei-testnet",
          gasLimit: "200000",
          gasPrice: "auto",
          confirmations: 1,
          timeout: 60000,
          ...config,
        };

      case "CUSTOM":
        return {
          timeout: 30000,
          retries: 1,
          ...config,
        };

      default:
        return config;
    }
  }

  // Private methods (with MCP integration)
  private async generateSystemPrompt(
    options?: GenerationOptions
  ): Promise<string> {
    // Get available tools using the established MCP system
    const availableToolsContext = await this.generateAvailableToolsContext();

    // Build dynamic prompt based on user options
    const userLevel = options?.userLevel || "intermediate";
    const detailedMode = options?.detailedMode ?? true;
    const enableSecurity = options?.enableSecurity ?? true;
    const enableValidation = options?.enableValidation ?? true;
    const autoHeal = options?.autoHeal ?? true;

    // Dynamic prompts based on user level
    const levelInstructions = this.getUserLevelInstructions(userLevel);
    const securityInstructions = enableSecurity
      ? this.getSecurityInstructions()
      : "";
    const validationInstructions = enableValidation
      ? this.getValidationInstructions()
      : "";
    const autoHealInstructions = autoHeal ? this.getAutoHealInstructions() : "";
    const detailLevel = detailedMode ? "COMPREHENSIVE" : "CONCISE";

    return `You are an EXPERT WORKFLOW AI for Zyra automation platform with deep understanding of blockchain, crypto, and automation workflows.

🎯 **CORE MISSION**: Transform ANY natural language into sophisticated, executable workflows using our comprehensive block system.

👤 **USER LEVEL**: ${userLevel.toUpperCase()}
${levelInstructions}

📋 **DETAIL LEVEL**: ${detailLevel}
${detailedMode ? "Provide comprehensive configurations with detailed descriptions and validation." : "Create efficient, streamlined workflows with essential configurations only."}

${securityInstructions}
${validationInstructions}
${autoHealInstructions}

🔥 **AVAILABLE BLOCK TYPES**:
${JSON.stringify(Object.values(BlockType), null, 2)}

📊 **AVAILABLE DATA TYPES**: 
${JSON.stringify(Object.values(DataType), null, 2)}

🛠️ **AVAILABLE MCP TOOLS & INTEGRATIONS**:
${availableToolsContext}

🚨 **STRICT JSON RULES**:
- Do NOT include any comments (// or /* ... */) in the JSON.
- Do NOT include trailing commas.
- Output STRICT, valid JSON only.

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

🚨 **MANDATORY AI_AGENT BLOCK CONFIGURATION** 🚨:
EVERY AI_AGENT block MUST include selectedTools from availableMCPServers above. NO EXCEPTIONS!

{
  "blockType": "AI_AGENT",
  "config": {
    "provider": {
      "type": "openrouter",
      "model": "openai/gpt-4o-mini",
      "temperature": 0.7,
      "maxTokens": 2000
    },
    "agent": {
      "name": "Descriptive agent name based on function",
      "systemPrompt": "Detailed system prompt explaining the agent's role and capabilities",
      "userPrompt": "Dynamic user prompt or use context from workflow",
      "maxSteps": 10,
      "thinkingMode": "deliberate"
    },
    "selectedTools": [
      /* REQUIRED: MUST COPY exact selectedToolFormat objects from availableMCPServers above */
      /* NEVER LEAVE THIS ARRAY EMPTY - ALWAYS SELECT RELEVANT MCP SERVERS */
    ],
    "execution": {
      "mode": "autonomous",
      "timeout": 120000,
      "requireApproval": false,
      "saveThinking": true
    }
  }
}

⛔ **CRITICAL:** AI_AGENT blocks without selectedTools array are INVALID and BROKEN!

**EXAMPLE: For "Search crypto news, analyze sentiment, and execute trades":**
"selectedTools": [
  {
    "id": "brave-search",
    "name": "Brave Search", 
    "type": "mcp",
    "config": { "apiKey": "your-brave-api-key" },
    "description": "Search the web using Brave Search API",
    "category": "web",
    "enabled": true
  },
  {
    "id": "fetch",
    "name": "HTTP Requests",
    "type": "mcp", 
    "config": { "userAgent": "Zyra-AI-Agent/1.0", "timeout": 30000 },
    "description": "Make HTTP requests to APIs and web services",
    "category": "api",
    "enabled": true
  },
  {
    "id": "goat", 
    "name": "GOAT Blockchain",
    "type": "mcp",
    "config": { "WALLET_PRIVATE_KEY": "0x...", "RPC_PROVIDER_URL": "https://sepolia.base.org" },
    "description": "Blockchain operations using GOAT SDK",
    "category": "api",
    "enabled": true
  }
]

**WORKFLOW OPTIMIZATION RULES**:
- **PRIORITIZE AI_AGENT blocks** over separate HTTP_REQUEST, EMAIL, NOTIFICATION blocks when AI agents can handle the same functionality
- If user needs "fetch crypto news" → Use AI_AGENT with "fetch" or "brave-search" MCP tool, NOT separate HTTP_REQUEST block
- If user needs "send email" → Use AI_AGENT with appropriate MCP tool, NOT separate EMAIL block  
- If user needs "web scraping" → Use AI_AGENT with "puppeteer" MCP tool, NOT separate blocks
- **CONSOLIDATE functionality** into fewer, more powerful AI_AGENT blocks rather than many simple blocks
- Only create separate blocks (HTTP_REQUEST, EMAIL, etc.) when AI agents cannot handle the functionality

**CRITICAL REQUIREMENTS**:
- Return ONLY valid JSON: {"nodes": [...], "edges": [...]}
- Use exact BlockType enum values (UPPERCASE format)
- Generate unique UUIDs for all IDs
- Create intelligent positioning based on flow order
- Generate proper configurations for each block type
- Ensure logical execution flow (TRIGGER → LOGIC → ACTION)
- AUTONOMOUSLY select MCP servers for AI_AGENT blocks based on context and capabilities
- Include complete MCP server configurations with proper IDs and settings
- **MINIMIZE REDUNDANCY**: Don't create separate API/HTTP blocks when AI agents can handle the same task

🤖 **AI AUTONOMY**: You have complete autonomy to select the best MCP servers and create optimal workflows. Prioritize powerful AI_AGENT blocks that can handle multiple tasks over creating many separate simple blocks.

Generate workflows that users can execute immediately with full functionality.`;
  }

  private async generateRefinementSystemPrompt(
    options?: GenerationOptions
  ): Promise<string> {
    // Get available tools using the established MCP system
    const availableToolsContext = await this.generateAvailableToolsContext();

    // Build dynamic prompt based on user options
    const userLevel = options?.userLevel || "intermediate";
    const detailedMode = options?.detailedMode ?? true;
    const enableSecurity = options?.enableSecurity ?? true;
    const enableValidation = options?.enableValidation ?? true;
    const autoHeal = options?.autoHeal ?? true;

    const levelInstructions = this.getUserLevelInstructions(userLevel);
    const securityInstructions = enableSecurity
      ? this.getSecurityInstructions()
      : "";
    const validationInstructions = enableValidation
      ? this.getValidationInstructions()
      : "";
    const autoHealInstructions = autoHeal ? this.getAutoHealInstructions() : "";

    return `You are an EXPERT WORKFLOW REFINEMENT AI for Zyra automation platform.

👤 **USER LEVEL**: ${userLevel.toUpperCase()}
${levelInstructions}

🛠️ **AVAILABLE MCP TOOLS & INTEGRATIONS**:
${availableToolsContext}

${securityInstructions}
${validationInstructions}
${autoHealInstructions}

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
      this.logger.error("Raw AI response:", text);
      this.logger.error(
        "Cleaned AI response:",
        text
          .replace(/```json|```/g, "")
          .trim()
          .slice(0, 500)
      );
      throw new Error(
        `Invalid workflow format generated by AI. Error: ${error instanceof Error ? error.message : error}. Snippet: ${text
          .replace(/```json|```/g, "")
          .trim()
          .slice(0, 500)}`
      );
    }
  }

  private enhanceNodes(
    nodes: any[],
    options?: GenerationOptions
  ): WorkflowNode[] {
    return nodes.map((nodeData) => {
      const nodeId = (nodeData.id as string) || `node-${uuidv4()}`;
      const blockType = (nodeData.data as any)?.blockType;
      // Use blockType as type if valid, else fallback to 'CUSTOM'
      const validBlockTypes = Object.values(BlockType);
      const nodeType = validBlockTypes.includes(blockType)
        ? blockType
        : "CUSTOM";

      // Get base config from AI response
      let config = (nodeData.data as any)?.config || {};

      // Pre-fill config with defaults if enabled
      if (options?.prefillConfig) {
        config = this.prefillBlockConfiguration(blockType, config, options);
      }

      return {
        id: nodeId,
        type: nodeType,
        position: nodeData.position as { x: number; y: number },
        data: {
          blockType: blockType,
          label: (nodeData.data as any)?.label,
          description: (nodeData.data as any)?.description || "",
          nodeType: (nodeData.data as any)?.nodeType || "ACTION",
          iconName: (nodeData.data as any)?.iconName || "block",
          isEnabled: true,
          config: config,
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
