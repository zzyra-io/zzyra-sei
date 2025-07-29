import { Injectable, Logger } from '@nestjs/common';
import { BlockHandler, BlockExecutionContext } from '@zyra/types';
import { DatabaseService } from '../../services/database.service';
import { ExecutionLogger } from '../execution-logger';
import { LLMProviderManager } from './ai-agent/LLMProviderManager';
import { MCPServerManager } from './ai-agent/MCPServerManager';
import { SecurityValidator } from './ai-agent/SecurityValidator';
import { ReasoningEngine } from './ai-agent/ReasoningEngine';

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

      // Format toolCalls to match the expected schema
      const formattedToolCalls = ((result as any).toolCalls || []).map(
        (call: any) => ({
          name: call.name || call.tool || 'unknown',
          parameters: call.parameters || call.args || {},
          result: call.result || call.output || null,
        }),
      );

      const output = {
        success: true,
        result: processedResult,
        response: processedResult, // Add 'response' field for {data.response} templates
        data: processedResult, // Add 'data' field for generic data access
        output: processedResult, // Add 'output' field for {previousBlock.output} templates
        steps: (result as any).steps || [],
        toolCalls: formattedToolCalls,
        executionTime: Date.now() - startTime,
        sessionId: session.id,
        // Additional fields for template consumption
        text: processedResult,
        content: processedResult,
        summary: processedResult,
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
        selectedTools: config.selectedTools || [],
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

    for (const toolConfig of selectedTools) {
      try {
        this.logger.log(
          `Loading tool: ${toolConfig.name} (${toolConfig.type}) for user ${userId}`,
        );

        if (toolConfig.type === 'mcp') {
          // For MCP tools, we need to discover and connect to the specific server
          const mcpTools = await this.loadMCPTools(toolConfig, userId);
          tools.push(...mcpTools);
        } else if (toolConfig.type === 'goat') {
          // For GOAT tools, we'll implement this later
          this.logger.warn(
            `GOAT tools not yet implemented: ${toolConfig.name}`,
          );
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
      // Map tool IDs to MCP server configurations
      const serverConfigs = this.getMCPServerConfigs(toolConfig.id);

      for (const serverConfig of serverConfigs) {
        this.logger.log(
          `Connecting to MCP server: ${serverConfig.name} for tool: ${toolConfig.name}`,
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

  private getMCPServerConfigs(toolId: string): any[] {
    // Map tool IDs to MCP server configurations
    const serverConfigs: Record<string, any> = {
      filesystem: {
        name: 'filesystem-server',
        command: 'npx',
        args: ['@modelcontextprotocol/server-filesystem', process.cwd()],
        env: {},
        timeout: 30000,
      },
      'brave-search': {
        name: 'brave-search-server',
        command: 'npx',
        args: ['@modelcontextprotocol/server-brave-search'],
        env: {
          BRAVE_API_KEY: process.env.BRAVE_API_KEY || 'demo-key',
        },
        timeout: 30000,
      },
      postgres: {
        name: 'postgres-server',
        command: 'npx',
        args: ['@modelcontextprotocol/server-postgres'],
        env: {
          DATABASE_URL:
            process.env.DATABASE_URL || 'postgresql://localhost/zyra',
        },
        timeout: 30000,
      },
      git: {
        name: 'git-server',
        command: 'npx',
        args: ['@modelcontextprotocol/server-git'],
        env: {},
        timeout: 30000,
      },
    };

    const config = serverConfigs[toolId];
    if (config) {
      return [config];
    } else {
      this.logger.warn(
        `No MCP server configuration found for tool ID: ${toolId}`,
      );
      return [];
    }
  }

  private async executeAgent(
    session: any,
    provider: any,
    tools: any[],
    config: AIAgentConfig,
    userId: string,
  ) {
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

    // Execute with reasoning engine
    this.logger.log(`[AI_AGENT] Calling reasoning engine`);
    const executionPromise = this.reasoningEngine.execute({
      prompt: config.agent.userPrompt,
      systemPrompt: config.agent.systemPrompt,
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
      return result;
    } catch (error) {
      this.logger.error(`[AI_AGENT] Reasoning engine execution failed:`, error);
      throw error;
    }
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
}
