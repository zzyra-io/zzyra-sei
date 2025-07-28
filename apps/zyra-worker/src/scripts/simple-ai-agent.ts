#!/usr/bin/env ts-node

/**
 * Simple AI Agent Execution Script
 * Usage: OPENROUTER_API_KEY=your_key ts-node src/scripts/simple-ai-agent.ts
 * 
 * This script directly imports and executes the AI Agent Handler
 * without NestJS dependency injection - just like a regular workflow execution
 */

import { Logger } from '@nestjs/common';
import { AIAgentHandler } from '../workers/handlers/AIAgentHandler';
import { LLMProviderManager } from '../workers/handlers/ai-agent/LLMProviderManager';
import { MCPServerManager } from '../workers/handlers/ai-agent/MCPServerManager';
import { SecurityValidator } from '../workers/handlers/ai-agent/SecurityValidator';
import { ReasoningEngine } from '../workers/handlers/ai-agent/ReasoningEngine';
import { randomUUID } from 'crypto';

// Simple mock implementations
class SimpleConfigService {
  get<T>(key: string, defaultValue?: T): T {
    const value = process.env[key] || defaultValue;
    return value as T;
  }
}

class SimpleDatabaseService {
  prisma = {
    aiAgentExecution: {
      create: async (data: any) => {
        console.log('💾 Creating AI Agent execution:', data.data.agentConfig.name);
        return { id: randomUUID(), ...data.data, createdAt: new Date() };
      },
      update: async ({ where, data }: any) => {
        console.log('💾 Updating AI Agent execution:', where.id);
        return { id: where.id, ...data, updatedAt: new Date() };
      },
    },
    mcpServer: {
      create: async (data: any) => ({ id: randomUUID(), ...data.data }),
      findMany: async () => [],
      findUnique: async () => null,
      update: async ({ where, data }: any) => ({ id: where.id, ...data }),
    },
    user: {
      findUnique: async ({ where }: any) => ({
        id: where.id,
        role: 'user',
        email: 'demo@example.com',
      }),
    },
    executions: {
      findById: async (id: string) => ({
        id,
        userId: 'demo-user',
        workflowId: 'demo-workflow',
      }),
    },
  };
}

class SimpleExecutionLogger {
  private logger = new Logger('ExecutionLogger');

  async logExecutionEvent(executionId: string, event: any): Promise<void> {
    if (event.level === 'error') {
      this.logger.error(`[${executionId}] ${event.message}`);
    } else {
      this.logger.log(`[${executionId}] ${event.message}`);
    }
  }

  createNodeLogger(executionId: string, nodeId: string) {
    return {
      log: (message: string, data?: any) => console.log(`[${nodeId}] ${message}`, data || ''),
      debug: (message: string, data?: any) => console.log(`[${nodeId}] DEBUG: ${message}`, data || ''),
      info: (message: string, data?: any) => console.log(`[${nodeId}] ${message}`, data || ''),
      warn: (message: string, data?: any) => console.warn(`[${nodeId}] WARN: ${message}`, data || ''),
      error: (message: string, data?: any) => console.error(`[${nodeId}] ERROR: ${message}`, data || ''),
    };
  }
}

async function createAIAgentHandler() {
  const configService = new SimpleConfigService() as any;
  const databaseService = new SimpleDatabaseService() as any;
  const executionLogger = new SimpleExecutionLogger() as any;

  // Create AI Agent components
  const llmProviderManager = new LLMProviderManager(configService);
  const mcpServerManager = new MCPServerManager(databaseService);
  const securityValidator = new SecurityValidator(databaseService);
  const reasoningEngine = new ReasoningEngine(databaseService);

  // Create main handler
  return new AIAgentHandler(
    databaseService,
    executionLogger,
    llmProviderManager,
    mcpServerManager,
    securityValidator,
    reasoningEngine,
  );
}

function createExecutionContext(nodeId: string, executionId: string) {
  const logger = new Logger('NodeExecution');
  
  return {
    nodeId,
    executionId,
    workflowId: 'simple-workflow',
    userId: 'demo-user',
    inputs: {},
    config: {},
    previousOutputs: {},
    logger: {
      log: (message: string, data?: any) => logger.log(message, data),
      debug: (message: string, data?: any) => logger.debug(message, data),
      info: (message: string, data?: any) => logger.log(message, data),
      warn: (message: string, data?: any) => logger.warn(message, data),
      error: (message: string, data?: any) => logger.error(message, data),
    },
    workflowData: {
      nodeId,
      nodeType: 'AI_AGENT',
      executionTime: new Date().toISOString(),
    },
  };
}

async function runSimpleDemo() {
  const logger = new Logger('SimpleAIAgent');
  
  logger.log('🚀 Starting Simple AI Agent Demo...\n');

  // Check for API key
  if (!process.env.OPENROUTER_API_KEY && !process.env.OPENAI_API_KEY && !process.env.ANTHROPIC_API_KEY) {
    logger.error('❌ Please set one of these environment variables:');
    logger.error('   OPENROUTER_API_KEY');
    logger.error('   OPENAI_API_KEY');
    logger.error('   ANTHROPIC_API_KEY');
    process.exit(1);
  }

  try {
    // Create AI Agent handler
    logger.log('📦 Creating AI Agent handler...');
    const aiAgentHandler = await createAIAgentHandler();

    // Get user prompt or use default
    const userPrompt = process.argv[2] || 'Explain the concept of recursion in programming with a simple example.';
    logger.log(`💭 User prompt: ${userPrompt}\n`);

    // Create AI Agent node configuration
    const aiAgentNode = {
      id: 'simple-ai-agent',
      type: 'AI_AGENT',
      data: {
        provider: {
          type: process.env.OPENROUTER_API_KEY ? 'openrouter' : 
                process.env.OPENAI_API_KEY ? 'openai' : 'anthropic',
          model: process.env.OPENROUTER_API_KEY ? 'anthropic/claude-3.5-sonnet' : 
                 process.env.OPENAI_API_KEY ? 'gpt-4' : 'claude-3-5-sonnet-20241022',
          temperature: 0.7,
          maxTokens: 1500,
        },
        agent: {
          name: 'Simple Demo Agent',
          systemPrompt: 'You are a helpful AI assistant. Provide clear, concise, and helpful responses.',
          userPrompt,
          maxSteps: 5,
          thinkingMode: 'deliberate',
        },
        selectedTools: [],
        execution: {
          mode: 'autonomous',
          timeout: 60000,
          requireApproval: false,
          saveThinking: true,
        },
      },
    };

    // Create execution context
    const executionId = randomUUID();
    const executionContext = createExecutionContext(aiAgentNode.id, executionId);

    // Execute AI Agent
    logger.log('🤖 Executing AI Agent...\n');
    const startTime = Date.now();

    const result = await aiAgentHandler.execute(aiAgentNode, executionContext);
    
    const executionTime = Date.now() - startTime;
    logger.log(`\n✅ Execution completed in ${executionTime}ms\n`);

    // Display results
    console.log('=' .repeat(80));
    console.log('📊 EXECUTION RESULTS');
    console.log('=' .repeat(80));

    if (result.success) {
      console.log('\n📝 AI Response:');
      console.log('-'.repeat(50));
      console.log(result.result);
      console.log('-'.repeat(50));

      if (result.steps && result.steps.length > 0) {
        console.log('\n🧠 Thinking Process:');
        result.steps.forEach((step: any, index: number) => {
          console.log(`\n${index + 1}. ${step.type.toUpperCase()}`);
          console.log(`   ${step.reasoning?.substring(0, 150)}...`);
          if (step.confidence) {
            console.log(`   Confidence: ${Math.round(step.confidence * 100)}%`);
          }
        });
      }

      if (result.toolCalls && result.toolCalls.length > 0) {
        console.log('\n🔧 Tool Calls:');
        result.toolCalls.forEach((call: any, index: number) => {
          console.log(`${index + 1}. ${call.name}: ${JSON.stringify(call.parameters)}`);
        });
      }

      console.log(`\n📈 Performance:`);
      console.log(`   Execution Time: ${executionTime}ms`);
      console.log(`   Thinking Steps: ${result.steps?.length || 0}`);
      console.log(`   Tool Calls: ${result.toolCalls?.length || 0}`);
      console.log(`   Session ID: ${result.sessionId}`);

    } else {
      console.log('\n❌ Execution Failed:');
      console.log(`   Error: ${result.error}`);
      console.log(`   Node ID: ${result.nodeId}`);
      
      if (result.error?.includes('Security violations')) {
        console.log('\n🔒 This appears to be a security validation failure.');
        console.log('   The AI Agent correctly blocked potentially harmful content.');
      }
    }

    console.log('\n' + '=' .repeat(80));

  } catch (error) {
    logger.error('\n💥 Demo failed:');
    logger.error(error instanceof Error ? error.message : String(error));
    
    if (error instanceof Error && error.stack) {
      logger.error('\nStack trace:');
      logger.error(error.stack);
    }
    
    process.exit(1);
  }
}

function showUsage() {
  console.log(`
🤖 Simple AI Agent Demo

Usage:
  OPENROUTER_API_KEY=your_key ts-node src/scripts/simple-ai-agent.ts [prompt]

Examples:
  ts-node src/scripts/simple-ai-agent.ts
  ts-node src/scripts/simple-ai-agent.ts "Write a Python function to calculate fibonacci numbers"
  ts-node src/scripts/simple-ai-agent.ts "Explain machine learning in simple terms"

Environment Variables:
  OPENROUTER_API_KEY - OpenRouter API key (recommended)
  OPENAI_API_KEY     - OpenAI API key
  ANTHROPIC_API_KEY  - Anthropic API key

The script will automatically detect which API key is available and use the appropriate provider.
`);
}

// Main execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showUsage();
    process.exit(0);
  }

  runSimpleDemo().catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

export { runSimpleDemo, createAIAgentHandler };