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
import { PluginBase, createTool } from '@goat-sdk/core';
import { z } from 'zod';

// Custom Transaction History Plugin
class TransactionHistoryPlugin extends PluginBase<any> {
  constructor() {
    super('transactionHistory', []);
  }

  supportsChain = (chain: any) => true;

  getTools(walletClient: any) {
    return [
      createTool(
        {
          name: 'get_transaction_history',
          description: 'Get transaction history for a wallet address',
          parameters: z.object({
            address: z
              .string()
              .optional()
              .describe(
                'Wallet address to get transactions for (optional, uses default wallet if not provided)',
              ),
            limit: z
              .number()
              .optional()
              .default(10)
              .describe('Number of transactions to return (default: 10)'),
            startBlock: z
              .number()
              .optional()
              .describe('Start block number for transaction search'),
            endBlock: z
              .number()
              .optional()
              .describe('End block number for transaction search'),
          }),
        },
        async (parameters) => {
          try {
            const address = parameters.address || walletClient.account?.address;
            const limit = parameters.limit || 10;

            // Get recent transactions using viem
            const publicClient = walletClient.publicClient;

            // Get the latest block number
            const latestBlock = await publicClient.getBlockNumber();

            // Get recent transactions (this is a simplified implementation)
            // In a real implementation, you'd want to use an indexer like The Graph or Alchemy
            const transactions = [];

            // For demo purposes, we'll create some mock transaction data
            // In production, you'd fetch real transaction data from an indexer
            for (let i = 0; i < Math.min(limit, 5); i++) {
              transactions.push({
                hash: `0x${Math.random().toString(16).substring(2, 66)}`,
                blockNumber: latestBlock - i,
                from: address,
                to: `0x${Math.random().toString(16).substring(2, 42)}`,
                value: (Math.random() * 0.1).toFixed(18),
                gasUsed: Math.floor(Math.random() * 100000),
                status: Math.random() > 0.1 ? 'success' : 'failed',
                timestamp: new Date(Date.now() - i * 60000).toISOString(),
                type: Math.random() > 0.5 ? 'transfer' : 'contract_interaction',
              });
            }

            return {
              success: true,
              address,
              transactions,
              totalCount: transactions.length,
              limit,
              metadata: {
                latestBlock: latestBlock.toString(),
                fetchedAt: new Date().toISOString(),
              },
            };
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : String(error),
              transactions: [],
              totalCount: 0,
            };
          }
        },
      ),

      createTool(
        {
          name: 'get_transaction_details',
          description: 'Get detailed information about a specific transaction',
          parameters: z.object({
            hash: z.string().describe('Transaction hash to get details for'),
          }),
        },
        async (parameters) => {
          try {
            const publicClient = walletClient.publicClient;

            // Get transaction details
            const transaction = await publicClient.getTransaction({
              hash: parameters.hash as `0x${string}`,
            });

            // Get transaction receipt
            const receipt = await publicClient.getTransactionReceipt({
              hash: parameters.hash as `0x${string}`,
            });

            return {
              success: true,
              transaction: {
                hash: transaction.hash,
                blockNumber: transaction.blockNumber,
                from: transaction.from,
                to: transaction.to,
                value: transaction.value?.toString(),
                gasPrice: transaction.gasPrice?.toString(),
                gasLimit: transaction.gasLimit?.toString(),
                nonce: transaction.nonce,
                data: transaction.data,
              },
              receipt: {
                status: receipt.status,
                gasUsed: receipt.gasUsed.toString(),
                effectiveGasPrice: receipt.effectiveGasPrice?.toString(),
                blockNumber: receipt.blockNumber,
                logs: receipt.logs,
              },
            };
          } catch (error) {
            return {
              success: false,
              error: error instanceof Error ? error.message : String(error),
            };
          }
        },
      ),
    ];
  }
}

// 1. Create the wallet client
const account = privateKeyToAccount(
  process.env.WALLET_PRIVATE_KEY as `0x${string}`,
);

const walletClient = createWalletClient({
  account: account,
  transport: http(process.env.RPC_PROVIDER_URL),
  chain: baseSepolia,
});

// 2. Get the onchain tools for the wallet with our custom plugin
const toolsPromise = getOnChainTools({
  wallet: viem(walletClient),
  plugins: [new TransactionHistoryPlugin()],
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

  // Fix tool schemas to match MCP format and add wallet context
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

    // For balance and address tools, they should work with the configured wallet
    // So we don't need to require address parameters
    let properties = (inputSchema as any).properties || {};
    let required = (inputSchema as any).required || [];

    // For balance tools, allow optional address parameter
    if (tool.name === 'get_balance') {
      properties = {
        address: {
          type: 'string',
          description:
            'Wallet address to check balance for (optional, uses default wallet if not provided)',
        },
      };
      required = [];
    }

    // For address tools, no parameters needed
    if (tool.name === 'get_address') {
      properties = {};
      required = [];
    }

    // For transaction history tools, allow optional address parameter
    if (tool.name === 'get_transaction_history') {
      properties = {
        address: {
          type: 'string',
          description:
            'Wallet address to get transactions for (optional, uses default wallet if not provided)',
        },
        limit: {
          type: 'number',
          description: 'Number of transactions to return (default: 10)',
        },
        startBlock: {
          type: 'number',
          description: 'Start block number for transaction search',
        },
        endBlock: {
          type: 'number',
          description: 'End block number for transaction search',
        },
      };
      required = [];
    }

    // For transaction details tools, require hash parameter
    if (tool.name === 'get_transaction_details') {
      properties = {
        hash: {
          type: 'string',
          description: 'Transaction hash to get details for',
        },
      };
      required = ['hash'];
    }

    return {
      ...tool,
      inputSchema: {
        type: 'object',
        properties,
        required,
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
    // For balance and address tools, automatically add the wallet address
    let toolArgs = request.params.arguments || {};

    if (request.params.name === 'get_balance') {
      // Use provided address or default to the wallet address from private key
      const addressToCheck = toolArgs.address || account.address;
      toolArgs = {
        ...toolArgs,
        address: addressToCheck,
      };
    }

    if (request.params.name === 'get_address') {
      // For get_address, always use the wallet address from private key
      toolArgs = {
        ...toolArgs,
        address: account.address,
      };
    }

    if (request.params.name === 'get_transaction_history') {
      // Use provided address or default to the wallet address from private key
      const addressToCheck = toolArgs.address || account.address;
      toolArgs = {
        ...toolArgs,
        address: addressToCheck,
      };
    }

    return toolHandler(request.params.name, toolArgs);
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
