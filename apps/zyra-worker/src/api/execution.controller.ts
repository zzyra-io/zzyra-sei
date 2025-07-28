import { Controller, Post, Body } from '@nestjs/common'
import { AIAgentHandler } from '../workers/handlers/AIAgentHandler'
import { LLMProviderManager } from '../workers/handlers/ai-agent/LLMProviderManager'
import { MCPServerManager } from '../workers/handlers/ai-agent/MCPServerManager'
import { SecurityValidator } from '../workers/handlers/ai-agent/SecurityValidator'
import { ReasoningEngine } from '../workers/handlers/ai-agent/ReasoningEngine'
import { SubscriptionService } from '../workers/handlers/ai-agent/SubscriptionService'
import { ConfigService } from '@nestjs/config'

// Simple mock services for worker execution endpoint
class MockDatabaseService {
  prisma = {
    aiAgentExecution: {
      create: async (data: any) => ({ id: data.data.id, ...data.data }),
      update: async ({ where, data }: any) => ({ id: where.id, ...data }),
    },
    user: {
      findUnique: async ({ where }: any) => ({
        id: where.id,
        role: 'admin',
        permissions: ['mcp_access', 'blockchain_operations'],
      }),
    },
  }
}

class MockExecutionLogger {
  async logExecutionEvent(executionId: string, event: any): Promise<void> {
    console.log(`[${executionId}] ${event.message}`)
  }
  
  createNodeLogger(executionId: string, nodeId: string) {
    return {
      log: (message: string, data?: any) => console.log(`[${nodeId}] ${message}`, data || ''),
      debug: (message: string, data?: any) => console.log(`[${nodeId}] DEBUG: ${message}`, data || ''),
      info: (message: string, data?: any) => console.log(`[${nodeId}] ${message}`, data || ''),
      warn: (message: string, data?: any) => console.warn(`[${nodeId}] WARN: ${message}`, data || ''),
      error: (message: string, data?: any) => console.error(`[${nodeId}] ERROR: ${message}`, data || ''),
    }
  }
}

@Controller('execute-node')
export class ExecutionController {
  private aiAgentHandler: AIAgentHandler

  constructor(private readonly configService: ConfigService) {
    // Initialize AI Agent handler with mock services
    const databaseService = new MockDatabaseService() as any
    const executionLogger = new MockExecutionLogger() as any
    const llmProviderManager = new LLMProviderManager(configService)
    const mcpServerManager = new MCPServerManager(databaseService)
    const securityValidator = new SecurityValidator(databaseService)
    const subscriptionService = new SubscriptionService()
    const reasoningEngine = new ReasoningEngine(databaseService, subscriptionService)

    this.aiAgentHandler = new AIAgentHandler(
      databaseService,
      executionLogger,
      llmProviderManager,
      mcpServerManager,
      securityValidator,
      reasoningEngine,
    )
  }

  @Post()
  async executeNode(@Body() body: { node: any; context: any }) {
    try {
      const result = await this.aiAgentHandler.execute(body.node, body.context)
      
      return {
        success: true,
        result: result.result,
        steps: result.steps,
        toolCalls: result.toolCalls,
        sessionId: result.sessionId,
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}