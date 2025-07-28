import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { http, createWalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

import { getOnChainTools } from '@goat-sdk/adapter-model-context-protocol';
import { viem } from '@goat-sdk/wallet-viem';

// 1. Create the wallet client
const account = privateKeyToAccount(
  process.env.WALLET_PRIVATE_KEY as `0x${string}`,
);

const walletClient = createWalletClient({
  account: account,
  transport: http(process.env.RPC_PROVIDER_URL),
  chain: baseSepolia,
});

// 2. Get the onchain tools for the wallet
const toolsPromise = getOnChainTools({
  wallet: viem(walletClient),
  plugins: [],
});

// 3. Create and configure the server
const server = new Server(
  {
    name: 'goat-evm',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const { listOfTools } = await toolsPromise;
  const tools = listOfTools();

  // Fix tool schemas to match MCP format
  const formattedTools = tools.map((tool) => {
    // Handle different inputSchema formats from GOAT SDK
    let inputSchema = tool.inputSchema;

    // If inputSchema is a string, convert it to proper object format
    if (typeof inputSchema === 'string') {
      inputSchema = {
        type: 'object',
        properties: {},
        description: inputSchema,
      };
    }

    // If inputSchema is missing or invalid, create a default one
    if (!inputSchema || typeof inputSchema !== 'object') {
      inputSchema = {
        type: 'object',
        properties: {},
        description: tool.description || 'No parameters required',
      };
    }

    return {
      ...tool,
      inputSchema: {
        type: 'object',
        properties: (inputSchema as any).properties || {},
        required: (inputSchema as any).required || [],
        description: (inputSchema as any).description || tool.description,
      },
    };
  });

  return {
    tools: formattedTools,
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { toolHandler } = await toolsPromise;
  try {
    return toolHandler(request.params.name, request.params.arguments);
  } catch (error) {
    throw new Error(`Tool ${request.params.name} failed: ${error}`);
  }
});

// 4. Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('GOAT MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});
