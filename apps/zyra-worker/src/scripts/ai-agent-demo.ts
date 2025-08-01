#!/usr/bin/env ts-node

/**
 * AI Agent Demo Script
 * Usage: OPENROUTER_API_KEY=your_key ts-node src/scripts/ai-agent-demo.ts
 *
 * This script demonstrates real AI Agent execution with configurable prompts and tools
 */

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from '../app.module';
import { DatabaseService } from '../services/database.service';
import { ExecutionLogger } from '../workers/execution-logger';
import { AIAgentHandler } from '../workers/handlers/AIAgentHandler';
import { LLMProviderManager } from '../workers/handlers/ai-agent/LLMProviderManager';
import { MCPServerManager } from '../workers/handlers/ai-agent/MCPServerManager';
import { SecurityValidator } from '../workers/handlers/ai-agent/SecurityValidator';
import { ReasoningEngine } from '../workers/handlers/ai-agent/ReasoningEngine';
import { SubscriptionService } from '../workers/handlers/ai-agent/SubscriptionService';
import { CacheService } from '../workers/handlers/ai-agent/CacheService';
import { ToolAnalyticsService } from '../workers/handlers/ai-agent/ToolAnalyticsService';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

interface DemoConfig {
  provider: 'openrouter' | 'openai' | 'anthropic';
  model?: string;
  prompt: string;
  systemPrompt?: string;
  thinkingMode: 'fast' | 'deliberate' | 'collaborative';
  maxSteps?: number;
  timeout?: number;
}

const DEMO_CONFIGS: Record<string, DemoConfig> = {
  'math-solver': {
    provider: 'openrouter',
    model: 'anthropic/claude-3.5-sonnet',
    systemPrompt: 'You are a helpful math tutor. Show your work step by step.',
    prompt: 'Solve this equation: 3x + 7 = 22. What is x?',
    thinkingMode: 'deliberate',
    maxSteps: 5,
  },
  'code-assistant': {
    provider: 'openrouter',
    model: 'anthropic/claude-3.5-sonnet',
    systemPrompt:
      'You are a senior software engineer. Provide clean, well-documented code.',
    prompt:
      'Write a TypeScript function to find the longest common subsequence of two strings.',
    thinkingMode: 'deliberate',
    maxSteps: 8,
  },
  'creative-writer': {
    provider: 'openrouter',
    model: 'anthropic/claude-3.5-sonnet',
    systemPrompt:
      'You are a creative writer. Write engaging, original content.',
    prompt: 'Write a short story about a robot who discovers they can dream.',
    thinkingMode: 'collaborative',
    maxSteps: 10,
  },
  'business-analyst': {
    provider: 'openrouter',
    model: 'anthropic/claude-3.5-sonnet',
    systemPrompt:
      'You are a business analyst. Provide data-driven insights and recommendations.',
    prompt:
      'Analyze the pros and cons of implementing AI chatbots for customer service in a small e-commerce business.',
    thinkingMode: 'deliberate',
    maxSteps: 12,
  },
  'quick-question': {
    provider: 'openrouter',
    model: 'anthropic/claude-3.5-sonnet',
    systemPrompt:
      'You are a helpful assistant. Provide concise, accurate answers.',
    prompt: 'What are the key differences between REST and GraphQL APIs?',
    thinkingMode: 'fast',
    maxSteps: 3,
  },
};

class AIAgentDemo {
  private logger = new Logger('AIAgentDemo');
  private app: any;
  private databaseService: DatabaseService;
  private executionLogger: ExecutionLogger;
  private configService: ConfigService;
  private aiAgentHandler: AIAgentHandler;

  async initialize() {
    this.logger.log('🚀 Initializing AI Agent Demo...');

    // Create NestJS application context
    this.app = await NestFactory.createApplicationContext(AppModule, {
      logger: ['error', 'warn', 'log'],
    });

    // Get services from DI container
    this.databaseService = this.app.get(DatabaseService);
    this.executionLogger = this.app.get(ExecutionLogger);
    this.configService = this.app.get(ConfigService);

    // Create AI Agent components
    const cacheService = new CacheService(this.configService);
    const llmProviderManager = new LLMProviderManager(
      this.configService,
      cacheService,
    );
    const toolAnalyticsService = new ToolAnalyticsService(
      this.databaseService,
      cacheService,
    );
    const mcpServerManager = new MCPServerManager(
      this.databaseService,
      cacheService,
    );
    const securityValidator = new SecurityValidator(this.databaseService);
    const subscriptionService = new SubscriptionService();
    const reasoningEngine = new ReasoningEngine(
      this.databaseService,
      subscriptionService,
      toolAnalyticsService,
      cacheService,
    );

    // Create AI Agent handler
    const {
      EnhancedReasoningEngine,
    } = require('../workers/handlers/ai-agent/EnhancedReasoningEngine');
    const {
      GoatPluginManager,
    } = require('../workers/handlers/goat/GoatPluginManager');

    this.aiAgentHandler = new AIAgentHandler(
      this.databaseService,
      this.executionLogger,
      llmProviderManager,
      mcpServerManager,
      securityValidator,
      reasoningEngine,
      new EnhancedReasoningEngine(),
      new GoatPluginManager(),
    );

    this.logger.log('✅ AI Agent Demo initialized');
  }

  async runDemo(configName: string, customPrompt?: string) {
    const config = DEMO_CONFIGS[configName];
    if (!config) {
      throw new Error(
        `Demo config '${configName}' not found. Available: ${Object.keys(DEMO_CONFIGS).join(', ')}`,
      );
    }

    this.logger.log(`\n📋 Running demo: ${configName}`);
    this.logger.log(`Provider: ${config.provider}`);
    this.logger.log(`Model: ${config.model || 'default'}`);
    this.logger.log(`Thinking Mode: ${config.thinkingMode}`);
    this.logger.log(`Prompt: ${customPrompt || config.prompt}\n`);

    // Check API key
    const apiKeyEnvVar =
      config.provider === 'openrouter'
        ? 'OPENROUTER_API_KEY'
        : config.provider === 'openai'
          ? 'OPENAI_API_KEY'
          : 'ANTHROPIC_API_KEY';

    if (!process.env[apiKeyEnvVar]) {
      throw new Error(`Please set ${apiKeyEnvVar} environment variable`);
    }

    // Create demo user and execution
    const userId = await this.createDemoUser();
    const executionId = await this.createDemoExecution(userId);

    // Create AI Agent node
    const aiAgentNode = {
      id: 'demo-ai-agent',
      type: 'AI_AGENT',
      data: {
        provider: {
          type: config.provider,
          model:
            config.model ||
            (config.provider === 'openrouter'
              ? 'anthropic/claude-3.5-sonnet'
              : 'default'),
          temperature: 0.7,
          maxTokens: 2000,
        },
        agent: {
          name: `Demo ${configName}`,
          systemPrompt:
            config.systemPrompt || 'You are a helpful AI assistant.',
          userPrompt: customPrompt || config.prompt,
          maxSteps: config.maxSteps || 5,
          thinkingMode: config.thinkingMode,
        },
        selectedTools: [], // No tools for basic demo
        execution: {
          mode: 'autonomous',
          timeout: config.timeout || 60000,
          requireApproval: false,
          saveThinking: true,
        },
      },
    };

    // Create execution context
    const executionContext = {
      nodeId: aiAgentNode.id,
      executionId,
      workflowId: 'demo-workflow',
      userId,
      inputs: {},
      config: aiAgentNode.data,
      previousOutputs: {},
      logger: {
        log: (message: string, data?: any) => this.logger.log(message, data),
        debug: (message: string, data?: any) =>
          this.logger.debug(message, data),
        info: (message: string, data?: any) => this.logger.log(message, data),
        warn: (message: string, data?: any) => this.logger.warn(message, data),
        error: (message: string, data?: any) =>
          this.logger.error(message, data),
      },
      workflowData: {
        nodeId: aiAgentNode.id,
        nodeType: 'AI_AGENT',
        executionTime: new Date().toISOString(),
      },
    };

    // Execute AI Agent
    this.logger.log('🤖 Executing AI Agent...\n');
    const startTime = Date.now();

    try {
      const result = await this.aiAgentHandler.execute(
        aiAgentNode,
        executionContext,
      );
      const executionTime = Date.now() - startTime;

      this.logger.log(`\n✅ Execution completed in ${executionTime}ms`);
      this.logger.log('📊 Results:');
      this.logger.log('─'.repeat(80));

      if (result.success) {
        this.logger.log(`\n📝 Response:\n${result.result}\n`);

        if (result.steps && result.steps.length > 0) {
          this.logger.log(
            `🧠 Thinking Process (${result.steps.length} steps):`,
          );
          result.steps.forEach((step: any, index: number) => {
            this.logger.log(`\nStep ${index + 1}: ${step.type}`);
            this.logger.log(
              `Reasoning: ${step.reasoning?.substring(0, 200)}...`,
            );
            if (step.confidence) {
              this.logger.log(
                `Confidence: ${Math.round(step.confidence * 100)}%`,
              );
            }
          });
        }

        if (result.toolCalls && result.toolCalls.length > 0) {
          this.logger.log(`\n🔧 Tool Calls: ${result.toolCalls.length}`);
          result.toolCalls.forEach((call: any, index: number) => {
            this.logger.log(
              `${index + 1}. ${call.name}: ${JSON.stringify(call.parameters)}`,
            );
          });
        }

        this.logger.log(`\n⏱️  Total execution time: ${executionTime}ms`);
        this.logger.log(`💾 Session ID: ${result.sessionId}`);
      } else {
        this.logger.error(`\n❌ Execution failed: ${result.error}`);
        if (result.error?.includes('Security violations')) {
          this.logger.warn(
            '🔒 This failure was due to security validation - this is expected behavior for malicious content',
          );
        }
      }

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(`\n💥 Execution failed after ${executionTime}ms:`);
      this.logger.error(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  private async createDemoUser(): Promise<string> {
    // For demo purposes, create or use existing demo user
    const demoUserId = 'demo-user-' + Date.now();

    try {
      await this.databaseService.prisma.user.create({
        data: {
          id: demoUserId,
          email: `demo-${Date.now()}@example.com`,
        },
      });
      this.logger.debug(`Created demo user: ${demoUserId}`);
    } catch (error) {
      // User might already exist, that's fine
      this.logger.debug(`Using existing demo user: ${demoUserId}`);
    }

    return demoUserId;
  }

  private async createDemoExecution(userId: string): Promise<string> {
    const executionId = randomUUID();

    try {
      // Create a demo workflow first
      const workflowId = randomUUID();
      await this.databaseService.prisma.workflow.create({
        data: {
          id: workflowId,
          userId,
          name: 'AI Agent Demo Workflow',
          description: 'Demo workflow for testing AI Agent',
          nodes: [{ id: 'demo-ai-agent', type: 'AI_AGENT' }],
          edges: [],
        },
      });

      // Create execution
      await this.databaseService.prisma.workflowExecution.create({
        data: {
          id: executionId,
          workflowId,
          userId,
          status: 'running',
          input: {},
        },
      });

      this.logger.debug(`Created demo execution: ${executionId}`);
    } catch (error) {
      this.logger.warn(`Failed to create demo execution: ${error}`);
    }

    return executionId;
  }

  async cleanup() {
    if (this.app) {
      await this.app.close();
      this.logger.log('🧹 Demo cleanup completed');
    }
  }

  listDemos() {
    this.logger.log('\n📚 Available Demo Configurations:');
    this.logger.log('─'.repeat(50));

    Object.entries(DEMO_CONFIGS).forEach(([name, config]) => {
      this.logger.log(`\n${name}:`);
      this.logger.log(`  Provider: ${config.provider}`);
      this.logger.log(`  Mode: ${config.thinkingMode}`);
      this.logger.log(`  Prompt: ${config.prompt.substring(0, 80)}...`);
    });

    this.logger.log(
      '\nUsage: ts-node src/scripts/ai-agent-demo.ts <demo-name> [custom-prompt]',
    );
    this.logger.log(
      'Example: ts-node src/scripts/ai-agent-demo.ts math-solver "What is 15% of 240?"',
    );
  }
}

async function main() {
  const demo = new AIAgentDemo();

  try {
    const args = process.argv.slice(2);

    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
      demo.listDemos();
      return;
    }

    const configName = args[0];
    const customPrompt = args.slice(1).join(' ') || undefined;

    await demo.initialize();
    await demo.runDemo(configName, customPrompt);
  } catch (error) {
    console.error(
      '\n💥 Demo failed:',
      error instanceof Error ? error.message : String(error),
    );

    if (error instanceof Error && error.message.includes('API_KEY')) {
      console.log('\n💡 Tip: Set your API key environment variable:');
      console.log('   export OPENROUTER_API_KEY=your_key_here');
      console.log('   export OPENAI_API_KEY=your_key_here');
      console.log('   export ANTHROPIC_API_KEY=your_key_here');
    }

    process.exit(1);
  } finally {
    await demo.cleanup();
  }
}

// Run the demo if this script is executed directly
if (require.main === module) {
  main();
}

export { AIAgentDemo, DEMO_CONFIGS };
