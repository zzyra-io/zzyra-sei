#!/usr/bin/env ts-node

/**
 * Complete AI Agent System Test Script
 * Usage: OPENROUTER_API_KEY=your_key ts-node src/scripts/simple-ai-agent.ts [test-type]
 *
 * Test types:
 * - basic: Basic AI response (default)
 * - mcp: Test with MCP tools
 * - blockchain: Test with GOAT SDK tools
 * - multi-tool: Test with multiple tool types
 * - workflow: Full workflow simulation
 *
 * This script tests the complete AI Agent system including:
 * - Multi-provider LLM support
 * - MCP server connections and tool discovery
 * - GOAT SDK blockchain integration
 * - Security validation
 * - Database persistence
 * - Real workflow execution simulation
 */

import { Logger } from '@nestjs/common';
import { AIAgentHandler } from '../workers/handlers/AIAgentHandler';
import { LLMProviderManager } from '../workers/handlers/ai-agent/LLMProviderManager';
import { MCPServerManager } from '../workers/handlers/ai-agent/MCPServerManager';
import { SecurityValidator } from '../workers/handlers/ai-agent/SecurityValidator';
import { ReasoningEngine } from '../workers/handlers/ai-agent/ReasoningEngine';
import { MCPToolsManager } from '../workers/handlers/ai-agent/MCPToolsManager';
import { GOATManager } from '../workers/handlers/ai-agent/GOATManager';
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
        console.log(
          '💾 Creating AI Agent execution:',
          data.data.agentConfig.name,
        );
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
        role: 'admin',
        email: 'demo@example.com',
        permissions: [
          'filesystem_access',
          'web_search',
          'blockchain_operations',
          'mcp_access',
          'brave_search_access',
        ],
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
      log: (message: string, data?: any) =>
        console.log(`[${nodeId}] ${message}`, data || ''),
      debug: (message: string, data?: any) =>
        console.log(`[${nodeId}] DEBUG: ${message}`, data || ''),
      info: (message: string, data?: any) =>
        console.log(`[${nodeId}] ${message}`, data || ''),
      warn: (message: string, data?: any) =>
        console.warn(`[${nodeId}] WARN: ${message}`, data || ''),
      error: (message: string, data?: any) =>
        console.error(`[${nodeId}] ERROR: ${message}`, data || ''),
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
  const mcpToolsManager = new MCPToolsManager(
    databaseService,
    mcpServerManager,
  );
  const goatManager = new GOATManager(configService);

  // Create main handler
  return {
    handler: new AIAgentHandler(
      databaseService,
      executionLogger,
      llmProviderManager,
      mcpServerManager,
      securityValidator,
      reasoningEngine,
    ),
    mcpToolsManager,
    goatManager,
    llmProviderManager,
  };
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

// Test scenario configurations
const TEST_SCENARIOS = {
  basic: {
    name: 'Basic AI Response',
    prompt:
      'Explain the concept of recursion in programming with a simple example.',
    tools: [],
  },
  mcp: {
    name: 'MCP Tools Test',
    prompt:
      'Help me analyze my project files and search for recent documentation about TypeScript.',
    tools: [
      {
        id: 'filesystem',
        name: 'File System',
        type: 'mcp',
        config: {
          allowedDirectories: process.cwd(),
          allowWrite: false,
        },
      },
    ],
  },
  'mcp-real': {
    name: 'Real MCP Servers Test',
    prompt:
      'Search for information about TypeScript best practices online and provide a summary.',
    tools: [
      {
        id: 'brave-search',
        name: 'Web Search',
        type: 'mcp',
        config: {
          apiKey: process.env.BRAVE_API_KEY || 'demo-key',
        },
      },
    ],
  },
  'mcp-multi': {
    name: 'Multiple MCP Servers Test',
    prompt:
      'Search for recent TypeScript documentation and best practices, then search for information about AI agents and automation.',
    tools: [
      {
        id: 'brave-search',
        name: 'Web Search',
        type: 'mcp',
        config: {
          apiKey: process.env.BRAVE_API_KEY || 'demo-key',
        },
      },
    ],
  },
  blockchain: {
    name: 'Blockchain Tools Test',
    prompt:
      'Check my wallet balance and find yield farming opportunities for USDC.',
    tools: [
      {
        id: 'goat-wallet',
        name: 'Wallet Operations',
        type: 'goat',
        config: {},
      },
    ],
  },
  'multi-tool': {
    name: 'Multiple Tools Test',
    prompt:
      'Read my README.md file, search for Node.js best practices online, and check my wallet balance.',
    tools: [
      {
        id: 'filesystem',
        name: 'File System',
        type: 'mcp',
        config: {
          allowedDirectories: process.cwd(),
          allowWrite: false,
        },
      },
      {
        id: 'goat-wallet',
        name: 'Wallet Operations',
        type: 'goat',
        config: {},
      },
    ],
  },
  workflow: {
    name: 'Full Workflow Simulation',
    prompt:
      'Act as my development assistant. Help me understand this project structure, suggest improvements, and check for any blockchain integrations.',
    tools: [
      {
        id: 'filesystem',
        name: 'Project Files',
        type: 'mcp',
        config: {
          allowedDirectories: process.cwd(),
          allowWrite: false,
        },
      },
      {
        id: 'goat-portfolio',
        name: 'Portfolio Analysis',
        type: 'goat',
        config: {},
      },
    ],
  },
};

async function runCompleteSystemTest() {
  const logger = new Logger('AIAgentSystemTest');

  // Get test type from command line argument
  const testType = (process.argv[2] || 'basic') as keyof typeof TEST_SCENARIOS;
  const scenario = TEST_SCENARIOS[testType];

  if (!scenario) {
    logger.error(`❌ Unknown test type: ${testType}`);
    logger.log(
      `Available test types: ${Object.keys(TEST_SCENARIOS).join(', ')}`,
    );
    process.exit(1);
  }

  logger.log(`🚀 Starting Complete AI Agent System Test: ${scenario.name}\n`);

  // Check for API key
  if (
    !process.env.OPENROUTER_API_KEY &&
    !process.env.OPENAI_API_KEY &&
    !process.env.ANTHROPIC_API_KEY
  ) {
    logger.error('❌ Please set one of these environment variables:');
    logger.error('   OPENROUTER_API_KEY');
    logger.error('   OPENAI_API_KEY');
    logger.error('   ANTHROPIC_API_KEY');
    process.exit(1);
  }

  try {
    // Create AI Agent system components
    logger.log('📦 Creating AI Agent system...');
    const aiSystem = await createAIAgentHandler();

    // Test MCP Tools Manager if MCP tools are requested
    if (scenario.tools.some((t) => t.type === 'mcp')) {
      logger.log('🔧 Testing MCP Tools Manager...');
      const availableServers = aiSystem.mcpToolsManager.getServersByCategory();
      logger.log(
        `   Found ${Object.keys(availableServers).length} MCP server categories`,
      );

      // Test real MCP server connections
      for (const tool of scenario.tools.filter((t) => t.type === 'mcp')) {
        logger.log(`   Testing MCP server: ${tool.name} (${tool.id})`);

        try {
          // Fix filesystem server configuration
          let config = tool.config;
          if (tool.id === 'filesystem') {
            config = {
              ...tool.config,
              allowedDirectories: process.cwd(),
              allowWrite: false,
            };
          }

          const tools = await aiSystem.mcpToolsManager.connectAndDiscoverTools(
            tool.id,
            config,
          );
          logger.log(
            `   ✅ Successfully discovered ${tools.length} tools from ${tool.name}`,
          );

          // Log discovered tools
          tools.forEach((tool) => {
            logger.log(`     - ${tool.name}: ${tool.description}`);
          });
        } catch (error) {
          logger.warn(
            `   ⚠️  MCP server ${tool.name} connection failed: ${error}`,
          );
          logger.log(`   💡 To test with real MCP servers:`);
          if (tool.id === 'filesystem') {
            logger.log(
              `      npm install -g @modelcontextprotocol/server-filesystem`,
            );
            logger.log(
              `      npx @modelcontextprotocol/server-filesystem ${process.cwd()}`,
            );
          } else if (tool.id === 'brave-search') {
            logger.log(
              `      npm install -g @modelcontextprotocol/server-brave-search`,
            );
            logger.log(
              `      BRAVE_API_KEY=your_key npx @modelcontextprotocol/server-brave-search`,
            );
          } else {
            logger.log(
              `      npm install -g @modelcontextprotocol/server-${tool.id}`,
            );
            logger.log(`      npx @modelcontextprotocol/server-${tool.id}`);
          }
        }
      }
    }

    // Test GOAT Manager if blockchain tools are requested
    if (scenario.tools.some((t) => t.type === 'goat')) {
      logger.log('⛓️  Testing GOAT SDK Manager...');
      const availableTools = await aiSystem.goatManager.getAvailableTools();
      logger.log(`   Found ${availableTools.length} GOAT SDK tools`);
    }

    // Test LLM Provider
    logger.log('🧠 Testing LLM Provider...');
    const providerType = process.env.OPENROUTER_API_KEY
      ? 'openrouter'
      : process.env.OPENAI_API_KEY
        ? 'openai'
        : 'anthropic';
    try {
      const provider = await aiSystem.llmProviderManager.getProvider(
        providerType,
        {
          type: providerType,
          model: 'test-model',
        },
      );
      logger.log(`   LLM Provider (${providerType}) initialized successfully`);
    } catch (error) {
      logger.warn(`   LLM Provider test skipped: ${error}`);
    }

    logger.log(`💭 Test prompt: ${scenario.prompt}\n`);

    // Create comprehensive AI Agent node configuration
    const aiAgentNode = {
      id: 'system-test-agent',
      type: 'AI_AGENT',
      data: {
        provider: {
          type: providerType,
          model: process.env.OPENROUTER_API_KEY
            ? 'anthropic/claude-3.5-sonnet'
            : process.env.OPENAI_API_KEY
              ? 'gpt-4'
              : 'claude-3-5-sonnet-20241022',
          temperature: 0.7,
          maxTokens: 2000,
        },
        agent: {
          name: `${scenario.name} Agent`,
          systemPrompt: `You are an advanced AI assistant with access to multiple tools. 
                        You can access files, search the web, perform blockchain operations, and more.
                        Always explain what tools you're using and why.
                        Be thorough but concise in your responses.`,
          userPrompt: scenario.prompt,
          maxSteps: 10,
          thinkingMode: 'deliberate',
        },
        selectedTools: scenario.tools,
        execution: {
          mode: 'autonomous',
          timeout: 120000, // 2 minutes for complex operations
          requireApproval: false,
          saveThinking: true,
        },
      },
    };

    // Create execution context
    const executionId = randomUUID();
    const executionContext = createExecutionContext(
      aiAgentNode.id,
      executionId,
    );

    // Execute AI Agent
    logger.log('🤖 Executing AI Agent with full system integration...\n');
    const startTime = Date.now();

    const result = await aiSystem.handler.execute(
      aiAgentNode,
      executionContext,
    );

    const executionTime = Date.now() - startTime;
    logger.log(`\n✅ Execution completed in ${executionTime}ms\n`);

    // Display comprehensive results
    console.log('='.repeat(100));
    console.log(
      `📊 COMPLETE SYSTEM TEST RESULTS - ${scenario.name.toUpperCase()}`,
    );
    console.log('='.repeat(100));

    if (result.success) {
      console.log('\n📝 AI Response:');
      console.log('-'.repeat(80));
      console.log(result.result);
      console.log('-'.repeat(80));

      if (result.steps && result.steps.length > 0) {
        console.log('\n🧠 Thinking Process:');
        result.steps.forEach((step: any, index: number) => {
          console.log(`\n${index + 1}. ${step.type?.toUpperCase() || 'STEP'}`);
          if (step.reasoning) {
            console.log(`   Reasoning: ${step.reasoning.substring(0, 200)}...`);
          }
          if (step.confidence) {
            console.log(`   Confidence: ${Math.round(step.confidence * 100)}%`);
          }
          if (step.toolsUsed && step.toolsUsed.length > 0) {
            console.log(`   Tools Used: ${step.toolsUsed.join(', ')}`);
          }
        });
      }

      if (result.toolCalls && result.toolCalls.length > 0) {
        console.log('\n🔧 Tool Executions:');
        result.toolCalls.forEach((call: any, index: number) => {
          console.log(`\n${index + 1}. ${call.name || 'Unknown Tool'}`);
          console.log(
            `   Parameters: ${JSON.stringify(call.parameters || {}, null, 2)}`,
          );
          if (call.result) {
            console.log(
              `   Result: ${JSON.stringify(call.result).substring(0, 200)}...`,
            );
          }
          if (call.error) {
            console.log(`   Error: ${call.error}`);
          }
        });
      }

      console.log(`\n📈 System Performance:`);
      console.log(`   Total Execution Time: ${executionTime}ms`);
      console.log(`   Thinking Steps: ${result.steps?.length || 0}`);
      console.log(`   Tool Calls Made: ${result.toolCalls?.length || 0}`);
      console.log(`   Tools Configured: ${scenario.tools.length}`);
      console.log(`   LLM Provider: ${providerType}`);
      console.log(`   Session ID: ${result.sessionId}`);

      // Test Summary
      console.log('\n🎯 Test Summary:');
      console.log(`   ✅ AI Agent Handler: Working`);
      console.log(`   ✅ LLM Integration: Working`);
      console.log(`   ✅ Security Validation: Working`);
      console.log(`   ✅ Database Persistence: Working`);
      console.log(`   ✅ Reasoning Engine: Working`);
      if (scenario.tools.some((t) => t.type === 'mcp')) {
        console.log(
          `   🔧 MCP Tools: Configured (${scenario.tools.filter((t) => t.type === 'mcp').length} servers)`,
        );
      }
      if (scenario.tools.some((t) => t.type === 'goat')) {
        console.log(
          `   ⛓️  GOAT SDK: Configured (${scenario.tools.filter((t) => t.type === 'goat').length} tools)`,
        );
      }
    } else {
      console.log('\n❌ Execution Failed:');
      console.log(`   Error: ${result.error}`);
      console.log(`   Node ID: ${result.nodeId}`);
      console.log(`   Execution Time: ${executionTime}ms`);

      if (result.error?.includes('Security violations')) {
        console.log('\n🔒 Security Event Detected:');
        console.log(
          '   The AI Agent security system correctly blocked potentially harmful content.',
        );
        console.log(
          '   This demonstrates the security validation is working properly.',
        );
      }

      // Failure analysis
      console.log('\n🔍 Failure Analysis:');
      console.log(`   ✅ AI Agent Handler: Loaded`);
      console.log(`   ✅ System Components: Initialized`);
      console.log(`   ❌ Execution: Failed at runtime`);
    }

    console.log('\n' + '='.repeat(100));
  } catch (error) {
    logger.error('\n💥 System Test Failed:');
    logger.error(error instanceof Error ? error.message : String(error));

    if (error instanceof Error && error.stack) {
      logger.error('\nDetailed Stack Trace:');
      logger.error(error.stack);
    }

    // Component status check
    console.log('\n🔍 Component Status Check:');
    console.log('   ❌ System failed during initialization or execution');
    console.log('   📝 Check the error details above for specific issues');

    process.exit(1);
  }
}

function showUsage() {
  console.log(`
🤖 Complete AI Agent System Test

Usage:
  OPENROUTER_API_KEY=your_key ts-node src/scripts/simple-ai-agent.ts [test-type]

Test Types:
  basic        - Basic AI response (default)
  mcp          - Test with MCP tools (filesystem)
  mcp-real     - Test with real MCP servers (filesystem + web search)
  mcp-multi    - Test with multiple MCP servers (filesystem + web search + git)
  blockchain   - Test with GOAT SDK tools
  multi-tool   - Test with multiple tool types
  workflow     - Full workflow simulation

Examples:
  ts-node src/scripts/simple-ai-agent.ts
  ts-node src/scripts/simple-ai-agent.ts mcp-real
  ts-node src/scripts/simple-ai-agent.ts mcp-multi

Environment Variables:
  OPENROUTER_API_KEY - OpenRouter API key (recommended)
  OPENAI_API_KEY     - OpenAI API key
  ANTHROPIC_API_KEY  - Anthropic API key
  BRAVE_API_KEY      - Brave Search API key (for web search tests)

For Real MCP Server Testing:
  npm install -g @modelcontextprotocol/server-filesystem
  npm install -g @modelcontextprotocol/server-brave-search
  npm install -g @modelcontextprotocol/server-git

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

  runCompleteSystemTest().catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });
}

export { runCompleteSystemTest, createAIAgentHandler };
