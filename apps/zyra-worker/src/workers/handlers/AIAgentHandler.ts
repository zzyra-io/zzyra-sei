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
      this.logger.log(`Starting AI Agent execution for node: ${nodeId}`);

      // Parse and validate configuration
      const config = this.parseConfiguration(node.data);
      if (!config) {
        throw new Error('Invalid AI Agent configuration');
      }

      // Security validation
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

      // Create execution session
      const session = await this.createExecutionSession(config, ctx);

      // Load selected tools
      const tools = await this.loadTools(config.selectedTools, userId);

      // Initialize LLM provider
      const provider = await this.llmProviderManager.getProvider(
        config.provider.type,
        config.provider,
      );

      // Execute AI agent
      const result = await this.executeAgent(
        session,
        provider,
        tools,
        config,
        userId,
      );

      // Log execution completion
      await this.logExecution(executionId, nodeId, {
        status: 'completed',
        duration: Date.now() - startTime,
        result: (result as any).text || (result as any).content,
        steps: (result as any).steps?.length || 0,
        toolCalls: (result as any).toolCalls?.length || 0,
      });

      return {
        success: true,
        result: (result as any).text || (result as any).content,
        steps: (result as any).steps || [],
        toolCalls: (result as any).toolCalls || [],
        executionTime: Date.now() - startTime,
        sessionId: session.id,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error(
        `AI Agent execution failed for node ${nodeId}: ${errorMessage}`,
      );

      // Log execution failure
      await this.logExecution(executionId, nodeId, {
        status: 'failed',
        duration: Date.now() - startTime,
        error: errorMessage,
      });

      return {
        success: false,
        error: errorMessage,
        nodeId,
        executionTime: Date.now() - startTime,
      };
    }
  }

  private parseConfiguration(data: any): AIAgentConfig | null {
    try {
      return {
        provider: {
          type: data.provider?.type || 'openrouter',
          model: data.provider?.model || 'openai/gpt-4o-mini',
          temperature: data.provider?.temperature || 0.7,
          maxTokens: data.provider?.maxTokens || 4000,
        },
        agent: {
          name: data.agent?.name || 'AI Assistant',
          systemPrompt:
            data.agent?.systemPrompt || 'You are a helpful AI assistant.',
          userPrompt: data.agent?.userPrompt || '',
          maxSteps: data.agent?.maxSteps || 10,
          thinkingMode: data.agent?.thinkingMode || 'fast',
        },
        selectedTools: data.selectedTools || [],
        execution: {
          mode: data.execution?.mode || 'autonomous',
          timeout: data.execution?.timeout || this.maxExecutionTime,
          requireApproval: data.execution?.requireApproval || false,
          saveThinking: data.execution?.saveThinking || true,
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
        if (toolConfig.type === 'mcp') {
          // For MCP tools, we need to get all tools from the server
          this.logger.log(
            `Loading MCP tools for user ${userId}, tool config: ${toolConfig.id}`,
          );
          const servers = await this.mcpServerManager.getUserServers(userId);
          this.logger.log(`Found ${servers.length} servers for user ${userId}`);

          for (const server of servers) {
            // Add all tools from this server
            for (const tool of server.tools) {
              // Convert MCP tool to AI SDK function format
              const aiTool = {
                name: tool.name,
                description: tool.description,
                parameters: tool.inputSchema,
                execute: async (args: any) => {
                  try {
                    return await tool.execute(args);
                  } catch (error) {
                    this.logger.error(
                      `Tool execution failed for ${tool.name}:`,
                      error,
                    );
                    throw error;
                  }
                },
              };
              tools.push(aiTool);
            }
          }

          this.logger.log(
            `Loaded ${tools.length} MCP tools for user ${userId}`,
          );
        }
        // Add other tool types (goat, builtin) here later
      } catch (error) {
        this.logger.warn(
          `Failed to load tool ${toolConfig.name}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    return tools;
  }

  private async executeAgent(
    session: any,
    provider: any,
    tools: any[],
    config: AIAgentConfig,
    userId: string,
  ) {
    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new Error(
            `AI Agent execution timeout after ${config.execution.timeout}ms`,
          ),
        );
      }, config.execution.timeout);
    });

    // Execute with reasoning engine
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

    return Promise.race([executionPromise, timeoutPromise]);
  }

  private async logExecution(executionId: string, nodeId: string, data: any) {
    try {
      await this.executionLogger.logExecutionEvent(executionId, {
        level: data.status === 'completed' ? 'info' : 'error',
        message: `AI Agent execution ${data.status}`,
        node_id: nodeId,
        data,
      });
    } catch (error) {
      this.logger.error(
        `Failed to log execution: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
