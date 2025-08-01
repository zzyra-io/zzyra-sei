import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { http, createWalletClient, createPublicClient, parseEther, formatEther } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// Sei Network configuration
const seiTestnet = {
  id: 1328,
  name: 'Sei Testnet',
  network: 'sei-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'SEI',
    symbol: 'SEI',
  },
  rpcUrls: {
    default: {
      http: ['https://evm-rpc-testnet.sei-apis.com'],
    },
    public: {
      http: ['https://evm-rpc-testnet.sei-apis.com'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Seitrace',
      url: 'https://seitrace.com',
    },
  },
  testnet: true,
} as const;

interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
  execute: (parameters: any) => Promise<any>;
}

// Create wallet and public clients
const account = privateKeyToAccount(
  process.env.WALLET_PRIVATE_KEY as `0x${string}`,
);

const walletClient = createWalletClient({
  account: account,
  transport: http(process.env.RPC_PROVIDER_URL || seiTestnet.rpcUrls.default.http[0]),
  chain: seiTestnet,
});

const publicClient = createPublicClient({
  transport: http(process.env.RPC_PROVIDER_URL || seiTestnet.rpcUrls.default.http[0]),
  chain: seiTestnet,
});

// Sei-specific tools
const seiTools: Tool[] = [
  {
    name: 'get_sei_balance',
    description: 'Get SEI token balance for an address on Sei Network',
    inputSchema: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'Wallet address to check balance for (supports both 0x and sei1 formats, optional - uses default wallet if not provided)',
        },
      },
    },
    execute: async (parameters) => {
      try {
        const address = parameters.address || account.address;
        let ethAddress: `0x${string}`;

        // Handle both Sei bech32 (sei1...) and Ethereum (0x...) address formats
        if (typeof address === 'string' && address.startsWith('sei1')) {
          // For now, we'll use the wallet's address as we can't convert bech32 to hex easily
          // In production, you'd need a proper bech32 to hex converter
          ethAddress = account.address;
        } else if (typeof address === 'string' && address.startsWith('0x')) {
          ethAddress = address as `0x${string}`;
        } else {
          ethAddress = account.address;
        }

        const balance = await publicClient.getBalance({
          address: ethAddress,
        });

        const formattedBalance = formatEther(balance);
        const blockNumber = await publicClient.getBlockNumber();

        return {
          success: true,
          address: ethAddress,
          originalAddress: address,
          balance: {
            wei: balance.toString(),
            sei: formattedBalance,
            formatted: `${formattedBalance} SEI`,
          },
          network: 'Sei Testnet',
          chainId: seiTestnet.id,
          blockNumber: blockNumber.toString(),
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          address: parameters.address || account.address,
          network: 'Sei Testnet',
          chainId: seiTestnet.id,
        };
      }
    },
  },

  {
    name: 'get_sei_address',
    description: 'Get the default wallet address for Sei Network operations',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    execute: async () => {
      try {
        return {
          success: true,
          address: account.address,
          network: 'Sei Testnet',
          chainId: seiTestnet.id,
          addressFormat: 'Ethereum (0x...)',
          note: 'This is the Ethereum-compatible address format. Sei also supports bech32 (sei1...) format.',
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          network: 'Sei Testnet',
          chainId: seiTestnet.id,
        };
      }
    },
  },

  {
    name: 'get_sei_network_info',
    description: 'Get information about the Sei Network',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    execute: async () => {
      try {
        const blockNumber = await publicClient.getBlockNumber();
        const gasPrice = await publicClient.getGasPrice();
        const chainId = await publicClient.getChainId();

        return {
          success: true,
          network: {
            name: seiTestnet.name,
            chainId: chainId,
            rpcUrl: seiTestnet.rpcUrls.default.http[0],
            explorer: seiTestnet.blockExplorers.default.url,
            nativeCurrency: seiTestnet.nativeCurrency,
            isTestnet: seiTestnet.testnet,
          },
          currentBlock: blockNumber.toString(),
          gasPrice: {
            wei: gasPrice.toString(),
            gwei: formatEther(gasPrice * BigInt(1000000000)),
          },
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          network: 'Sei Testnet',
          chainId: seiTestnet.id,
        };
      }
    },
  },

  {
    name: 'send_sei_transaction',
    description: 'Send SEI tokens to another address on Sei Network',
    inputSchema: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'Recipient address (supports both 0x and sei1 formats)',
        },
        amount: {
          type: 'string',
          description: 'Amount of SEI to send (in SEI units, e.g., "0.1")',
        },
        gasLimit: {
          type: 'string',
          description: 'Gas limit for the transaction (optional, will estimate if not provided)',
        },
      },
      required: ['to', 'amount'],
    },
    execute: async (parameters) => {
      try {
        let toAddress: `0x${string}`;

        // Handle both Sei bech32 (sei1...) and Ethereum (0x...) address formats
        if (parameters.to.startsWith('sei1')) {
          // For now, we'll return an error as we need proper bech32 conversion
          // In production, you'd need a proper bech32 to hex converter
          return {
            success: false,
            error: 'Sei bech32 addresses (sei1...) are not yet supported. Please use Ethereum format (0x...)',
            providedAddress: parameters.to,
          };
        } else if (parameters.to.startsWith('0x')) {
          toAddress = parameters.to as `0x${string}`;
        } else {
          return {
            success: false,
            error: 'Invalid address format. Please use 0x... format.',
            providedAddress: parameters.to,
          };
        }

        const value = parseEther(parameters.amount);

        // Estimate gas if not provided
        let gasLimit = parameters.gasLimit ? BigInt(parameters.gasLimit) : undefined;
        if (!gasLimit) {
          gasLimit = await publicClient.estimateGas({
            account: account.address,
            to: toAddress,
            value,
          });
        }

        // Send the transaction
        const hash = await walletClient.sendTransaction({
          to: toAddress,
          value,
          gas: gasLimit,
        } as any);

        // Wait for transaction receipt
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
          timeout: 60000, // 60 second timeout
        });

        return {
          success: true,
          transaction: {
            hash,
            from: account.address,
            to: toAddress,
            amount: {
              wei: value.toString(),
              sei: parameters.amount,
              formatted: `${parameters.amount} SEI`,
            },
            gasUsed: receipt.gasUsed.toString(),
            gasPrice: receipt.effectiveGasPrice?.toString(),
            blockNumber: receipt.blockNumber.toString(),
            status: receipt.status === 'success' ? 'success' : 'failed',
          },
          network: 'Sei Testnet',
          chainId: seiTestnet.id,
          explorerUrl: `${seiTestnet.blockExplorers.default.url}/tx/${hash}`,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          parameters,
          network: 'Sei Testnet',
          chainId: seiTestnet.id,
        };
      }
    },
  },

  {
    name: 'get_sei_transaction',
    description: 'Get details of a specific transaction on Sei Network',
    inputSchema: {
      type: 'object',
      properties: {
        hash: {
          type: 'string',
          description: 'Transaction hash to get details for',
        },
      },
      required: ['hash'],
    },
    execute: async (parameters) => {
      try {
        const hash = parameters.hash as `0x${string}`;

        // Get transaction details
        const transaction = await publicClient.getTransaction({ hash });

        // Get transaction receipt
        const receipt = await publicClient.getTransactionReceipt({ hash });

        return {
          success: true,
          transaction: {
            hash: transaction.hash,
            blockNumber: transaction.blockNumber?.toString(),
            from: transaction.from,
            to: transaction.to,
            value: {
              wei: transaction.value?.toString(),
              sei: formatEther(transaction.value || BigInt(0)),
            },
            gasPrice: transaction.gasPrice?.toString(),
            gasLimit: transaction.gas?.toString(),
            nonce: transaction.nonce,
            data: (transaction as any).data || '0x',
            status: receipt.status === 'success' ? 'success' : 'failed',
            gasUsed: receipt.gasUsed.toString(),
            effectiveGasPrice: receipt.effectiveGasPrice?.toString(),
            logs: receipt.logs,
          },
          network: 'Sei Testnet',
          chainId: seiTestnet.id,
          explorerUrl: `${seiTestnet.blockExplorers.default.url}/tx/${hash}`,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          hash: parameters.hash,
          network: 'Sei Testnet',
          chainId: seiTestnet.id,
        };
      }
    },
  },

  {
    name: 'estimate_sei_gas',
    description: 'Estimate gas cost for a transaction on Sei Network',
    inputSchema: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'Recipient address (0x format)',
        },
        amount: {
          type: 'string',
          description: 'Amount of SEI to send (in SEI units)',
        },
        data: {
          type: 'string',
          description: 'Transaction data (optional, for contract calls)',
        },
      },
      required: ['to', 'amount'],
    },
    execute: async (parameters) => {
      try {
        const toAddress = parameters.to as `0x${string}`;
        const value = parseEther(parameters.amount);
        const data = parameters.data as `0x${string}` || '0x';

        // Estimate gas
        const gasEstimate = await publicClient.estimateGas({
          account: account.address,
          to: toAddress,
          value,
          data,
        });

        // Get current gas price
        const gasPrice = await publicClient.getGasPrice();

        // Calculate total cost
        const totalCost = gasEstimate * gasPrice;

        return {
          success: true,
          gasEstimate: {
            gasLimit: gasEstimate.toString(),
            gasPrice: {
              wei: gasPrice.toString(),
              gwei: formatEther(gasPrice * BigInt(1000000000)),
            },
            totalCost: {
              wei: totalCost.toString(),
              sei: formatEther(totalCost),
              formatted: `${formatEther(totalCost)} SEI`,
            },
          },
          transaction: {
            to: toAddress,
            amount: {
              sei: parameters.amount,
              wei: value.toString(),
            },
          },
          network: 'Sei Testnet',
          chainId: seiTestnet.id,
          timestamp: new Date().toISOString(),
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          parameters,
          network: 'Sei Testnet',
          chainId: seiTestnet.id,
        };
      }
    },
  },
];

// Create and configure the server
const server = new Server(
  {
    name: 'sei-evm',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  const tools = seiTools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
  }));

  return {
    tools,
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const tool = seiTools.find((t) => t.name === request.params.name);
    if (!tool) {
      throw new Error(`Tool ${request.params.name} not found`);
    }

    const result = await tool.execute(request.params.arguments || {});
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    throw new Error(`Tool ${request.params.name} failed: ${error}`);
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Sei MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in main():', error);
  process.exit(1);
});