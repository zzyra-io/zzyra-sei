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
import { randomUUID } from 'crypto';
import * as dotenv from 'dotenv';
import { AIAgentHandler } from '../workers/handlers/AIAgentHandler';
import { CacheService } from '../workers/handlers/ai-agent/CacheService';

import { GOATManager } from '../workers/handlers/ai-agent/GOATManager';
import { LLMProviderManager } from '../workers/handlers/ai-agent/LLMProviderManager';
import { MCPServerManager } from '../workers/handlers/ai-agent/MCPServerManager';
import { MCPToolsManager } from '../workers/handlers/ai-agent/MCPToolsManager';
import { ReasoningEngine } from '../workers/handlers/ai-agent/ReasoningEngine';
import { SecurityValidator } from '../workers/handlers/ai-agent/SecurityValidator';
import { ToolAnalyticsService } from '../workers/handlers/ai-agent/ToolAnalyticsService';
import { GoatPluginManager } from '../workers/handlers/goat/GoatPluginManager';
dotenv.config();
console.log('Environment variables loaded:', {
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ? 'SET' : 'NOT SET',
  EVM_WALLET_PRIVATE_KEY: process.env.EVM_WALLET_PRIVATE_KEY
    ? 'SET'
    : 'NOT SET',
  RPC_PROVIDER_URL: process.env.RPC_PROVIDER_URL ? 'SET' : 'NOT SET',
  BRAVE_API_KEY: process.env.BRAVE_API_KEY ? 'SET' : 'NOT SET',
  DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'NOT SET',
  SEI_TESTNET_RPC: process.env.SEI_TESTNET_RPC ? 'SET' : 'NOT SET',
  SEI_TESTNET_NETWORK: process.env.SEI_TESTNET_NETWORK ? 'SET' : 'NOT SET',
  SEI_TESTNET_EXPLORER_URL: process.env.SEI_TESTNET_EXPLORER_URL
    ? 'SET'
    : 'NOT SET',
});

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
          'goat_access',
          'WALLET_ACCESS',
          'DATABASE_ACCESS',
          'FILE_ACCESS',
          'NETWORK_ACCESS',
          'AI_AGENT',
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
  const cacheService = new CacheService(configService);
  const llmProviderManager = new LLMProviderManager(
    configService,
    cacheService,
  );
  const toolAnalyticsService = new ToolAnalyticsService(
    databaseService,
    cacheService,
  );
  const mcpServerManager = new MCPServerManager(databaseService, cacheService);
  const securityValidator = new SecurityValidator(databaseService);
  const reasoningEngine = new ReasoningEngine(
    databaseService,
    toolAnalyticsService,
    cacheService,
  );

  const mcpToolsManager = new MCPToolsManager(
    databaseService,
    mcpServerManager, // Use the same mcpServerManager instance
  );
  const goatManager = new GOATManager(configService);
  const goatPluginManager = new GoatPluginManager();

  // Enhanced reasoning engine doesn't need initialization

  // Initialize GOAT plugin manager
  await goatPluginManager.initialize();

  // Create main handler
  return {
    handler: new AIAgentHandler(
      databaseService,
      executionLogger,
      llmProviderManager,
      mcpServerManager,
      securityValidator,
      reasoningEngine,
      goatPluginManager,
    ),
    mcpToolsManager,
    goatManager,
    goatPluginManager,
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
  'goat-test': {
    name: 'GOAT Blockchain Test with brave search',
    prompt:
      'Check my wallet balance for 0x30418a5C1C1Fd8297414F596A6C7B3bb8F7B4b7d across all chains and give me the total balance with 5 recent transactions',
    tools: [
      {
        id: 'goat',
        name: 'GOAT Blockchain',
        type: 'mcp',
        config: {
          EVM_WALLET_PRIVATE_KEY: process.env.EVM_WALLET_PRIVATE_KEY,
          RPC_PROVIDER_URL:
            process.env.RPC_PROVIDER_URL || 'https://sepolia.base.org',
        },
      },
      // {
      //   id: 'brave-search',
      //   name: 'Web Search',
      //   type: 'mcp',
      //   config: {
      //     apiKey: process.env.BRAVE_API_KEY || 'demo-key',
      //   },
      // },
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
  'db-summary': {
    name: 'Database Summary',
    prompt: 'Summarize the database schema for the project.',
    tools: [
      {
        id: 'postgres',
        name: 'PostgreSQL',
        type: 'mcp',
        config: {
          databaseUrl:
            process.env.DATABASE_URL || 'postgresql://localhost/zzyra',
        },
      },
    ],
  },
  'complex-defi': {
    name: 'Complex DeFi Operations',
    prompt:
      'Get token balances and latest transactions for wallet 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045 (Vitalik Buterin). Also get current ETH price from web search.',
    tools: [
      {
        id: 'blockScout',
        name: 'BlockScout Blockchain Data',
        type: 'mcp',
        config: {
          // BlockScout doesn't need specific config, uses default endpoints
        },
      },
      {
        id: 'brave-search',
        name: 'Web Search for ETH Price',
        type: 'mcp',
        config: {
          apiKey: process.env.BRAVE_API_KEY || 'demo-key',
        },
      },
    ],
  },
  'sei-basic': {
    name: 'SEI Basic Operations',
    prompt:
      'Check the Sei network information, get my wallet address and SEI balance, and show me the latest block information and give me the output in html format.',
    tools: [
      {
        id: 'sei',
        name: 'SEI Network Operations',
        type: 'mcp',
        config: {
          WALLET_MODE: 'private-key',
          PRIVATE_KEY: process.env.EVM_WALLET_PRIVATE_KEY,
          SEI_NETWORK: 'testnet',
        },
      },
    ],
  },
  'sei-token-management': {
    name: 'SEI Token Management',
    prompt:
      'Check my USDC token balance on SEI network using contract address 0x3894085ef7ff0f0aedf52e2a2704928d1ec074f1, get the latest block, and show network information.',
    tools: [
      {
        id: 'sei',
        name: 'SEI Network Operations',
        type: 'mcp',
        config: {
          WALLET_MODE: 'private-key',
          PRIVATE_KEY: process.env.EVM_WALLET_PRIVATE_KEY,
          SEI_NETWORK: 'mainnet',
        },
      },
    ],
  },
  'sei-multi-ops': {
    name: 'SEI Multiple Operations',
    prompt:
      'Perform comprehensive SEI analysis: 1) Get my wallet address and native SEI balance, 2) Get chain information for SEI network, 3) Get the latest block details, 4) Check supported networks. Provide a detailed summary.',
    tools: [
      {
        id: 'sei',
        name: 'SEI Network Operations',
        type: 'mcp',
        config: {
          WALLET_MODE: 'private-key',
          PRIVATE_KEY: process.env.EVM_WALLET_PRIVATE_KEY,
          SEI_NETWORK: 'testnet',
        },
      },
    ],
  },
  'sei-defi-analysis': {
    name: 'SEI DeFi Analysis with Web Search',
    prompt:
      'Analyze SEI DeFi ecosystem: 1) Get my SEI balance and wallet address, 2) Get chain information, 3) Search online for current SEI token price and market cap, 4) Provide investment insights.',
    tools: [
      {
        id: 'sei',
        name: 'SEI Network Operations',
        type: 'mcp',
        config: {
          WALLET_MODE: 'private-key',
          PRIVATE_KEY: process.env.EVM_WALLET_PRIVATE_KEY,
          SEI_NETWORK: 'mainnet',
        },
      },
      {
        id: 'brave-search',
        name: 'Web Search for SEI Price',
        type: 'mcp',
        config: {
          apiKey: process.env.BRAVE_API_KEY || 'demo-key',
        },
      },
    ],
  },
  'sei-read-only': {
    name: 'SEI Read-Only Mode',
    prompt:
      'Get Sei network information, check the latest block, show supported networks, and provide network statistics. This should work in read-only mode without wallet functionality.',
    tools: [
      {
        id: 'sei',
        name: 'SEI Network Operations',
        type: 'mcp',
        config: {
          WALLET_MODE: 'disabled',
          PRIVATE_KEY: 'not_required_for_read_only',
          SEI_NETWORK: 'testnet',
        },
      },
    ],
  },
  'sei-atlantic-testnet': {
    name: 'SEI Atlantic-2 Testnet Operations',
    prompt:
      'Test Sei Atlantic-2 testnet functionality: get network info, wallet address, SEI balance, latest block, and verify we are connected to the correct testnet with custom QuickNode RPC.',
    tools: [
      {
        id: 'sei',
        name: 'SEI Atlantic-2 Testnet',
        type: 'mcp',
        config: {
          WALLET_MODE: 'private-key',
          PRIVATE_KEY: process.env.EVM_WALLET_PRIVATE_KEY,
          SEI_NETWORK: 'testnet',
          SEI_TESTNET_RPC:
            'https://yolo-sparkling-sea.sei-atlantic.quiknode.pro/aa0487f22e4ebd479a97f9736eb3c0fb8a2b8e32',
          SEI_TESTNET_NETWORK: 'atlantic-2',
          SEI_TESTNET_EXPLORER_URL: 'https://testnet.seistream.app',
          SEI_TESTNET_NAME: 'Sei Atlantic-2 Testnet',
        },
      },
    ],
  },
  'sei-comprehensive': {
    name: 'SEI Comprehensive Test',
    prompt:
      'Execute comprehensive SEI blockchain operations: 1) Get wallet address from private key, 2) Check native SEI balance, 3) Get USDC token balance (0x3894085ef7ff0f0aedf52e2a2704928d1ec074f1), 4) Verify if the USDC contract address is valid, 5) Get current chain info and latest block, 6) Search for SEI network status online. Provide detailed analysis.',
    tools: [
      {
        id: 'sei',
        name: 'SEI Atlantic-2 Testnet',
        type: 'mcp',
        config: {
          WALLET_MODE: 'private-key',
          PRIVATE_KEY: process.env.EVM_WALLET_PRIVATE_KEY,
          SEI_NETWORK: 'testnet',
          SEI_TESTNET_RPC:
            'https://yolo-sparkling-sea.sei-atlantic.quiknode.pro/aa0487f22e4ebd479a97f9736eb3c0fb8a2b8e32',
          SEI_TESTNET_NETWORK: 'atlantic-2',
          SEI_TESTNET_EXPLORER_URL: 'https://testnet.seistream.app',
          SEI_TESTNET_NAME: 'Sei Atlantic-2 Testnet',
        },
      },
      {
        id: 'brave-search',
        name: 'Web Search for SEI Status',
        type: 'mcp',
        config: {
          apiKey: process.env.BRAVE_API_KEY || 'demo-key',
        },
      },
    ],
  },
  'sei-real-world': {
    name: 'SEI Real-World DeFi Scenario',
    prompt: `You are a DeFi analyst helping a user with their SEI portfolio. Perform a comprehensive analysis:

1. **Wallet Analysis**: Get my wallet address and check my native SEI balance
2. **Token Portfolio**: Check my USDC balance (contract: 0x3894085ef7ff0f0aedf52e2a2704928d1ec074f1) and any other ERC20 tokens
3. **Network Health**: Get current chain information, latest block details, and network statistics
4. **Market Research**: Search for current SEI token price, market cap, and recent news
5. **DeFi Opportunities**: Search for active DeFi protocols on SEI network and yield farming opportunities
6. **Transaction History**: Get my recent transactions and analyze spending patterns
7. **Risk Assessment**: Based on current market conditions and my portfolio, provide investment recommendations

Format the response as a professional DeFi portfolio report with:
- Executive Summary
- Portfolio Overview
- Market Analysis
- Risk Assessment
- Recommendations

Include specific data points, current prices, and actionable insights.`,
    tools: [
      {
        id: 'sei',
        name: 'SEI Network Operations',
        type: 'mcp',
        config: {
          WALLET_MODE: 'private-key',
          PRIVATE_KEY: process.env.EVM_WALLET_PRIVATE_KEY,
          SEI_NETWORK: 'testnet',
          SEI_TESTNET_RPC:
            'https://yolo-sparkling-sea.sei-atlantic.quiknode.pro/aa0487f22e4ebd479a97f9736eb3c0fb8a2b8e32',
          SEI_TESTNET_NETWORK: 'atlantic-2',
          SEI_TESTNET_EXPLORER_URL: 'https://testnet.seistream.app',
          SEI_TESTNET_NAME: 'Sei Atlantic-2 Testnet',
        },
      },
      {
        id: 'brave-search',
        name: 'Market Research & News',
        type: 'mcp',
        config: {
          apiKey: process.env.BRAVE_API_KEY || 'demo-key',
        },
      },
    ],
  },
  'sei-all-tools': {
    name: 'SEI All Tools Demonstration',
    prompt: `Demonstrate all available SEI blockchain tools and capabilities. Perform the following operations:

1. **Network Information**: Get chain information and supported networks
2. **Wallet Operations**: Get my wallet address and native SEI balance
3. **Token Analysis**: Check my USDC token balance and verify the contract address
4. **Blockchain Data**: Get the latest block details and a specific block by number
5. **Transaction Analysis**: Get recent transaction information and receipts
6. **Gas Estimation**: Estimate gas costs for a simple SEI transfer
7. **Contract Interaction**: Read contract data and verify contract addresses
8. **Portfolio Summary**: Provide a comprehensive overview of my SEI holdings

For each operation, explain what tool was used and what the results mean. Format the response as a technical demonstration report with:
- Tool Usage Summary
- Data Analysis
- Technical Insights
- Recommendations for Further Analysis

Include specific blockchain data, transaction hashes, and technical details.`,
    tools: [
      {
        id: 'sei',
        name: 'SEI Network Operations',
        type: 'mcp',
        config: {
          WALLET_MODE: 'private-key',
          PRIVATE_KEY: process.env.EVM_WALLET_PRIVATE_KEY,
          SEI_NETWORK: 'testnet',
          SEI_TESTNET_RPC:
            'https://yolo-sparkling-sea.sei-atlantic.quiknode.pro/aa0487f22e4ebd479a97f9736eb3c0fb8a2b8e32',
          SEI_TESTNET_NETWORK: 'atlantic-2',
          SEI_TESTNET_EXPLORER_URL: 'https://testnet.seistream.app',
          SEI_TESTNET_NAME: 'Sei Atlantic-2 Testnet',
        },
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

  // Check for required environment variables for specific test types
  if (testType.startsWith('sei-') && !process.env.EVM_WALLET_PRIVATE_KEY) {
    logger.error(
      '❌ SEI blockchain tests require EVM_WALLET_PRIVATE_KEY environment variable',
    );
    logger.error('   Please set EVM_WALLET_PRIVATE_KEY=your_private_key');
    process.exit(1);
  }

  try {
    // Create AI Agent system components
    const aiSystem = await createAIAgentHandler();

    // Test MCP Tools Manager if MCP tools are requested
    if (scenario.tools.some((t) => t.type === 'mcp')) {
      for (const tool of scenario.tools.filter((t) => t.type === 'mcp')) {
        try {
          let config = tool.config;
          if (tool.id === 'filesystem') {
            config = {
              ...tool.config,
              allowedDirectories: process.cwd(),
              allowWrite: false,
            };
          }

          await aiSystem.mcpToolsManager.connectAndDiscoverTools(
            tool.id,
            config,
            'demo-user',
          );
        } catch (error) {
          // Silently continue if MCP server not available
        }
      }
    }

    // Test GOAT Manager if blockchain tools are requested
    if (scenario.tools.some((t) => t.type === 'goat')) {
      await aiSystem.goatManager.getAvailableTools();
    }

    // Test LLM Provider
    const providerType = process.env.OPENROUTER_API_KEY
      ? 'openrouter'
      : process.env.OPENAI_API_KEY
        ? 'openai'
        : 'anthropic';

    try {
      await aiSystem.llmProviderManager.getProvider(providerType, {
        type: providerType,
        model: 'test-model',
      });
    } catch (error) {
      // Continue if LLM provider test fails
    }

    // Create comprehensive AI Agent node configuration
    const aiAgentNode = {
      id: 'system-test-agent',
      type: 'AI_AGENT',
      data: {
        provider: {
          type: providerType,
          model: process.env.OPENROUTER_API_KEY
            ? 'openai/gpt-4o-mini'
            : process.env.OPENAI_API_KEY
              ? 'gpt-4'
              : 'claude-3-5-sonnet-20241022',
          temperature: 0.7,
          maxTokens: 2000,
        },
        agent: {
          name: `${scenario.name} Agent`,
          userPrompt: scenario.prompt,
          maxSteps: 10,
          thinkingMode: 'deliberate',
        },
        selectedTools: scenario.tools,
        execution: {
          mode: 'autonomous',
          timeout: 120000,
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
    const result = await aiSystem.handler.execute(
      aiAgentNode,
      executionContext,
    );

    // Display only the AI response
    if (result.success) {
      console.log('\n🤖 AI AGENT RESPONSE:');
      console.log('='.repeat(80));
      console.log(result.result);
      console.log('='.repeat(80));

      if (result.toolCalls && result.toolCalls.length > 0) {
        console.log('\n🔧 TOOLS USED:');
        result.toolCalls.forEach((call: any, index: number) => {
          console.log(`${index + 1}. ${call.name || 'Unknown Tool'}`);
        });
      }
    } else {
      console.log('\n❌ EXECUTION FAILED:');
      console.log(result.error);
    }
  } catch (error) {
    console.log('\n💥 SYSTEM ERROR:');
    console.log(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

function showUsage() {
  console.log(`
🤖 Complete AI Agent System Test

Usage:
  OPENROUTER_API_KEY=your_key ts-node src/scripts/simple-ai-agent.ts [test-type]

Test Types:
  basic                - Basic AI response (default)
  mcp                  - Test with MCP tools (filesystem)
  mcp-real             - Test with real MCP servers (web search)
  mcp-multi            - Test with multiple MCP servers (web search)
  goat-test            - Test with GOAT blockchain operations
  blockchain           - Test with GOAT SDK tools
  multi-tool           - Test with multiple tool types
  workflow             - Full workflow simulation
  sei-basic            - SEI basic operations (address, balance, block info)
  sei-token-management - SEI token operations (USDC balance, token info)
  sei-multi-ops        - SEI multiple operations (comprehensive analysis)
  sei-defi-analysis    - SEI DeFi analysis with web search
  sei-read-only        - SEI read-only mode (no wallet required)
  sei-atlantic-testnet - SEI Atlantic-2 testnet with custom QuickNode RPC
  sei-comprehensive    - SEI comprehensive test (all operations)
  sei-real-world       - SEI real-world DeFi portfolio analysis
  sei-all-tools        - SEI all tools demonstration (technical showcase)

Examples:
  ts-node src/scripts/simple-ai-agent.ts
  ts-node src/scripts/simple-ai-agent.ts mcp-real
  ts-node src/scripts/simple-ai-agent.ts goat-test
  ts-node src/scripts/simple-ai-agent.ts sei-basic
  ts-node src/scripts/simple-ai-agent.ts sei-comprehensive
  ts-node src/scripts/simple-ai-agent.ts sei-real-world
  ts-node src/scripts/simple-ai-agent.ts sei-all-tools

Environment Variables:
  OPENROUTER_API_KEY - OpenRouter API key (recommended)
  OPENAI_API_KEY     - OpenAI API key
  ANTHROPIC_API_KEY  - Anthropic API key
  BRAVE_API_KEY      - Brave Search API key (for web search tests)
  EVM_WALLET_PRIVATE_KEY - For GOAT blockchain operations
  RPC_PROVIDER_URL   - For blockchain RPC connection

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

  runCompleteSystemTest()
    .then(() => {
      console.log('Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Script failed:', error);
      process.exit(1);
    });
}

export { createAIAgentHandler, runCompleteSystemTest };
