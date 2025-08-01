import { Injectable, Logger } from '@nestjs/common';
import { BlockHandler, BlockExecutionContext } from '@zyra/types';
import { DatabaseService } from '../../services/database.service';
import { ExecutionLogger } from '../execution-logger';
import { LLMProviderManager } from './ai-agent/LLMProviderManager';
import { MCPServerManager } from './ai-agent/MCPServerManager';
import { SecurityValidator } from './ai-agent/SecurityValidator';
import { ReasoningEngine } from './ai-agent/ReasoningEngine';
import { EnhancedReasoningEngine } from './ai-agent/EnhancedReasoningEngine';
import { GoatPluginManager } from './goat/GoatPluginManager';
import { defaultMCPs } from '../../mcps/default_mcp_configs';

interface AIAgentConfig {
  provider: {
    type: 'openrouter' | 'openai' | 'anthropic' | 'ollama';
    model: string;
    temperature?: number;
    maxTokens?: number;
  };
  agent: {
    name: string;
    systemPrompt: string;
    userPrompt: string;
    maxSteps: number;
    thinkingMode: 'fast' | 'deliberate' | 'collaborative';
  };
  selectedTools: Array<{
    id: string;
    name: string;
    type: 'mcp' | 'goat' | 'builtin';
    config?: Record<string, any>;
    description?: string;
    category?: string;
    enabled?: boolean;
  }>;
  execution: {
    mode: 'autonomous' | 'supervised' | 'simulation';
    timeout: number;
    requireApproval: boolean;
    saveThinking: boolean;
  };
}

@Injectable()
export class AIAgentHandler implements BlockHandler {
  private readonly logger = new Logger(AIAgentHandler.name);
  private readonly maxExecutionTime = 300000; // 5 minutes

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly executionLogger: ExecutionLogger,
    private readonly llmProviderManager: LLMProviderManager,
    private readonly mcpServerManager: MCPServerManager,
    private readonly securityValidator: SecurityValidator,
    private readonly reasoningEngine: ReasoningEngine,
    private readonly enhancedReasoningEngine: EnhancedReasoningEngine,
    private readonly goatPluginManager: GoatPluginManager,
  ) {}

  async execute(node: any, ctx: BlockExecutionContext): Promise<any> {
    const startTime = Date.now();
    const nodeId = node.id;
    const executionId = ctx.executionId;
    const userId = ctx.userId;

    try {
      this.logger.log(
        `[AI_AGENT] Starting AI Agent execution for node: ${nodeId}`,
      );
      this.logger.debug(`[AI_AGENT] Execution context:`, {
        executionId,
        userId,
        nodeId,
        previousOutputs: Object.keys(ctx.previousOutputs || {}),
      });

      // Parse and validate configuration
      this.logger.log(`[AI_AGENT] Parsing configuration for node: ${nodeId}`);
      const config = this.parseConfiguration(node.data);
      if (!config) {
        throw new Error('Invalid AI Agent configuration');
      }
      this.logger.debug(`[AI_AGENT] Configuration parsed:`, {
        provider: config.provider.type,
        model: config.provider.model,
        agentName: config.agent.name,
        userPrompt: config.agent.userPrompt.substring(0, 100) + '...',
        selectedTools: config.selectedTools.length,
      });

      // Security validation
      this.logger.log(`[AI_AGENT] Validating security for node: ${nodeId}`);
      const securityResult = await this.securityValidator.validateExecution(
        config,
        userId,
        executionId,
      );

      if (!securityResult.isValid) {
        const violations = securityResult.violations
          .map((v) => v.description)
          .join(', ');
        throw new Error(`Security violations detected: ${violations}`);
      }
      this.logger.log(
        `[AI_AGENT] Security validation passed for node: ${nodeId}`,
      );

      // Create execution session
      this.logger.log(
        `[AI_AGENT] Creating execution session for node: ${nodeId}`,
      );
      const session = await this.createExecutionSession(config, ctx);
      this.logger.debug(`[AI_AGENT] Session created:`, {
        sessionId: session.id,
      });

      // Load selected tools
      this.logger.log(`[AI_AGENT] Loading tools for node: ${nodeId}`);
      const tools = await this.loadTools(config.selectedTools, userId);
      this.logger.debug(`[AI_AGENT] Tools loaded:`, {
        toolCount: tools.length,
        toolNames: tools.map((t) => t.name || t.id || 'unknown'),
      });

      // Initialize LLM provider
      this.logger.log(
        `[AI_AGENT] Initializing LLM provider for node: ${nodeId}`,
      );
      const provider = await this.llmProviderManager.getProvider(
        config.provider.type,
        config.provider,
      );
      this.logger.debug(`[AI_AGENT] LLM provider initialized:`, {
        providerType: config.provider.type,
        model: config.provider.model,
      });

      // Execute AI agent
      this.logger.log(`[AI_AGENT] Executing agent for node: ${nodeId}`);
      const result = await this.executeAgent(
        session,
        provider,
        tools,
        config,
        userId,
      );
      this.logger.debug(`[AI_AGENT] Agent execution completed:`, {
        resultType: typeof result,
        hasText: !!(result as any).text,
        hasContent: !!(result as any).content,
        resultLength:
          (result as any).text?.length || (result as any).content?.length || 0,
      });

      // Log execution completion
      this.logger.log(
        `[AI_AGENT] Logging execution completion for node: ${nodeId}`,
      );

      // Format toolCalls for logging
      const formattedToolCallsForLog = ((result as any).toolCalls || []).map(
        (call: any) => ({
          name: call.name || call.tool || 'unknown',
          parameters: call.parameters || call.args || {},
          result: call.result || call.output || null,
        }),
      );

      await this.logExecution(executionId, nodeId, {
        status: 'completed',
        result: (result as any).text || (result as any).content,
        steps: (result as any).steps?.length || 0,
        userId,
        provider: config.provider.type,
        model: config.provider.model,
        agentConfig: config.agent,
        toolsConfig: config.selectedTools,
        executionConfig: config.execution,
        thinkingSteps: (result as any).steps || [],
        toolCalls: formattedToolCallsForLog,
        securityViolations: [],
        performanceMetrics: {
          totalSteps: (result as any).steps?.length || 0,
          totalToolCalls: formattedToolCallsForLog.length,
        },
        startedAt: new Date(startTime),
        executionTimeMs: Date.now() - startTime,
      });

      // Structure the output for easy template consumption
      const processedResult =
        (result as any).text || (result as any).content || result;

      // Convert processedResult to string if it's an object
      const resultString =
        typeof processedResult === 'string'
          ? processedResult
          : JSON.stringify(processedResult);

      // Format toolCalls to match the expected schema
      const formattedToolCalls =
        (result as any).toolCalls?.map((call: any) => ({
          name: call.name || call.tool || 'unknown',
          parameters: call.parameters || call.args || {},
          result: call.result || call.output || null,
        })) || [];

      // Extract and log thinking steps for debugging
      const thinkingSteps =
        (result as any).thinkingSteps || (result as any).steps || [];
      this.logger.log(
        `[AI_AGENT] Thinking steps captured: ${thinkingSteps.length} steps`,
      );
      this.logger.debug(`[AI_AGENT] Thinking steps details:`, thinkingSteps);

      const output = {
        success: true,
        result: resultString,
        response: resultString, // Add 'response' field for {data.response} templates
        data: resultString, // Add 'data' field for generic data access
        output: resultString, // Add 'output' field for {previousBlock.output} templates
        steps: (result as any).steps || [],
        toolCalls: formattedToolCalls,
        thinkingSteps: thinkingSteps,
        executionTime: Date.now() - startTime,
        sessionId: session.id,
        // Additional fields for template consumption
        text: resultString,
        content: resultString,
        summary: resultString,
      };

      this.logger.log(
        `[AI_AGENT] AI Agent execution completed successfully for node: ${nodeId}`,
      );
      this.logger.debug(`[AI_AGENT] Final output structure:`, {
        success: output.success,
        hasResponse: !!output.response,
        hasOutput: !!output.output,
        hasData: !!output.data,
        responseLength: output.response?.length || 0,
        outputKeys: Object.keys(output),
      });

      return output;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        `[AI_AGENT] AI Agent execution failed for node ${nodeId}: ${errorMessage}`,
      );

      // Log execution failure
      await this.logExecution(executionId, nodeId, {
        status: 'failed',
        error: errorMessage,
        userId,
        provider: 'unknown',
        model: 'unknown',
        agentConfig: {},
        toolsConfig: [],
        executionConfig: {},
        thinkingSteps: [],
        toolCalls: [], // Empty array for failed executions
        securityViolations: [],
        performanceMetrics: {},
        startedAt: new Date(startTime),
        executionTimeMs: Date.now() - startTime,
      });

      return {
        success: false,
        error: errorMessage,
        nodeId,
        executionTime: Date.now() - startTime,
        toolCalls: [], // Ensure error case also has properly formatted toolCalls
      };
    }
  }

  private parseConfiguration(data: any): AIAgentConfig | null {
    try {
      // Handle both direct data and nested config structure from UI
      const config = data.config || data;

      this.logger.log(`[AI_AGENT] Raw configuration data:`, {
        hasConfig: !!config,
        hasSelectedTools: !!config.selectedTools,
        selectedToolsCount: config.selectedTools?.length || 0,
        allToolIds:
          config.selectedTools?.map((t: any) => ({
            id: t.id,
            name: t.name,
            enabled: t.enabled,
          })) || [],
      });

      // Filter out disabled tools - only include tools that are enabled
      const selectedTools = (config.selectedTools || []).filter((tool: any) => {
        // Include tool if enabled is true or undefined (default to enabled)
        return tool.enabled !== false;
      });

      this.logger.log(`[AI_AGENT] Parsed configuration:`, {
        totalTools: config.selectedTools?.length || 0,
        enabledTools: selectedTools.length,
        toolIds: selectedTools.map((t: any) => t.id),
        disabledTools: (config.selectedTools || [])
          .filter((t: any) => t.enabled === false)
          .map((t: any) => t.id),
      });

      return {
        provider: {
          type: config.provider?.type || 'openrouter',
          model: config.provider?.model || 'openai/gpt-4o-mini',
          temperature: config.provider?.temperature || 0.7,
          maxTokens: config.provider?.maxTokens || 4000,
        },
        agent: {
          name: config.agent?.name || 'AI Assistant',
          systemPrompt:
            config.agent?.systemPrompt || 'You are a helpful AI assistant.',
          userPrompt: config.agent?.userPrompt || '',
          maxSteps: config.agent?.maxSteps || 10,
          thinkingMode: config.agent?.thinkingMode || 'fast',
        },
        selectedTools: selectedTools,
        execution: {
          mode: config.execution?.mode || 'autonomous',
          timeout: config.execution?.timeout || this.maxExecutionTime,
          requireApproval: config.execution?.requireApproval || false,
          saveThinking: config.execution?.saveThinking || true,
        },
      };
    } catch (error) {
      this.logger.error('Failed to parse AI Agent configuration:', error);
      return null;
    }
  }

  private async createExecutionSession(
    config: AIAgentConfig,
    ctx: BlockExecutionContext,
  ) {
    // For now, return a mock session object since the database model might not exist yet
    try {
      return await (this.databaseService.prisma as any).aiAgentExecution.create(
        {
          data: {
            executionId: ctx.executionId,
            nodeId: ctx.nodeId,
            userId: ctx.userId,
            provider: config.provider.type,
            model: config.provider.model,
            agentConfig: config.agent as any,
            toolsConfig: config.selectedTools as any,
            status: 'running',
          },
        },
      );
    } catch (error) {
      // Fallback to mock session if database model doesn't exist
      return {
        id: `session-${Date.now()}`,
        executionId: ctx.executionId,
        nodeId: ctx.nodeId,
        userId: ctx.userId,
        provider: config.provider.type,
        model: config.provider.model,
        status: 'running',
        createdAt: new Date(),
      };
    }
  }

  private async loadTools(
    selectedTools: AIAgentConfig['selectedTools'],
    userId: string,
  ) {
    const tools = [];

    this.logger.log(
      `[AI_AGENT] Loading ${selectedTools.length} tools for user ${userId}`,
    );
    this.logger.debug(
      `[AI_AGENT] Selected tools:`,
      selectedTools.map((t) => ({
        id: t.id,
        name: t.name,
        type: t.type,
        enabled: t.enabled,
      })),
    );

    for (const toolConfig of selectedTools) {
      try {
        this.logger.log(
          `[AI_AGENT] Loading tool: ${toolConfig.name} (${toolConfig.type}) for user ${userId}`,
        );

        if (toolConfig.type === 'mcp') {
          // For MCP tools, we need to discover and connect to the specific server
          const mcpTools = await this.loadMCPTools(toolConfig, userId);
          tools.push(...mcpTools);
        } else if (toolConfig.type === 'goat') {
          // For GOAT tools, use the GOAT plugin manager
          const goatTools = await this.loadGoatTools(toolConfig, userId);
          tools.push(...goatTools);
        } else if (toolConfig.type === 'builtin') {
          // For builtin tools, we'll implement this later
          this.logger.warn(
            `Builtin tools not yet implemented: ${toolConfig.name}`,
          );
        } else {
          this.logger.warn(
            `Unknown tool type: ${toolConfig.type} for tool: ${toolConfig.name}`,
          );
        }
      } catch (error) {
        this.logger.warn(
          `Failed to load tool ${toolConfig.name}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    this.logger.log(`Loaded ${tools.length} tools total for user ${userId}`);
    return tools;
  }

  private async loadMCPTools(toolConfig: any, userId: string): Promise<any[]> {
    const tools = [];

    try {
      this.logger.log(`[AI_AGENT] Loading MCP tools for tool config:`, {
        id: toolConfig.id,
        name: toolConfig.name,
        type: toolConfig.type,
        enabled: toolConfig.enabled,
        hasConfig: !!toolConfig.config,
      });

      // Use the connection details from the UI configuration if available
      let serverConfigs = [];

      if (toolConfig.config && toolConfig.config.connection) {
        // Use connection details from UI configuration
        this.logger.log(
          `[AI_AGENT] Using connection details from UI config for tool ${toolConfig.id}`,
        );
        serverConfigs = [
          {
            name: `${toolConfig.id}-server`,
            command: toolConfig.config.connection.command,
            args: toolConfig.config.connection.args || [],
            env: toolConfig.config.connection.env || {},
            timeout: 300000, // 5 minutes
          },
        ];
      } else {
        // Fallback to hardcoded configurations
        this.logger.log(
          `[AI_AGENT] Using fallback server configs for tool ${toolConfig.id}`,
        );
        serverConfigs = this.getMCPServerConfigs(
          toolConfig.id,
          toolConfig.config,
        );
      }

      this.logger.log(
        `[AI_AGENT] Found ${serverConfigs.length} server configs for tool ${toolConfig.id}`,
      );

      for (const serverConfig of serverConfigs) {
        this.logger.log(
          `[AI_AGENT] Connecting to MCP server: ${serverConfig.name} for tool: ${toolConfig.name}`,
        );

        try {
          // Register the server if not already registered
          const serverId = await this.mcpServerManager.registerServer(
            serverConfig,
            userId,
          );

          // Get the server and its tools
          const server = await this.mcpServerManager.getServer(serverId);
          if (server && server.tools) {
            this.logger.log(
              `Found ${server.tools.length} tools from server: ${server.name}`,
            );

            // Convert MCP tools to AI SDK function format
            for (const tool of server.tools) {
              this.logger.log(`Converting MCP tool: ${tool.name}`);

              const aiTool = {
                id: tool.name,
                name: tool.name,
                description: tool.description,
                inputSchema: tool.inputSchema,
                parameters: tool.inputSchema,
                execute: async (args: any) => {
                  try {
                    this.logger.log(
                      `Executing MCP tool ${tool.name} with args:`,
                      args,
                    );
                    return await tool.execute(args);
                  } catch (error) {
                    this.logger.error(
                      `MCP tool execution failed for ${tool.name}:`,
                      error,
                    );
                    throw error;
                  }
                },
              };
              tools.push(aiTool);
            }
          } else {
            this.logger.warn(
              `No tools found from MCP server: ${serverConfig.name}`,
            );
          }
        } catch (error) {
          this.logger.warn(
            `Failed to connect to MCP server ${serverConfig.name}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to load MCP tools for ${toolConfig.name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return tools;
  }

  /**
   * Load GOAT SDK tools and convert them to AI SDK format
   */
  private async loadGoatTools(toolConfig: any, userId: string): Promise<any[]> {
    const tools = [];

    try {
      this.logger.log(`[AI_AGENT] Loading GOAT tools for tool config:`, {
        id: toolConfig.id,
        name: toolConfig.name,
        type: toolConfig.type,
        config: toolConfig.config,
      });

      // Get the GOAT tool from the plugin manager
      const goatTool = await this.goatPluginManager.getTool(toolConfig.id);

      if (!goatTool) {
        this.logger.warn(`GOAT tool not found: ${toolConfig.id}`);
        return tools;
      }

      // Convert GOAT tool to AI SDK function format
      const aiTool = {
        name: goatTool.name,
        description: goatTool.description,
        id: goatTool.id,
        category: goatTool.category,
        plugin: goatTool.plugin,
        parameters: goatTool.inputSchema,
        execute: async (parameters: any) => {
          try {
            this.logger.debug(
              `[AI_AGENT] Executing GOAT tool: ${goatTool.name} with parameters:`,
              parameters,
            );

            const result = await this.goatPluginManager.executeTool(
              goatTool.id,
              parameters,
            );

            this.logger.debug(
              `[AI_AGENT] GOAT tool ${goatTool.name} execution result:`,
              result,
            );

            return result;
          } catch (error) {
            this.logger.error(
              `[AI_AGENT] GOAT tool ${goatTool.name} execution failed:`,
              error,
            );
            throw error;
          }
        },
      };

      tools.push(aiTool);
      this.logger.log(`Successfully loaded GOAT tool: ${goatTool.name}`);
    } catch (error) {
      this.logger.error(
        `Failed to load GOAT tool ${toolConfig.name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return tools;
  }

  private getMCPServerConfigs(toolId: string, userConfig?: any): any[] {
    this.logger.log(
      `[AI_AGENT] Getting MCP server configs for tool ID: ${toolId}`,
    );

    // Find the configuration dynamically
    const config = defaultMCPs[toolId as keyof typeof defaultMCPs];
    if (!config) {
      this.logger.warn(
        `[AI_AGENT] No MCP server configuration found for tool ID: ${toolId}`,
      );
      this.logger.debug(
        `[AI_AGENT] Available tool IDs:`,
        Object.keys(defaultMCPs),
      );
      return [];
    }

    // Convert centralized config to server format
    const serverConfig = {
      name: `${toolId}-server`,
      command: config.connection.command,
      args: config.connection.args,
      env: this.getEnvironmentForTool(toolId, config, userConfig),
      timeout: 300000, // 5 minutes
    };

    return [serverConfig];
  }

  private getEnvironmentForTool(
    toolId: string,
    config: any,
    userConfig?: any,
  ): Record<string, string> {
    const baseEnv: Record<string, string> = {};

    this.logger.log(`[AI_AGENT] 🤖 Dynamic env setup for tool: ${toolId}`);

    // 1. PASS ALL USER CONFIG DIRECTLY AS ENV VARS (highest priority)
    if (userConfig) {
      Object.entries(userConfig).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          baseEnv[key] = String(value);
          this.logger.log(`[AI_AGENT] ✅ User config: ${key}=${String(value)}`);
        }
      });
    }

    // 2. AUTO-DISCOVER ENV VARS FROM TOOL'S CONFIG SCHEMA
    const schemaProperties = config?.configSchema?.properties || {};
    Object.keys(schemaProperties).forEach((envVar) => {
      // Only add if not already set by user config
      if (!baseEnv[envVar] && process.env[envVar]) {
        baseEnv[envVar] = process.env[envVar];
        this.logger.log(`[AI_AGENT] 🔍 Auto-discovered: ${envVar}=SET`);
      }
    });

    // 3. INTELLIGENT FALLBACKS FOR COMMON PATTERNS
    const commonEnvVars = [
      'EVM_WALLET_PRIVATE_KEY',
      'WALLET_PRIVATE_KEY',
      'PRIVATE_KEY',
      'RPC_PROVIDER_URL',
      'API_KEY',
      'DATABASE_URL',
      'BRAVE_API_KEY',
      'BLOCKSCOUT_API_KEY',
    ];

    commonEnvVars.forEach((envVar) => {
      if (!baseEnv[envVar] && process.env[envVar]) {
        baseEnv[envVar] = process.env[envVar];
        this.logger.log(`[AI_AGENT] 🔧 Common pattern: ${envVar}=SET`);
      }
    });

    // 4. SMART DEFAULTS (only if nothing else set)
    if (!baseEnv.RPC_PROVIDER_URL && !baseEnv.CUSTOM_RPC_URL) {
      baseEnv.RPC_PROVIDER_URL = 'https://sepolia.base.org';
    }
    if (!baseEnv.BRAVE_API_KEY) {
      baseEnv.BRAVE_API_KEY = 'demo-key';
    }
    if (!baseEnv.DATABASE_URL) {
      baseEnv.DATABASE_URL = 'postgresql://localhost/zyra';
    }

    this.logger.log(
      `[AI_AGENT] 🎯 Final env vars for ${toolId}:`,
      Object.keys(baseEnv),
    );
    return baseEnv;
  }

  private async executeAgent(
    session: any,
    provider: any,
    tools: any[],
    config: AIAgentConfig,
    userId: string,
  ) {
    const startTime = Date.now();

    this.logger.log(
      `[AI_AGENT] Starting agent execution with reasoning engine`,
    );
    this.logger.debug(`[AI_AGENT] Execution parameters:`, {
      userPrompt: config.agent.userPrompt.substring(0, 100) + '...',
      systemPrompt: config.agent.systemPrompt.substring(0, 100) + '...',
      maxSteps: config.agent.maxSteps,
      thinkingMode: config.agent.thinkingMode,
      toolCount: tools.length,
      sessionId: session.id,
      timeout: config.execution.timeout,
    });

    this.logger.log(
      `[AI_AGENT] Tools available for execution:`,
      tools.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description?.substring(0, 50) + '...',
      })),
    );

    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        this.logger.error(
          `[AI_AGENT] Execution timeout after ${config.execution.timeout}ms`,
        );
        reject(
          new Error(
            `AI Agent execution timeout after ${config.execution.timeout}ms`,
          ),
        );
      }, config.execution.timeout);
    });

    // Execute with enhanced reasoning engine for sequential thinking (ALWAYS ENABLED)
    this.logger.log(
      `[AI_AGENT] Calling enhanced reasoning engine with sequential thinking`,
    );

    // Always use enhanced reasoning engine for better AI performance
    // Sequential thinking is now automatic for all AI agent executions
    this.logger.log(
      `[AI_AGENT] Processing with direct reasoning (sequential thinking disabled)...`,
    );

    // Generate secure system prompt with user context
    const systemPrompt = await this.buildSystemPrompt(userId, tools);

    // Direct execution without sequential thinking dependency
    const executionPromise = this.reasoningEngine.execute({
      prompt: config.agent.userPrompt,
      systemPrompt: systemPrompt,
      provider,
      tools,
      maxSteps: config.agent.maxSteps,
      thinkingMode: config.agent.thinkingMode,
      sessionId: session.id,
      userId: userId,
    });

    try {
      const result = await Promise.race([executionPromise, timeoutPromise]);
      this.logger.log(
        `[AI_AGENT] Reasoning engine execution completed successfully`,
      );
      this.logger.debug(`[AI_AGENT] Execution result:`, {
        resultType: typeof result,
        hasText: !!(result as any).text,
        hasContent: !!(result as any).content,
        resultLength:
          (result as any).text?.length || (result as any).content?.length || 0,
        resultKeys: Object.keys(result || {}),
      });

      // Get thinking steps from execution
      const thinkingSteps = (result as any).thinkingSteps || [];

      // Enhance the result with detailed execution information for UI
      const enhancedResult = {
        ...(result as any),
        success: true,
        toolCalls: this.enhanceToolCalls((result as any).toolCalls || []),
        thinkingSteps: thinkingSteps,
        totalSteps: thinkingSteps.length,
        totalToolCalls: (result as any).toolCalls?.length || 0,
        toolsUsed: tools.map((t) => ({ id: t.id, name: t.name })),
        executionTime: Date.now() - startTime,
      };

      this.logger.log(
        `[AI_AGENT] Enhanced result with ${enhancedResult.totalSteps} thinking steps and ${enhancedResult.totalToolCalls} tool calls`,
      );

      return enhancedResult;
    } catch (error) {
      this.logger.error(`[AI_AGENT] Reasoning engine execution failed:`, error);

      // Return error result with enhanced information
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        toolCalls: [],
        thinkingSteps: [],
        totalSteps: 0,
        totalToolCalls: 0,
        toolsUsed: [],
        executionTime: Date.now() - startTime,
      };
    }
  }

  private enhanceToolCalls(toolCalls: any[]): any[] {
    return toolCalls.map((call, index) => ({
      ...call,
      id: call.id || `tool-call-${index}`,
      timestamp: call.timestamp || Date.now(),
      duration: call.duration || 0,
      status: call.status || 'completed',
      parameters: call.parameters || {},
      result: call.result || null,
      error: call.error || null,
    }));
  }

  private async logExecution(executionId: string, nodeId: string, data: any) {
    try {
      // Log to execution logger (existing)
      await this.executionLogger.logExecutionEvent(executionId, {
        level: data.status === 'completed' ? 'info' : 'error',
        message: `AI Agent execution ${data.status}`,
        node_id: nodeId,
        data,
      });

      // Log to database like EMAIL block does
      await this.databaseService.prisma.aiAgentExecution.create({
        data: {
          executionId,
          nodeId,
          userId: data.userId || 'unknown',
          provider: data.provider || 'unknown',
          model: data.model || 'unknown',
          agentConfig: data.agentConfig || {},
          toolsConfig: data.toolsConfig || {},
          executionConfig: data.executionConfig || {},
          thinkingSteps: data.thinkingSteps || [],
          toolCalls: data.toolCalls || [],
          securityViolations: data.securityViolations || [],
          performanceMetrics: data.performanceMetrics || {},
          status: data.status || 'pending',
          startedAt: data.startedAt || new Date(),
          completedAt: data.status === 'completed' ? new Date() : null,
          totalTokens: data.totalTokens || null,
          executionTimeMs: data.executionTimeMs || data.duration || null,
          result: data.result || null,
          error: data.error || null,
          errorCode: data.errorCode || null,
          retryCount: data.retryCount || 0,
        },
      });

      this.logger.debug(`[AI_AGENT] Logged execution to database:`, {
        executionId,
        nodeId,
        status: data.status,
        executionTimeMs: data.executionTimeMs || data.duration,
        success: data.status === 'completed',
      });
    } catch (error) {
      this.logger.error(
        `Failed to log execution: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Build secure system prompt with user context
   * System prompts are controlled by the system for security and consistency
   */
  private async buildSystemPrompt(
    userId: string,
    tools: any[],
  ): Promise<string> {
    // Derive user's wallet address for context
    let userWalletAddress = 'Not available';
    try {
      if (process.env.EVM_WALLET_PRIVATE_KEY) {
        const { privateKeyToAccount } = require('viem/accounts');
        userWalletAddress = privateKeyToAccount(
          process.env.EVM_WALLET_PRIVATE_KEY as `0x${string}`,
        ).address;
      }
    } catch (error) {
      this.logger.warn(
        'Failed to derive wallet address for AI context:',
        error,
      );
    }

    // Build tool descriptions for AI context
    const toolDescriptions = tools
      .map(
        (tool) =>
          `- ${tool.name}: ${tool.description || 'No description available'}`,
      )
      .join('\n');

    return `Analyze the user's request and execute appropriate tools to provide helpful, accurate responses using the Model Context Protocol (MCP).

REASONING APPROACH:
Before taking any action, follow this reasoning process:
1. Understand what the user is asking for
2. Identify which tools can help accomplish this goal
3. Determine the correct parameters for each tool call
4. Execute tools in logical sequence
5. Synthesize results into a clear response

USER CONTEXT:
- User ID: ${userId}
- User's Wallet Address: ${userWalletAddress}
- When user references "my wallet", "my balance", "my transactions", use the wallet address above

AVAILABLE TOOLS:
${toolDescriptions}

STEPS:
1. **Analyze Request**: Break down what the user wants to accomplish
2. **Reason About Tools**: Identify which tools are needed and why
3. **Determine Parameters**: Use natural language understanding to extract or infer correct parameters
4. **Execute Tools**: Call tools with appropriate parameters
5. **Synthesize Response**: Combine tool results into a coherent, helpful answer

OUTPUT FORMAT:
Always explain your reasoning process, then provide the requested information. Structure responses as:
- Brief explanation of what you're doing and why
- Tool execution results
- Clear summary or answer to the user's question

EXAMPLES:
User: "What's my SEI balance?"
Reasoning: User wants their SEI token balance. I need to use a balance-checking tool with their wallet address.
Tool: get_balance with address: ${userWalletAddress}
Response: Based on the blockchain query, your current SEI balance is [amount] SEI.

User: "Show me recent transactions"
Reasoning: User wants transaction history. I need to query blockchain data for their wallet address.
Tool: get_transactions with address: ${userWalletAddress}
Response: Here are your recent transactions: [transaction details]

SECURITY CONSTRAINTS:
- Only use provided tools with valid parameters
- Never expose private keys or sensitive data
- Validate all inputs before processing
- Use the user's wallet address from context for personal queries

IMPORTANT NOTES:
- Always reason first, then execute tools, then provide conclusions
- Trust your natural language understanding for parameter extraction
- If unsure about parameters, explain your reasoning process
- Maintain user privacy and security at all times`;
  }

  private emitRealTimeUpdate(update: {
    type: 'thinking_step' | 'tool_call' | 'execution_status';
    data: any;
    timestamp: Date;
  }) {
    try {
      // Emit real-time update via WebSocket if available
      // This would typically be done through a WebSocket service
      this.logger.debug(`[AI_AGENT] Real-time update:`, update);

      // TODO: Implement WebSocket emission
      // For now, we'll just log the update
      this.logger.log(`[AI_AGENT] Real-time update [${update.type}]:`, {
        timestamp: update.timestamp.toISOString(),
        data: update.data,
      });
    } catch (error) {
      this.logger.error(`[AI_AGENT] Failed to emit real-time update:`, error);
    }
  }
}
